const db = require('../../config/database');
const fs = require('fs');
const path = require('path');

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function backfillGpuPriceColumns() {
  const hasPriceValue = hasColumn('gpu_benchmarks', 'price_value');
  const hasPriceNewValue = hasColumn('gpu_benchmarks', 'price_new_value');
  const hasPriceUsedValue = hasColumn('gpu_benchmarks', 'price_used_value');

  if (!hasPriceValue || !hasPriceNewValue || !hasPriceUsedValue) {
    return;
  }

  db.exec(`
    UPDATE gpu_benchmarks
    SET
      price_used_value = CASE
        WHEN COALESCE(price_used_value, 0) = 0
          AND COALESCE(price_value, 0) > 0
          AND lower(COALESCE(price, '')) LIKE '%used%'
        THEN price_value
        ELSE price_used_value
      END,
      price_new_value = CASE
        WHEN COALESCE(price_new_value, 0) = 0
          AND COALESCE(price_value, 0) > 0
          AND lower(COALESCE(price, '')) NOT LIKE '%used%'
        THEN price_value
        ELSE price_new_value
      END
  `);
}

const createTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS gpu_benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      vendor TEXT NOT NULL,
      architecture TEXT NOT NULL,
      vram INTEGER NOT NULL,
      bandwidth INTEGER NOT NULL,
      price TEXT,
      price_value INTEGER DEFAULT 0,
      price_new_value INTEGER DEFAULT 0,
      price_used_value INTEGER DEFAULT 0,
      tier TEXT NOT NULL,
      score INTEGER NOT NULL,
      tokens_8b REAL DEFAULT 0,
      tokens_32b REAL DEFAULT 0,
      tokens_70b REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_gpu_vendor ON gpu_benchmarks(vendor);
    CREATE INDEX IF NOT EXISTS idx_gpu_tier ON gpu_benchmarks(tier);
    CREATE INDEX IF NOT EXISTS idx_gpu_score ON gpu_benchmarks(score DESC);
    CREATE INDEX IF NOT EXISTS idx_gpu_vram ON gpu_benchmarks(vram);

    CREATE TABLE IF NOT EXISTS llm_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      params_billions INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS benchmark_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gpu_id INTEGER NOT NULL,
      llm_model_id INTEGER NOT NULL,
      tokens_per_second REAL NOT NULL,
      context_size INTEGER,
      precision TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gpu_id) REFERENCES gpu_benchmarks(id) ON DELETE CASCADE,
      FOREIGN KEY (llm_model_id) REFERENCES llm_models(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_benchmark_gpu ON benchmark_results(gpu_id);
    CREATE INDEX IF NOT EXISTS idx_benchmark_model ON benchmark_results(llm_model_id);

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      created_by_user_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
    CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
  `);

  addColumnIfMissing('gpu_benchmarks', 'price_new_value', 'INTEGER DEFAULT 0');
  addColumnIfMissing('gpu_benchmarks', 'price_used_value', 'INTEGER DEFAULT 0');
  backfillGpuPriceColumns();

  console.log('Tables created successfully');
};

const dropTables = () => {
  db.exec(`
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS api_keys;
    DROP TABLE IF EXISTS benchmark_results;
    DROP TABLE IF EXISTS llm_models;
    DROP TABLE IF EXISTS gpu_benchmarks;
    DROP TABLE IF EXISTS users;
  `);

  console.log('Tables dropped successfully');
};

const runMigration = () => {
  console.log('Running database migrations...');
  dropTables();
  createTables();
  console.log('Migration completed');
};

if (require.main === module) {
  runMigration();
}

module.exports = { createTables, dropTables, runMigration };
