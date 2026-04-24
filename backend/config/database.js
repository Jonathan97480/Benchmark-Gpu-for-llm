const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const configuredPath = process.env.DATABASE_PATH || './data/gpu_benchmarks.db';
const dbPath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.join(__dirname, '..', configuredPath);

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.dbPath = dbPath;

module.exports = db;
