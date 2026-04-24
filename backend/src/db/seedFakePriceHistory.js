const db = require('../../config/database');
const { createTables } = require('./migrations');

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPrice(value) {
  return Math.max(0, Math.round(value));
}

function formatDateOffset(daysAgo) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function computeSeriesValue(baseValue, dayIndex, phaseOffset, floorRatio) {
  if (!baseValue || baseValue <= 0) {
    return 0;
  }

  const amplitude = Math.max(12, Math.round(baseValue * 0.12));
  const trend = ((dayIndex % 9) - 4) * (amplitude / 8);
  const seasonal = Math.sin((dayIndex + phaseOffset) / 2.3) * amplitude;
  const computed = baseValue + trend + seasonal;
  return clampPrice(Math.max(baseValue * floorRatio, computed));
}

function seedFakePriceHistory({ days = 30, reset = false } = {}) {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('This script is disabled in production. Use --force only if you know what you are doing.');
  }

  createTables();

  const gpus = db.prepare(`
    SELECT id, name, price_new_value, price_used_value, price_value
    FROM gpu_benchmarks
    ORDER BY name ASC
  `).all();

  if (gpus.length === 0) {
    console.log('No GPU found. Run bootstrap before generating fake price history.');
    return;
  }

  const removeHistory = db.prepare('DELETE FROM gpu_price_history WHERE gpu_id = ?');
  const insertHistory = db.prepare(`
    INSERT INTO gpu_price_history (
      gpu_id,
      price_new_value,
      price_used_value,
      recorded_at
    )
    VALUES (?, ?, ?, ?)
  `);

  const run = db.transaction(() => {
    for (const gpu of gpus) {
      if (reset) {
        removeHistory.run(gpu.id);
      }

      const baseNewPrice = Number(gpu.price_new_value || gpu.price_value || 0);
      const baseUsedPrice = Number(gpu.price_used_value || Math.round(baseNewPrice * 0.7) || 0);

      for (let dayIndex = days - 1; dayIndex >= 0; dayIndex -= 1) {
        insertHistory.run(
          gpu.id,
          computeSeriesValue(baseNewPrice, dayIndex, gpu.id * 0.9, 0.55),
          computeSeriesValue(baseUsedPrice, dayIndex, gpu.id * 1.3, 0.45),
          formatDateOffset(dayIndex)
        );
      }
    }
  });

  run();

  console.log(`Inserted ${days} fake price points per GPU for ${gpus.length} GPU(s).`);
}

if (require.main === module) {
  const days = parseInteger(process.argv.find((value) => value.startsWith('--days='))?.split('=')[1], 30);
  const reset = process.argv.includes('--reset');

  try {
    seedFakePriceHistory({ days, reset });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  seedFakePriceHistory,
};
