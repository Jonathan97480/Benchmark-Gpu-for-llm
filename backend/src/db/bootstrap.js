const bcrypt = require('bcrypt');
const db = require('../../config/database');
const { createTables } = require('./migrations');
const { gpuData, llmModels, benchmarkResults } = require('./baseData');

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin1234';

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

const bootstrapDatabase = () => {
  console.log('Bootstrapping database from Data.md dataset...');
  createTables();

  const runBootstrap = db.transaction(() => {
    db.prepare('DELETE FROM benchmark_results').run();
    db.prepare('DELETE FROM llm_models').run();
    db.prepare('DELETE FROM gpu_benchmarks').run();

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
    }

    const insertModel = db.prepare(`
      INSERT INTO llm_models (name, params_billions, description)
      VALUES (?, ?, ?)
    `);

    for (const model of llmModels) {
      insertModel.run(model.name, model.params, model.description);
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
        llm_model_id,
        tokens_per_second,
        context_size,
        precision,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const result of benchmarkResults) {
      const gpuId = gpuMap.get(result.gpuName);
      const modelId = modelMap.get(result.modelName);

      if (!gpuId || !modelId) {
        throw new Error(`Missing reference for benchmark seed: ${result.gpuName} / ${result.modelName}`);
      }

      insertBenchmark.run(
        gpuId,
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
  bootstrapDatabase();
}

module.exports = {
  bootstrapDatabase
};
