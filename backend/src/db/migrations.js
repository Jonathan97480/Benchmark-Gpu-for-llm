const db = require('../../config/database');
const { createPreMigrationBackup } = require('../utils/backup.utils');

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

function ensureGpuPriceHistoryEntry(gpuId, priceNewValue, priceUsedValue) {
  const existingEntry = db.prepare(`
    SELECT id
    FROM gpu_price_history
    WHERE gpu_id = ?
      AND date(recorded_at) = date('now')
    LIMIT 1
  `).get(gpuId);

  if (existingEntry) {
    db.prepare(`
      UPDATE gpu_price_history
      SET
        price_new_value = ?,
        price_used_value = ?
      WHERE id = ?
    `).run(priceNewValue, priceUsedValue, existingEntry.id);
    return;
  }

  db.prepare(`
    INSERT INTO gpu_price_history (
      gpu_id,
      price_new_value,
      price_used_value,
      recorded_at
    )
    VALUES (?, ?, ?, date('now'))
  `).run(gpuId, priceNewValue, priceUsedValue);
}

function backfillGpuPriceHistory() {
  const rows = db.prepare(`
    SELECT id, COALESCE(price_new_value, 0) AS price_new_value, COALESCE(price_used_value, 0) AS price_used_value
    FROM gpu_benchmarks
  `).all();

  for (const row of rows) {
    ensureGpuPriceHistoryEntry(row.id, row.price_new_value, row.price_used_value);
  }
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

    CREATE TABLE IF NOT EXISTS gpu_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gpu_id INTEGER NOT NULL,
      price_new_value INTEGER DEFAULT 0,
      price_used_value INTEGER DEFAULT 0,
      recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gpu_id) REFERENCES gpu_benchmarks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_gpu_price_history_gpu_date
      ON gpu_price_history(gpu_id, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS llm_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      params_billions INTEGER,
      total_params_billions INTEGER,
      max_context_size INTEGER,
      analytical_kv_cache_multiplier REAL,
      analytical_runtime_memory_multiplier REAL,
      analytical_runtime_memory_minimum REAL,
      analytical_context_penalty_multiplier REAL,
      analytical_context_penalty_floor REAL,
      analytical_offload_penalty_multiplier REAL,
      analytical_throughput_multiplier REAL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS benchmark_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gpu_id INTEGER NOT NULL,
      gpu_count INTEGER NOT NULL DEFAULT 1,
      llm_model_id INTEGER NOT NULL,
      tokens_per_second REAL NOT NULL,
      context_size INTEGER,
      precision TEXT,
      inference_backend TEXT,
      measurement_type TEXT,
      vram_used_gb REAL,
      ram_used_gb REAL,
      kv_cache_precision TEXT,
      batch_size INTEGER,
      concurrency INTEGER,
      gpu_power_limit_watts INTEGER,
      gpu_core_clock_mhz INTEGER,
      gpu_memory_clock_mhz INTEGER,
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
  addColumnIfMissing('benchmark_results', 'gpu_count', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('benchmark_results', 'inference_backend', 'TEXT');
  addColumnIfMissing('benchmark_results', 'measurement_type', 'TEXT');
  addColumnIfMissing('benchmark_results', 'vram_used_gb', 'REAL');
  addColumnIfMissing('benchmark_results', 'ram_used_gb', 'REAL');
  addColumnIfMissing('benchmark_results', 'kv_cache_precision', 'TEXT');
  addColumnIfMissing('benchmark_results', 'batch_size', 'INTEGER');
  addColumnIfMissing('benchmark_results', 'concurrency', 'INTEGER');
  addColumnIfMissing('benchmark_results', 'gpu_power_limit_watts', 'INTEGER');
  addColumnIfMissing('benchmark_results', 'gpu_core_clock_mhz', 'INTEGER');
  addColumnIfMissing('benchmark_results', 'gpu_memory_clock_mhz', 'INTEGER');
  addColumnIfMissing('llm_models', 'total_params_billions', 'INTEGER');
  addColumnIfMissing('llm_models', 'max_context_size', 'INTEGER');
  addColumnIfMissing('llm_models', 'analytical_kv_cache_multiplier', 'REAL');
  addColumnIfMissing('llm_models', 'analytical_runtime_memory_multiplier', 'REAL');
  addColumnIfMissing('llm_models', 'analytical_runtime_memory_minimum', 'REAL');
  addColumnIfMissing('llm_models', 'analytical_context_penalty_multiplier', 'REAL');
  addColumnIfMissing('llm_models', 'analytical_context_penalty_floor', 'REAL');
  addColumnIfMissing('llm_models', 'analytical_offload_penalty_multiplier', 'REAL');
  addColumnIfMissing('llm_models', 'analytical_throughput_multiplier', 'REAL');
  backfillGpuPriceColumns();
  backfillGpuPriceHistory();

  console.log('Tables created successfully');
};

const dropTables = () => {
  db.exec(`
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS api_keys;
    DROP TABLE IF EXISTS benchmark_results;
    DROP TABLE IF EXISTS gpu_price_history;
    DROP TABLE IF EXISTS llm_models;
    DROP TABLE IF EXISTS gpu_benchmarks;
    DROP TABLE IF EXISTS users;
  `);

  console.log('Tables dropped successfully');
};

const runMigration = async ({ reset = false } = {}) => {
  console.log(`Running database migrations${reset ? ' with reset' : ''}...`);

  if (!reset) {
    const backup = await createPreMigrationBackup();
    if (backup) {
      console.log(`Pre-migration backup created: ${backup.file_name}`);
    }
  }

  if (reset) {
    dropTables();
  }

  createTables();
  console.log(`Migration completed${reset ? ' after reset' : ''}`);
};

if (require.main === module) {
  const reset = process.argv.includes('--reset') || process.env.DB_RESET === '1';
  runMigration({ reset }).catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { createTables, dropTables, ensureGpuPriceHistoryEntry, runMigration };
