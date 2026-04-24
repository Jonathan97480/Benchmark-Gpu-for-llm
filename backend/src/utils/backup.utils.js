const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const db = require('../../config/database');

const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const configuredBackupsDir = process.env.BACKUP_OUTPUT_DIR || path.join('backend', 'backups');
const BACKUPS_DIR = path.isAbsolute(configuredBackupsDir)
  ? configuredBackupsDir
  : path.join(ROOT_DIR, configuredBackupsDir);
const DEFAULT_IMAGE_DIRECTORIES = ['dist/assets', 'public/images', 'uploads'];

function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function sanitizeFileName(value) {
  return String(value || '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function buildTimestampParts(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return {
    iso: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`,
    slug: `${year}${month}${day}-${hours}${minutes}${seconds}`,
    day: `${year}-${month}-${day}`,
  };
}

function getConfiguredImageDirectories() {
  const configuredDirectories = process.env.BACKUP_IMAGE_DIRECTORIES
    ? process.env.BACKUP_IMAGE_DIRECTORIES.split(',')
    : DEFAULT_IMAGE_DIRECTORIES;

  return configuredDirectories
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const absolutePath = path.isAbsolute(entry) ? entry : path.join(ROOT_DIR, entry);
      return {
        source: absolutePath,
        relative: path.relative(ROOT_DIR, absolutePath) || path.basename(absolutePath),
      };
    })
    .filter((entry) => fs.existsSync(entry.source));
}

function buildBackupMetadata(fileName, manifest = {}) {
  const archivePath = path.join(BACKUPS_DIR, fileName);
  const stats = fs.statSync(archivePath);

  return {
    id: String(fileName).replace(/\.tar\.gz$/i, ''),
    file_name: fileName,
    file_size: stats.size,
    created_at: manifest.created_at || stats.birthtime.toISOString(),
    reason: manifest.reason || 'manual',
    includes_images: Boolean(manifest.includes_images),
    image_directories: manifest.image_directories || [],
    db_file_name: manifest.db_file_name || null,
  };
}

function writeManifest(fileName, manifest) {
  const manifestPath = path.join(BACKUPS_DIR, `${fileName}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function readManifest(fileName) {
  const manifestPath = path.join(BACKUPS_DIR, `${fileName}.json`);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function listBackups() {
  ensureDirectory(BACKUPS_DIR);

  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((fileName) => fileName.endsWith('.tar.gz'))
    .map((fileName) => buildBackupMetadata(fileName, readManifest(fileName) || {}))
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
}

function resolveBackupArchive(fileName) {
  const safeFileName = path.basename(fileName || '');

  if (!safeFileName.endsWith('.tar.gz')) {
    throw new Error('Invalid backup file');
  }

  const archivePath = path.join(BACKUPS_DIR, safeFileName);

  if (!fs.existsSync(archivePath)) {
    throw new Error('Backup not found');
  }

  return archivePath;
}

async function createBackup({ reason = 'manual', includeImages = true } = {}) {
  ensureDirectory(BACKUPS_DIR);

  const timestamp = buildTimestampParts();
  const safeReason = sanitizeFileName(reason) || 'manual';
  const backupId = `${timestamp.slug}-${safeReason}`;
  const stageDir = path.join(BACKUPS_DIR, backupId);
  const dbFileName = `${backupId}.db`;
  const archiveName = `${backupId}.tar.gz`;
  const archivePath = path.join(BACKUPS_DIR, archiveName);
  const stageDbPath = path.join(stageDir, dbFileName);
  const imageDirectories = includeImages ? getConfiguredImageDirectories() : [];

  ensureDirectory(stageDir);

  try {
    await db.backup(stageDbPath);

    for (const entry of imageDirectories) {
      const targetPath = path.join(stageDir, entry.relative);
      ensureDirectory(path.dirname(targetPath));
      fs.cpSync(entry.source, targetPath, { recursive: true });
    }

    const manifest = {
      id: backupId,
      created_at: new Date().toISOString(),
      reason,
      includes_images: imageDirectories.length > 0,
      image_directories: imageDirectories.map((entry) => entry.relative),
      db_file_name: dbFileName,
      source_database_path: db.dbPath,
    };

    fs.writeFileSync(path.join(stageDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    execFileSync(
      'tar',
      ['-czf', archivePath, '-C', BACKUPS_DIR, backupId],
      { stdio: 'ignore' }
    );

    writeManifest(archiveName, manifest);

    return buildBackupMetadata(archiveName, manifest);
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
}

async function createPreMigrationBackup() {
  if (!fs.existsSync(db.dbPath)) {
    return null;
  }

  const stats = fs.statSync(db.dbPath);
  if (stats.size === 0) {
    return null;
  }

  return createBackup({ reason: 'pre-migration', includeImages: false });
}

module.exports = {
  BACKUPS_DIR,
  createBackup,
  createPreMigrationBackup,
  listBackups,
  resolveBackupArchive,
};
