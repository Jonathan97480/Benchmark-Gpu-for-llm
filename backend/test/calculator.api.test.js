const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  createTempDatabasePath,
  disposeTestDatabase,
  loadFreshBackend,
} = require('./helpers/test-app');

test('POST /api/v1/calculator/estimate délègue le calcul au backend et retourne une estimation exploitable', async () => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  try {
    const gpu = db.prepare('SELECT * FROM gpu_benchmarks LIMIT 1').get();
    const model = db.prepare('SELECT * FROM llm_models LIMIT 1').get();

    const response = await request(app)
      .post('/api/v1/calculator/estimate')
      .send({
        gpuId: gpu.id,
        modelId: model.id,
        cpu: { cores: 8, threads: 16, frequency: 4.8 },
        ramGb: 64,
        requestedContextSize: 32768,
        selectedQuantizationKey: 'INT4',
        selectedBackendKey: 'llama.cpp / Ollama',
        selectedGpuCount: 1,
      })
      .expect(200);

    assert.equal(typeof response.body.estimate.estimatedTokensPerSecond, 'number');
    assert.equal(response.body.estimate.quantizationKey, 'INT4');
    assert.equal(response.body.estimate.backendKey, 'llama.cpp / Ollama');
    assert.equal(response.body.estimate.effectiveContextSize, 32768);
    assert.ok(response.body.estimate.memoryRequiredGb > 0);
  } finally {
    disposeTestDatabase(db, dbPath);
  }
});

test('POST /api/v1/calculator/estimate retourne une 404 si le modèle est introuvable', async () => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  try {
    const response = await request(app)
      .post('/api/v1/calculator/estimate')
      .send({
        gpuId: 1,
        modelId: 999999,
      })
      .expect(404);

    assert.equal(response.body.error, 'Model not found for calculator estimate');
    assert.equal(response.body.status, 404);
  } finally {
    disposeTestDatabase(db, dbPath);
  }
});
