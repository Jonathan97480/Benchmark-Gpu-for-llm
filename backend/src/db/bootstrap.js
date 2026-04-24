const bcrypt = require('bcrypt');
const db = require('../../config/database');
const { createTables, ensureGpuPriceHistoryEntry } = require('./migrations');
const { analyticalProfilesByModelName, gpuData, llmModels, benchmarkResults } = require('./baseData');

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin1234';

function hasExistingDomainData() {
  const gpuCount = db.prepare('SELECT COUNT(*) AS count FROM gpu_benchmarks').get().count;
  const modelCount = db.prepare('SELECT COUNT(*) AS count FROM llm_models').get().count;
  const benchmarkCount = db.prepare('SELECT COUNT(*) AS count FROM benchmark_results').get().count;

  return gpuCount > 0 || modelCount > 0 || benchmarkCount > 0;
}

const upsertDefaultAdmin = () => {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(DEFAULT_ADMIN_USERNAME);

  if (existingAdmin) {
    return false;
  }

  const passwordHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 12);
  db.prepare(`
    INSERT INTO users (username, password_hash)
    VALUES (?, ?)
  `).run(DEFAULT_ADMIN_USERNAME, passwordHash);

  return true;
};

const bootstrapDatabase = ({ reset = false } = {}) => {
  console.log(`Bootstrapping database from Data.md dataset${reset ? ' with reset' : ''}...`);
  createTables();

  if (!reset && hasExistingDomainData()) {
    const adminCreated = upsertDefaultAdmin();
    console.log('Existing production data detected, default dataset seeding skipped');
    console.log(adminCreated ? `Default admin created: ${DEFAULT_ADMIN_USERNAME}` : `Default admin preserved: ${DEFAULT_ADMIN_USERNAME}`);
    console.log('Bootstrap completed without overwriting existing data');
    return;
  }

  const runBootstrap = db.transaction(() => {
    if (reset) {
      db.prepare('DELETE FROM benchmark_results').run();
      db.prepare('DELETE FROM llm_models').run();
      db.prepare('DELETE FROM gpu_benchmarks').run();
    }

    const insertGpu = db.prepare(`
      INSERT INTO gpu_benchmarks (
        name,
        vendor,
        architecture,
        vram,
        bandwidth,
        price,
        price_value,
        price_new_value,
        price_used_value,
        tier,
        score,
        tokens_8b,
        tokens_32b,
        tokens_70b
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const gpu of gpuData) {
      if (!reset) {
        const existingGpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get(gpu.name);

        if (existingGpu) {
          continue;
        }
      }

      insertGpu.run(
        gpu.name,
        gpu.vendor,
        gpu.architecture,
        gpu.vram,
        gpu.bandwidth,
        gpu.price,
        gpu.priceValue,
        gpu.priceNewValue ?? gpu.priceValue ?? 0,
        gpu.priceUsedValue ?? 0,
        gpu.tier,
        gpu.score,
        gpu.tokens8b,
        gpu.tokens32b,
        gpu.tokens70b
      );

      const storedGpu = db.prepare('SELECT id, price_new_value, price_used_value FROM gpu_benchmarks WHERE name = ?').get(gpu.name);
      ensureGpuPriceHistoryEntry(
        storedGpu.id,
        storedGpu.price_new_value ?? 0,
        storedGpu.price_used_value ?? 0
      );
    }

    const insertModel = db.prepare(`
      INSERT INTO llm_models (
        name,
        params_billions,
        total_params_billions,
        max_context_size,
        analytical_kv_cache_multiplier,
        analytical_runtime_memory_multiplier,
        analytical_runtime_memory_minimum,
        analytical_context_penalty_multiplier,
        analytical_context_penalty_floor,
        analytical_offload_penalty_multiplier,
        analytical_throughput_multiplier,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const model of llmModels) {
      const profile = analyticalProfilesByModelName[model.name] || {};

      if (reset) {
        insertModel.run(
          model.name,
          model.params,
          model.totalParams ?? null,
          model.maxContextSize ?? null,
          profile.analyticalKvCacheMultiplier ?? null,
          profile.analyticalRuntimeMemoryMultiplier ?? null,
          profile.analyticalRuntimeMemoryMinimum ?? null,
          profile.analyticalContextPenaltyMultiplier ?? null,
          profile.analyticalContextPenaltyFloor ?? null,
          profile.analyticalOffloadPenaltyMultiplier ?? null,
          profile.analyticalThroughputMultiplier ?? null,
          model.description
        );
        continue;
      }

      db.prepare(`
        INSERT OR IGNORE INTO llm_models (
          name,
          params_billions,
          total_params_billions,
          max_context_size,
          analytical_kv_cache_multiplier,
          analytical_runtime_memory_multiplier,
          analytical_runtime_memory_minimum,
          analytical_context_penalty_multiplier,
          analytical_context_penalty_floor,
          analytical_offload_penalty_multiplier,
          analytical_throughput_multiplier,
          description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        model.name,
        model.params,
        model.totalParams ?? null,
        model.maxContextSize ?? null,
        profile.analyticalKvCacheMultiplier ?? null,
        profile.analyticalRuntimeMemoryMultiplier ?? null,
        profile.analyticalRuntimeMemoryMinimum ?? null,
        profile.analyticalContextPenaltyMultiplier ?? null,
        profile.analyticalContextPenaltyFloor ?? null,
        profile.analyticalOffloadPenaltyMultiplier ?? null,
        profile.analyticalThroughputMultiplier ?? null,
        model.description
      );
    }

    const gpuMap = new Map(
      db.prepare('SELECT id, name FROM gpu_benchmarks').all().map((gpu) => [gpu.name, gpu.id])
    );
    const modelMap = new Map(
      db.prepare('SELECT id, name FROM llm_models').all().map((model) => [model.name, model.id])
    );

    const insertBenchmark = db.prepare(`
      INSERT INTO benchmark_results (
        gpu_id,
        gpu_count,
        llm_model_id,
        tokens_per_second,
        context_size,
        precision,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const result of benchmarkResults) {
      const gpuId = gpuMap.get(result.gpuName);
      const modelId = modelMap.get(result.modelName);

      if (!gpuId || !modelId) {
        throw new Error(`Missing reference for benchmark seed: ${result.gpuName} / ${result.modelName}`);
      }

      if (!reset) {
        const existingBenchmark = db.prepare(`
          SELECT id
          FROM benchmark_results
          WHERE gpu_id = ?
            AND gpu_count = ?
            AND llm_model_id = ?
            AND COALESCE(tokens_per_second, 0) = COALESCE(?, 0)
            AND COALESCE(context_size, -1) = COALESCE(?, -1)
            AND COALESCE(precision, '') = COALESCE(?, '')
            AND COALESCE(notes, '') = COALESCE(?, '')
        `).get(
          gpuId,
          result.gpuCount ?? 1,
          modelId,
          result.tokensPerSecond,
          result.contextSize,
          result.precision,
          result.notes
        );

        if (existingBenchmark) {
          continue;
        }
      }

      insertBenchmark.run(
        gpuId,
        result.gpuCount ?? 1,
        modelId,
        result.tokensPerSecond,
        result.contextSize,
        result.precision,
        result.notes
      );
    }

    return upsertDefaultAdmin();
  });

  const adminCreated = runBootstrap();

  console.log(`${gpuData.length} GPU rows inserted`);
  console.log(`${llmModels.length} model rows inserted`);
  console.log(`${benchmarkResults.length} benchmark result rows inserted`);
  console.log(adminCreated ? `Default admin created: ${DEFAULT_ADMIN_USERNAME}` : `Default admin preserved: ${DEFAULT_ADMIN_USERNAME}`);
  console.log('Bootstrap completed');
};

if (require.main === module) {
  const reset = process.argv.includes('--reset') || process.env.DB_RESET === '1';
  bootstrapDatabase({ reset });
}

module.exports = {
  bootstrapDatabase
};
