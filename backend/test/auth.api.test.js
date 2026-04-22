const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  createTempDatabasePath,
  disposeTestDatabase,
  loadFreshBackend,
} = require('./helpers/test-app');

test('POST /api/v1/auth/login renvoie un access token et pose un cookie HttpOnly', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      username: 'admin',
      password: 'Admin1234',
    })
    .expect(200);

  assert.ok(response.body.access_token);
  assert.equal(response.body.refresh_token, undefined);
  assert.ok(
    response.headers['set-cookie'].some((cookie) =>
      cookie.includes('refresh_token=') && cookie.includes('HttpOnly')
    )
  );
});

test('POST /api/v1/auth/refresh accepte le refresh token via cookie HttpOnly', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const agent = request.agent(app);

  await agent
    .post('/api/v1/auth/login')
    .send({
      username: 'admin',
      password: 'Admin1234',
    })
    .expect(200);

  const refreshResponse = await agent
    .post('/api/v1/auth/refresh')
    .send({})
    .expect(200);

  assert.ok(refreshResponse.body.access_token);
  assert.equal(refreshResponse.body.refresh_token, undefined);
});

test('POST /api/v1/models exige un access token valide', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  await request(app)
    .post('/api/v1/models')
    .send({
      name: 'Qwen 3.5 35B',
      params_billions: 35,
      total_params_billions: 35,
      description: 'Modele de test',
    })
    .expect(401);
});

test('une API key active permet a un service externe de creer un modele', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  const agent = request.agent(app);

  const loginResponse = await agent
    .post('/api/v1/auth/login')
    .send({
      username: 'admin',
      password: 'Admin1234',
    })
    .expect(200);

  const createKeyResponse = await agent
    .post('/api/v1/auth/api-keys')
    .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
    .send({ name: 'external-ingestion' })
    .expect(201);

  const externalResponse = await request(app)
    .post('/api/v1/models')
    .set('x-api-key', createKeyResponse.body.api_key)
    .send({
      name: 'Qwen 3.5 35B',
      params_billions: 35,
      total_params_billions: 35,
      description: 'Cree via api key',
    })
    .expect(201);

  assert.equal(externalResponse.body.model.name, 'Qwen 3.5 35B');
});

test('une API key invalide est refusee sur les routes d ecriture', async (t) => {
  const dbPath = createTempDatabasePath();
  const { app, db } = loadFreshBackend(dbPath);

  t.after(() => disposeTestDatabase(db, dbPath));

  await request(app)
    .post('/api/v1/models')
    .set('x-api-key', 'gpublm_invalid')
    .send({
      name: 'Bad Model',
      params_billions: 10,
      total_params_billions: 10,
      description: 'Ne doit pas passer',
    })
    .expect(403);
});
