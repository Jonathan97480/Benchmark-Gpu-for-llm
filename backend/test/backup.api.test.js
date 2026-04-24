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
