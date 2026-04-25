const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcrypt');

function clearModule(modulePath) {
  const resolvedPath = require.resolve(modulePath);
  delete require.cache[resolvedPath];
}

function createTempDatabasePath() {
  return path.join(os.tmpdir(), `gpu-benchmark-test-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
}

function loadFreshBackend(dbPath) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.DATABASE_PATH = dbPath;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-with-32-characters-minimum';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';

  clearModule('../../config/database');
  clearModule('../../src/db/migrations');
  clearModule('../../src/utils/password.utils');
  clearModule('../../src/utils/jwt.utils');
  clearModule('../../src/controllers/auth.controller');
  clearModule('../../src/controllers/apiKeys.controller');
  clearModule('../../src/controllers/gpu.controller');
  clearModule('../../src/controllers/models.controller');
  clearModule('../../src/controllers/benchmark.controller');
  clearModule('../../src/middleware/auth.middleware');
  clearModule('../../src/routes/auth.routes');
  clearModule('../../src/routes/gpu.routes');
  clearModule('../../src/routes/models.routes');
  clearModule('../../src/routes/insights.routes');
  clearModule('../../server');

  const db = require('../../config/database');
  const { createTables } = require('../../src/db/migrations');
  createTables();

  const passwordHash = bcrypt.hashSync('Admin1234', 12);
  db.prepare(`
    INSERT INTO users (username, password_hash)
    VALUES (?, ?)
  `).run('admin', passwordHash);

  const gpuResult = db.prepare(`
    INSERT INTO gpu_benchmarks (
      name,
      vendor,
      architecture,
      vram,
      bandwidth,
      price_value,
      price_new_value,
      price_used_value,
      tier,
      score,
      tokens_8b,
      tokens_32b,
      tokens_70b
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('RTX 5090', 'NVIDIA', 'Blackwell', 32, 1792, 0, 0, 0, 'prosumer', 98, 213, 71, 0);

  const modelResult = db.prepare(`
    INSERT INTO llm_models (
      name,
      params_billions,
      total_params_billions,
      analytical_kv_cache_multiplier,
      analytical_runtime_memory_multiplier,
      analytical_runtime_memory_minimum,
      analytical_context_penalty_multiplier,
      analytical_context_penalty_floor,
      analytical_offload_penalty_multiplier,
      analytical_throughput_multiplier,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('DeepSeek R1 32B', 32, 32, null, null, null, null, null, null, null, 'Modele de test');

  db.prepare(`
    INSERT INTO benchmark_results (
      gpu_id,
      llm_model_id,
      tokens_per_second,
      context_size,
      precision,
      inference_backend,
      measurement_type,
      vram_used_gb,
      ram_used_gb,
      kv_cache_precision,
      batch_size,
      concurrency,
      gpu_power_limit_watts,
      gpu_core_clock_mhz,
      gpu_memory_clock_mhz,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    gpuResult.lastInsertRowid,
    modelResult.lastInsertRowid,
    71,
    null,
    null,
    'vLLM',
    'decode',
    22.5,
    18,
    'FP8',
    1,
    1,
    450,
    2500,
    1300,
    'Seed test benchmark'
  );

  const { app } = require('../../server');

  return { app, db };
}

function disposeTestDatabase(db, dbPath) {
  if (db && db.open) {
    db.close();
  }

  if (dbPath && fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }

  if (dbPath && fs.existsSync(`${dbPath}-wal`)) {
    fs.rmSync(`${dbPath}-wal`, { force: true });
  }

  if (dbPath && fs.existsSync(`${dbPath}-shm`)) {
    fs.rmSync(`${dbPath}-shm`, { force: true });
  }
}

module.exports = {
  createTempDatabasePath,
  disposeTestDatabase,
  loadFreshBackend,
};
