const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  createTempDatabasePath,
  disposeTestDatabase,
  loadFreshBackend,
} = require('./helpers/test-app');

test('GET /api/v1/gpu/public-catalog-table expose plusieurs benchmarks pour un meme modele', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');
  const model = db.prepare('SELECT id FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  db.prepare(`
    INSERT INTO benchmark_results (
      gpu_id,
      llm_model_id,
      gpu_count,
      tokens_per_second,
      context_size,
      precision,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(gpu.id, model.id, 2, 84.5, 16384, 'INT4', 'Deuxieme benchmark pour le meme modele');

  const response = await request(app)
    .get('/api/v1/gpu/public-catalog-table')
    .expect(200);

  assert.equal(response.body.models.length, 1);
  assert.equal(response.body.totals.benchmark_results, 2);
  assert.equal(response.body.gpus.length, 1);
  assert.equal(response.body.gpus[0].coverage_count, 2);
  assert.equal(response.body.gpus[0].benchmark_results.length, 2);
  assert.equal(
    response.body.gpus[0].benchmark_results.filter((entry) => entry.llm_model_id === model.id).length,
    2
  );
  assert.equal(response.body.gpus[0].benchmark_results[0].model_name, 'DeepSeek R1 32B');
});
