const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  createTempDatabasePath,
  disposeTestDatabase,
  loadFreshBackend,
} = require('./helpers/test-app');

async function loginAsAdmin(app) {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      username: 'admin',
      password: 'Admin1234',
    })
    .expect(200);

  return response.body.access_token;
}

function getModelColumns(db) {
  return db.prepare('PRAGMA table_info(llm_models)').all().map((column) => column.name);
}

function clearBackendDbModules() {
  for (const modulePath of [
    '../config/database',
    '../src/db/migrations',
    '../src/db/bootstrap',
  ]) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
  }
}

test('la table llm_models contient les nouvelles colonnes analytiques', async (t) => {
  const dbPath = createTempDatabasePath();
  const { db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const columns = getModelColumns(db);

  assert.deepEqual(
    [
      'analytical_kv_cache_multiplier',
      'analytical_runtime_memory_multiplier',
      'analytical_runtime_memory_minimum',
      'analytical_context_penalty_multiplier',
      'analytical_context_penalty_floor',
      'analytical_offload_penalty_multiplier',
      'analytical_throughput_multiplier',
    ].every((column) => columns.includes(column)),
    true
  );
});

test('GET /api/v1/models expose les champs analytiques du modèle', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const response = await request(app)
    .get('/api/v1/models')
    .expect(200);

  assert.equal(response.body.total, 1);
  assert.equal(response.body.models[0].name, 'DeepSeek R1 32B');
  assert.ok('analytical_throughput_multiplier' in response.body.models[0]);
  assert.ok('analytical_context_penalty_floor' in response.body.models[0]);
});

test('POST /api/v1/models persiste les nouveaux coefficients analytiques', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);

  const payload = {
    name: 'Llama 3.1 8B',
    params_billions: 8,
    total_params_billions: 8,
    max_context_size: 131072,
    analytical_kv_cache_multiplier: 1.18,
    analytical_runtime_memory_multiplier: 0.92,
    analytical_runtime_memory_minimum: 1.4,
    analytical_context_penalty_multiplier: 1.11,
    analytical_context_penalty_floor: 0.76,
    analytical_offload_penalty_multiplier: 1.33,
    analytical_throughput_multiplier: 1.52,
    description: 'Profil calibré',
  };

  const response = await request(app)
    .post('/api/v1/models')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(201);

  assert.equal(response.body.model.name, payload.name);
  assert.equal(response.body.model.analytical_kv_cache_multiplier, payload.analytical_kv_cache_multiplier);
  assert.equal(response.body.model.analytical_runtime_memory_multiplier, payload.analytical_runtime_memory_multiplier);
  assert.equal(response.body.model.analytical_runtime_memory_minimum, payload.analytical_runtime_memory_minimum);
  assert.equal(response.body.model.analytical_context_penalty_multiplier, payload.analytical_context_penalty_multiplier);
  assert.equal(response.body.model.analytical_context_penalty_floor, payload.analytical_context_penalty_floor);
  assert.equal(response.body.model.analytical_offload_penalty_multiplier, payload.analytical_offload_penalty_multiplier);
  assert.equal(response.body.model.analytical_throughput_multiplier, payload.analytical_throughput_multiplier);

  const storedModel = db.prepare('SELECT * FROM llm_models WHERE name = ?').get(payload.name);
  assert.equal(storedModel.max_context_size, payload.max_context_size);
  assert.equal(storedModel.analytical_throughput_multiplier, payload.analytical_throughput_multiplier);
});

test('POST /api/v1/models refuse un coefficient analytique invalide', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);

  const response = await request(app)
    .post('/api/v1/models')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Bad Profile',
      params_billions: 7,
      analytical_context_penalty_floor: 1.4,
    })
    .expect(400);

  assert.match(response.body.error, /must be less than or equal to 1/i);
});

test('PUT /api/v1/models/:id met à jour les champs analytiques', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const model = db.prepare('SELECT * FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  const payload = {
    name: 'DeepSeek R1 32B',
    params_billions: 32,
    total_params_billions: 37,
    max_context_size: 65536,
    analytical_kv_cache_multiplier: 1.07,
    analytical_runtime_memory_multiplier: 1.19,
    analytical_runtime_memory_minimum: 1.8,
    analytical_context_penalty_multiplier: 1.22,
    analytical_context_penalty_floor: 0.71,
    analytical_offload_penalty_multiplier: 1.48,
    analytical_throughput_multiplier: 1.61,
    description: 'Modele de test mis à jour',
  };

  const response = await request(app)
    .put(`/api/v1/models/${model.id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(200);

  assert.equal(response.body.model.total_params_billions, payload.total_params_billions);
  assert.equal(response.body.model.max_context_size, payload.max_context_size);
  assert.equal(response.body.model.analytical_context_penalty_floor, payload.analytical_context_penalty_floor);
  assert.equal(response.body.model.analytical_offload_penalty_multiplier, payload.analytical_offload_penalty_multiplier);

  const storedModel = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(model.id);
  assert.equal(storedModel.description, payload.description);
  assert.equal(storedModel.analytical_runtime_memory_minimum, payload.analytical_runtime_memory_minimum);
});

test('GET /api/v1/models/:id retourne le modèle et ses benchmarks', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const model = db.prepare('SELECT * FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  const response = await request(app)
    .get(`/api/v1/models/${model.id}`)
    .expect(200);

  assert.equal(response.body.name, model.name);
  assert.equal(response.body.benchmarks.length, 1);
  assert.equal(response.body.benchmarks[0].gpu_name, 'RTX 5090');
});

test('POST /api/v1/models/:id/recompute-analytical-profile met à jour le coefficient stocké', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const model = db.prepare('SELECT * FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  const response = await request(app)
    .post(`/api/v1/models/${model.id}/recompute-analytical-profile`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({})
    .expect(200);

  assert.equal(response.body.model.id, model.id);
  assert.equal(response.body.calibration.benchmark_count, 1);
  assert.equal(typeof response.body.calibration.analytical_throughput_multiplier, 'number');

  const storedModel = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(model.id);
  assert.equal(
    storedModel.analytical_throughput_multiplier,
    response.body.calibration.analytical_throughput_multiplier
  );
});

test('POST /api/v1/models/:id/recompute-analytical-profile dérive les coefficients additionnels quand les benchmarks le permettent', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const gpuInsert = db.prepare(`
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
  `).run('RTX 3070 Test', 'NVIDIA', 'Ampere', 8, 448, 0, 0, 0, 'budget', 72, 0, 0, 0);

  const modelInsert = db.prepare(`
    INSERT INTO llm_models (
      name,
      params_billions,
      total_params_billions,
      max_context_size,
      description
    )
    VALUES (?, ?, ?, ?, ?)
  `).run('Calibration Model 10B', 10, 10, 32768, 'Cas de calibration multi-contexte');

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

  insertBenchmark.run(gpuInsert.lastInsertRowid, 1, modelInsert.lastInsertRowid, 48, 4096, 'INT4', 'Contexte court');
  insertBenchmark.run(gpuInsert.lastInsertRowid, 1, modelInsert.lastInsertRowid, 8, 32768, 'INT4', 'Contexte long avec spill VRAM');

  const response = await request(app)
    .post(`/api/v1/models/${modelInsert.lastInsertRowid}/recompute-analytical-profile`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({})
    .expect(200);

  assert.equal(typeof response.body.calibration.analytical_throughput_multiplier, 'number');
  assert.equal(typeof response.body.calibration.analytical_context_penalty_floor, 'number');
  assert.equal(typeof response.body.calibration.analytical_context_penalty_multiplier, 'number');
  assert.equal(typeof response.body.calibration.analytical_kv_cache_multiplier, 'number');
  assert.equal(typeof response.body.calibration.analytical_runtime_memory_minimum, 'number');
  assert.equal(typeof response.body.calibration.analytical_runtime_memory_multiplier, 'number');
  assert.ok(response.body.calibration.analytical_context_penalty_floor < 1);

  if (response.body.calibration.analytical_offload_penalty_multiplier !== null) {
    assert.equal(typeof response.body.calibration.analytical_offload_penalty_multiplier, 'number');
    assert.ok(response.body.calibration.analytical_offload_penalty_multiplier > 0);
  }

  const storedModel = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(modelInsert.lastInsertRowid);
  assert.equal(
    storedModel.analytical_context_penalty_floor,
    response.body.calibration.analytical_context_penalty_floor
  );
  if (response.body.calibration.analytical_offload_penalty_multiplier !== null) {
    assert.equal(
      storedModel.analytical_offload_penalty_multiplier,
      response.body.calibration.analytical_offload_penalty_multiplier
    );
  }
});

test('POST /api/v1/models/:id/recompute-analytical-profile renvoie 400 sans benchmark', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const insert = db.prepare(`
    INSERT INTO llm_models (
      name,
      params_billions,
      total_params_billions,
      max_context_size,
      description
    )
    VALUES (?, ?, ?, ?, ?)
  `).run('Mistral Nemo 12B', 12, 12, 32768, 'Sans benchmark');

  const response = await request(app)
    .post(`/api/v1/models/${insert.lastInsertRowid}/recompute-analytical-profile`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({})
    .expect(400);

  assert.equal(response.body.error, 'No benchmark available for this model');
});

test('runMigration preserve les données existantes par défaut', async (t) => {
  const dbPath = createTempDatabasePath();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = dbPath;
  clearBackendDbModules();

  const db = require('../config/database');
  const { createTables, runMigration } = require('../src/db/migrations');
  createTables();

  t.after(() => {
    clearBackendDbModules();
    disposeTestDatabase(db, dbPath);
  });

  db.prepare(`
    INSERT INTO llm_models (name, params_billions, total_params_billions, description)
    VALUES (?, ?, ?, ?)
  `).run('Persistent Model', 14, 14, 'Doit survivre');

  runMigration();

  const storedModel = db.prepare('SELECT * FROM llm_models WHERE name = ?').get('Persistent Model');
  assert.equal(storedModel.name, 'Persistent Model');
});

test('bootstrapDatabase preserve les données existantes par défaut', async (t) => {
  const dbPath = createTempDatabasePath();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = dbPath;
  clearBackendDbModules();

  const db = require('../config/database');
  const { createTables } = require('../src/db/migrations');
  const { bootstrapDatabase } = require('../src/db/bootstrap');
  createTables();

  t.after(() => {
    clearBackendDbModules();
    disposeTestDatabase(db, dbPath);
  });

  db.prepare(`
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
  `).run('Custom GPU', 'NVIDIA', 'Ada', 20, 700, 0, 0, 0, 'prosumer', 80, 99, 0, 0);

  db.prepare(`
    INSERT INTO llm_models (name, params_billions, total_params_billions, description)
    VALUES (?, ?, ?, ?)
  `).run('Custom Model', 22, 22, 'Ne doit pas être écrasé');

  const beforeGpuCount = db.prepare('SELECT COUNT(*) AS count FROM gpu_benchmarks').get().count;
  const beforeModelCount = db.prepare('SELECT COUNT(*) AS count FROM llm_models').get().count;

  bootstrapDatabase();

  const customGpu = db.prepare('SELECT * FROM gpu_benchmarks WHERE name = ?').get('Custom GPU');
  const customModel = db.prepare('SELECT * FROM llm_models WHERE name = ?').get('Custom Model');
  const afterGpuCount = db.prepare('SELECT COUNT(*) AS count FROM gpu_benchmarks').get().count;
  const afterModelCount = db.prepare('SELECT COUNT(*) AS count FROM llm_models').get().count;

  assert.equal(customGpu.name, 'Custom GPU');
  assert.equal(customModel.name, 'Custom Model');
  assert.equal(afterGpuCount, beforeGpuCount);
  assert.equal(afterModelCount, beforeModelCount);
});

test('POST /api/v1/gpu/:gpu_id/benchmark persiste les métadonnées avancées du benchmark', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');
  const model = db.prepare('SELECT id FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  const payload = {
    llm_model_id: model.id,
    gpu_count: 2,
    tokens_per_second: 84.5,
    context_size: 16384,
    precision: 'AWQ INT4',
    inference_backend: 'vLLM',
    measurement_type: 'decode',
    vram_used_gb: 23.4,
    ram_used_gb: 19.8,
    kv_cache_precision: 'FP8',
    batch_size: 4,
    concurrency: 2,
    gpu_power_limit_watts: 420,
    gpu_core_clock_mhz: 2520,
    gpu_memory_clock_mhz: 1312,
    notes: 'Benchmark complet',
  };

  const response = await request(app)
    .post(`/api/v1/gpu/${gpu.id}/benchmark`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(201);

  assert.equal(response.body.benchmark.inference_backend, payload.inference_backend);
  assert.equal(response.body.benchmark.measurement_type, payload.measurement_type);
  assert.equal(response.body.benchmark.vram_used_gb, payload.vram_used_gb);
  assert.equal(response.body.benchmark.kv_cache_precision, payload.kv_cache_precision);

  const storedBenchmark = db.prepare('SELECT * FROM benchmark_results WHERE id = ?').get(response.body.benchmark.id);
  assert.equal(storedBenchmark.batch_size, payload.batch_size);
  assert.equal(storedBenchmark.concurrency, payload.concurrency);
  assert.equal(storedBenchmark.gpu_power_limit_watts, payload.gpu_power_limit_watts);
});

test('PUT /api/v1/gpu/:gpu_id/benchmark/:result_id met à jour les métadonnées avancées', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');
  const benchmark = db.prepare('SELECT id FROM benchmark_results WHERE gpu_id = ? LIMIT 1').get(gpu.id);

  const response = await request(app)
    .put(`/api/v1/gpu/${gpu.id}/benchmark/${benchmark.id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      llm_model_id: db.prepare('SELECT id FROM llm_models WHERE name = ?').get('DeepSeek R1 32B').id,
      gpu_count: 1,
      tokens_per_second: 72,
      context_size: 8192,
      precision: 'INT4',
      inference_backend: 'Ollama',
      measurement_type: 'prefill',
      vram_used_gb: 21.2,
      ram_used_gb: 12.4,
      kv_cache_precision: 'FP16',
      batch_size: 1,
      concurrency: 1,
      gpu_power_limit_watts: 350,
      gpu_core_clock_mhz: 2400,
      gpu_memory_clock_mhz: 1250,
      notes: 'Mise à jour benchmark',
    })
    .expect(200);

  assert.equal(response.body.benchmark.inference_backend, 'Ollama');
  assert.equal(response.body.benchmark.measurement_type, 'prefill');
  assert.equal(response.body.benchmark.kv_cache_precision, 'FP16');

  const storedBenchmark = db.prepare('SELECT * FROM benchmark_results WHERE id = ?').get(benchmark.id);
  assert.equal(storedBenchmark.ram_used_gb, 12.4);
  assert.equal(storedBenchmark.gpu_core_clock_mhz, 2400);
});
