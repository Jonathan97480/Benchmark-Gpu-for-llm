const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
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

function clearModules() {
  for (const modulePath of [
    '../config/database',
    '../src/db/migrations',
    '../src/utils/backup.utils',
    '../src/controllers/backups.controller',
    '../src/controllers/gpu.controller',
    '../src/routes/backups.routes',
    '../src/routes/gpu.routes',
    '../server',
  ]) {
    const resolvedPath = require.resolve(modulePath);
    delete require.cache[resolvedPath];
  }
}

test('GET /api/v1/gpu/:id/price-history expose l’historique de prix du GPU', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');
  db.prepare(`
    INSERT INTO gpu_price_history (gpu_id, price_new_value, price_used_value, recorded_at)
    VALUES (?, ?, ?, ?), (?, ?, ?, ?)
  `).run(
    gpu.id, 2290, 0, '2026-04-22T12:00:00.000Z',
    gpu.id, 2250, 0, '2026-04-23T12:00:00.000Z'
  );

  const response = await request(app)
    .get(`/api/v1/gpu/${gpu.id}/price-history`)
    .expect(200);

  assert.equal(response.body.gpu.id, gpu.id);
  assert.equal(response.body.history.length >= 2, true);
  assert.equal(response.body.history[0].price_new_value, 2290);
});

test('GET /sitemap.xml expose les URLs publiques et exclut l’admin', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);
  const model = db.prepare('SELECT id FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  const insertedGpus = db.prepare(`
    INSERT INTO gpu_benchmarks (
      name, vendor, architecture, vram, bandwidth, price_value, price_new_value, price_used_value, tier, score, tokens_8b, tokens_32b, tokens_70b
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RTX 4090', 'NVIDIA', 'Ada Lovelace', 24, 1008, 1800, 1800, 0, 'prosumer', 82, 128, 45, 0,
    'RTX 3090', 'NVIDIA', 'Ampere', 24, 936, 875, 0, 875, 'prosumer', 78, 112, 32, 10
  );

  db.prepare(`
    INSERT INTO benchmark_results (
      gpu_id, llm_model_id, tokens_per_second, context_size, precision, inference_backend, measurement_type, vram_used_gb, ram_used_gb, kv_cache_precision, batch_size, concurrency, gpu_power_limit_watts, gpu_core_clock_mhz, gpu_memory_clock_mhz, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    insertedGpus.lastInsertRowid - 1, model.id, 45, null, null, 'vLLM', 'decode', 21, 16, 'FP8', 1, 1, 450, 2500, 1300, 'Sitemap comparison seed 4090',
    insertedGpus.lastInsertRowid, model.id, 32, null, null, 'vLLM', 'decode', 19, 16, 'FP8', 1, 1, 350, 1700, 1200, 'Sitemap comparison seed 3090'
  );

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/sitemap.xml')
    .expect(200);

  assert.match(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/<\/loc>/);
  assert.match(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/vendor\/nvidia<\/loc>/);
  assert.match(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/model\/deepseek-r1-32b<\/loc>/);
  assert.match(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/gpu\/rtx-5090<\/loc>/);
  assert.match(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/comparatifs\/vram\/24go<\/loc>/);
  assert.match(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/comparatifs\/gpu\/rtx-5090-vs-rtx-4090<\/loc>/);
  assert.match(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/usages\/local-ai<\/loc>/);
  assert.doesNotMatch(response.text, /https:\/\/gpubenchmark\.jon-dev\.fr\/admin/);
});

test('chaque URL publique listée dans le sitemap répond en 200', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);
  const model = db.prepare('SELECT id FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  const insertedGpus = db.prepare(`
    INSERT INTO gpu_benchmarks (
      name, vendor, architecture, vram, bandwidth, price_value, price_new_value, price_used_value, tier, score, tokens_8b, tokens_32b, tokens_70b
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RTX 4090', 'NVIDIA', 'Ada Lovelace', 24, 1008, 1800, 1800, 0, 'prosumer', 82, 128, 45, 0,
    'RTX 3090', 'NVIDIA', 'Ampere', 24, 936, 875, 0, 875, 'prosumer', 78, 112, 32, 10
  );

  db.prepare(`
    INSERT INTO benchmark_results (
      gpu_id, llm_model_id, tokens_per_second, context_size, precision, inference_backend, measurement_type, vram_used_gb, ram_used_gb, kv_cache_precision, batch_size, concurrency, gpu_power_limit_watts, gpu_core_clock_mhz, gpu_memory_clock_mhz, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    insertedGpus.lastInsertRowid - 1, model.id, 45, null, null, 'vLLM', 'decode', 21, 16, 'FP8', 1, 1, 450, 2500, 1300, 'Sitemap smoke seed 4090',
    insertedGpus.lastInsertRowid, model.id, 32, null, null, 'vLLM', 'decode', 19, 16, 'FP8', 1, 1, 350, 1700, 1200, 'Sitemap smoke seed 3090'
  );

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const sitemapResponse = await request(app)
    .get('/sitemap.xml')
    .expect(200);

  const urlMatches = [...sitemapResponse.text.matchAll(/<loc>https:\/\/gpubenchmark\.jon-dev\.fr([^<]*)<\/loc>/g)];
  const paths = urlMatches.map((match) => match[1]);

  for (const path of paths) {
    const response = await request(app).get(path).expect(200);
    assert.match(response.text, /<title>/);
  }
});

test('GET /gpu/:slug renvoie une page HTML prerendue pour le SEO', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/gpu/rtx-5090')
    .expect(200);

  assert.match(response.text, /<title>RTX 5090 \| Benchmark GPU LLM<\/title>/);
  assert.match(response.text, /<h1>RTX 5090<\/h1>/);
  assert.match(response.text, /Benchmarks LLM disponibles/);
});

test('GET /vendor/:slug renvoie une page HTML prerendue pour le SEO vendor', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/vendor/nvidia')
    .expect(200);

  assert.match(response.text, /<title>NVIDIA \| Catalogue GPU LLM<\/title>/);
  assert.match(response.text, /<h1>NVIDIA<\/h1>/);
  assert.match(response.text, /Cartes NVIDIA dans le catalogue/);
});

test('GET /model/:slug renvoie une page HTML prerendue pour le SEO model', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/model/deepseek-r1-32b')
    .expect(200);

  assert.match(response.text, /<title>DeepSeek R1 32B \| Benchmark LLM<\/title>/);
  assert.match(response.text, /<h1>DeepSeek R1 32B<\/h1>/);
  assert.match(response.text, /Benchmarks GPU disponibles/);
});

test('GET /guides/choisir-gpu-llm renvoie une page éditoriale prerendue pour le SEO', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/guides/choisir-gpu-llm')
    .expect(200);

  assert.match(response.text, /<title>Choisir un GPU pour LLM \| Guide d&#39;achat<\/title>/);
  assert.match(response.text, /<h1>Comment choisir un GPU pour LLM<\/h1>/);
  assert.match(response.text, /Guide pratique pour choisir un GPU pour l&#39;inference LLM/);
  assert.match(response.text, /VRAM/);
});

test('GET /faq renvoie une FAQ prerendue pour le SEO', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/faq')
    .expect(200);

  assert.match(response.text, /<title>FAQ GPU LLM Benchmark<\/title>/);
  assert.match(response.text, /Questions fréquentes sur le benchmark GPU LLM/);
  assert.match(response.text, /Questions fréquentes/);
});

test('GET /faq/ redirige vers l’URL canonique sans slash final', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/faq/')
    .redirects(0)
    .expect(301);

  assert.equal(response.headers.location, '/faq');
});

test('GET /comparatifs/gpu/:slug renvoie un comparatif dynamique prerendue depuis la base', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  const gpu4090 = db.prepare(`
    INSERT INTO gpu_benchmarks (
      name, vendor, architecture, vram, bandwidth, price_value, price_new_value, price_used_value, tier, score, tokens_8b, tokens_32b, tokens_70b
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('RTX 4090', 'NVIDIA', 'Ada Lovelace', 24, 1008, 1800, 1800, 0, 'prosumer', 82, 128, 45, 0);

  const model = db.prepare('SELECT id FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');

  db.prepare(`
    INSERT INTO benchmark_results (
      gpu_id, llm_model_id, tokens_per_second, context_size, precision, inference_backend, measurement_type, vram_used_gb, ram_used_gb, kv_cache_precision, batch_size, concurrency, gpu_power_limit_watts, gpu_core_clock_mhz, gpu_memory_clock_mhz, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    gpu4090.lastInsertRowid,
    model.id,
    45,
    null,
    null,
    'vLLM',
    'decode',
    21,
    16,
    'FP8',
    1,
    1,
    450,
    2500,
    1300,
    'Seed comparaison test benchmark'
  );

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/comparatifs/gpu/rtx-4090-vs-rtx-5090')
    .expect(200);

  assert.match(response.text, /<title>RTX 4090 vs RTX 5090 pour LLM<\/title>/);
  assert.match(response.text, /<h1>RTX 4090 vs RTX 5090 pour LLM<\/h1>/);
  assert.match(response.text, /Ce qu'il faut retenir/);
});

test('GET /comparatifs/vram/:slug renvoie un comparatif dynamique par VRAM depuis la base', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  db.prepare(`
    INSERT INTO gpu_benchmarks (
      name, vendor, architecture, vram, bandwidth, price_value, price_new_value, price_used_value, tier, score, tokens_8b, tokens_32b, tokens_70b
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RTX 4090', 'NVIDIA', 'Ada Lovelace', 24, 1008, 1800, 1800, 0, 'prosumer', 82, 128, 45, 0,
    'RTX 3090', 'NVIDIA', 'Ampere', 24, 936, 875, 0, 875, 'prosumer', 88, 112, 0, 10
  );

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/comparatifs/vram/24go')
    .expect(200);

  assert.match(response.text, /<title>Quel GPU 24 Go choisir pour LLM<\/title>/);
  assert.match(response.text, /<h1>Quel GPU 24 Go choisir pour LLM<\/h1>/);
  assert.match(response.text, /Cartes 24 Go a comparer/);
});

test('GET /usages/:slug renvoie une page usage dynamique depuis la base', async (t) => {
  const dbPath = createTempDatabasePath();
  process.env.PUBLIC_SITE_URL = 'https://gpubenchmark.jon-dev.fr';
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  db.prepare(`
    INSERT INTO gpu_benchmarks (
      name, vendor, architecture, vram, bandwidth, price_value, price_new_value, price_used_value, tier, score, tokens_8b, tokens_32b, tokens_70b
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RTX 4090', 'NVIDIA', 'Ada Lovelace', 24, 1008, 1800, 1800, 0, 'prosumer', 82, 128, 45, 0,
    'Arc A770', 'Intel', 'Alchemist', 16, 512, 200, 200, 0, 'budget', 72, 40, 0, 0
  );

  const model = db.prepare('SELECT id FROM llm_models WHERE name = ?').get('DeepSeek R1 32B');
  const gpu4090 = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 4090');
  const a770 = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('Arc A770');

  db.prepare(`
    INSERT INTO benchmark_results (
      gpu_id, llm_model_id, tokens_per_second, context_size, precision, inference_backend, measurement_type, vram_used_gb, ram_used_gb, kv_cache_precision, batch_size, concurrency, gpu_power_limit_watts, gpu_core_clock_mhz, gpu_memory_clock_mhz, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    gpu4090.id, model.id, 45, null, null, 'vLLM', 'decode', 21, 16, 'FP8', 1, 1, 450, 2500, 1300, 'Usage page benchmark',
    a770.id, model.id, 18, null, null, 'vLLM', 'decode', 12, 10, 'FP8', 1, 1, 225, 2100, 1000, 'Usage page benchmark'
  );

  t.after(() => {
    delete process.env.PUBLIC_SITE_URL;
    clearModules();
    disposeTestDatabase(db, dbPath);
  });

  const response = await request(app)
    .get('/usages/local-ai')
    .expect(200);

  assert.match(response.text, /<title>Quels GPU regarder pour du local AI<\/title>/);
  assert.match(response.text, /<h1>Quels GPU regarder pour du local AI<\/h1>/);
  assert.match(response.text, /Cartes a regarder/);
});

test('POST /api/v1/gpu/:id/price-history cree un point d’historique de prix', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');

  const response = await request(app)
    .post(`/api/v1/gpu/${gpu.id}/price-history`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      price_new_value: 2310,
      price_used_value: 0,
      recorded_at: '2026-04-24T12:00:00.000Z',
    })
    .expect(201);

  assert.equal(response.body.history_entry.gpu_id, gpu.id);
  assert.equal(response.body.history_entry.price_new_value, 2310);
  assert.match(response.body.history_entry.recorded_at, /2026-04-24/);
});

test('PUT /api/v1/gpu/:id/price-history/:history_id met a jour un point d’historique de prix', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');
  const insert = db.prepare(`
    INSERT INTO gpu_price_history (gpu_id, price_new_value, price_used_value, recorded_at)
    VALUES (?, ?, ?, ?)
  `).run(gpu.id, 2290, 0, '2026-04-22T12:00:00.000Z');

  const response = await request(app)
    .put(`/api/v1/gpu/${gpu.id}/price-history/${insert.lastInsertRowid}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      price_new_value: 2275,
      price_used_value: 1990,
      recorded_at: '2026-04-25T12:00:00.000Z',
    })
    .expect(200);

  assert.equal(response.body.history_entry.price_new_value, 2275);
  assert.equal(response.body.history_entry.price_used_value, 1990);

  const storedEntry = db.prepare('SELECT * FROM gpu_price_history WHERE id = ?').get(insert.lastInsertRowid);
  assert.equal(storedEntry.price_new_value, 2275);
  assert.equal(storedEntry.price_used_value, 1990);
});

test('DELETE /api/v1/gpu/:id/price-history/:history_id supprime un point d’historique de prix', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');
  const insert = db.prepare(`
    INSERT INTO gpu_price_history (gpu_id, price_new_value, price_used_value, recorded_at)
    VALUES (?, ?, ?, ?)
  `).run(gpu.id, 2290, 0, '2026-04-22T12:00:00.000Z');

  await request(app)
    .delete(`/api/v1/gpu/${gpu.id}/price-history/${insert.lastInsertRowid}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  const storedEntry = db.prepare('SELECT * FROM gpu_price_history WHERE id = ?').get(insert.lastInsertRowid);
  assert.equal(storedEntry, undefined);
});

test('POST /api/v1/gpu/:id/price-history refuse une payload invalide', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const accessToken = await loginAsAdmin(app);
  const gpu = db.prepare('SELECT id FROM gpu_benchmarks WHERE name = ?').get('RTX 5090');

  const response = await request(app)
    .post(`/api/v1/gpu/${gpu.id}/price-history`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      price_new_value: -1,
    })
    .expect(400);

  assert.match(response.body.error, /must be greater than or equal to 0/i);
});

test('POST /api/v1/backups cree une archive et GET /api/v1/backups la liste', async (t) => {
  const dbPath = createTempDatabasePath();
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-backup-test-'));

  process.env.BACKUP_OUTPUT_DIR = backupDir;
  clearModules();

  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => {
    delete process.env.BACKUP_OUTPUT_DIR;
    clearModules();
    disposeTestDatabase(db, dbPath);
    fs.rmSync(backupDir, { recursive: true, force: true });
  });

  const accessToken = await loginAsAdmin(app);

  const createResponse = await request(app)
    .post('/api/v1/backups')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ include_images: false, reason: 'backup-test' })
    .expect(201);

  assert.equal(createResponse.body.backup.reason, 'backup-test');
  assert.equal(createResponse.body.backup.file_name.endsWith('.tar.gz'), true);
  assert.equal(fs.existsSync(path.join(backupDir, createResponse.body.backup.file_name)), true);

  const listResponse = await request(app)
    .get('/api/v1/backups')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(listResponse.body.backups.length, 1);
  assert.equal(listResponse.body.backups[0].file_name, createResponse.body.backup.file_name);

  await request(app)
    .get(`/api/v1/backups/${encodeURIComponent(createResponse.body.backup.file_name)}/download`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
});
