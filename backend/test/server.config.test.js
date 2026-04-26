const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  createTempDatabasePath,
  disposeTestDatabase,
  loadFreshBackend,
} = require('./helpers/test-app');

test('le backend applique CORS_ORIGIN quand la variable est définie', async () => {
  const dbPath = createTempDatabasePath();
  const previousCorsOrigin = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = 'https://app.example.com,https://admin.example.com';

  const { app, db } = loadFreshBackend(dbPath);

  try {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://admin.example.com')
      .expect(200);

    assert.equal(response.headers['access-control-allow-origin'], 'https://admin.example.com');
  } finally {
    if (previousCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = previousCorsOrigin;
    }

    disposeTestDatabase(db, dbPath);
  }
});
