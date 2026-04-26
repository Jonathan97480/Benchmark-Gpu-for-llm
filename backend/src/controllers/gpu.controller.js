const db = require('../../config/database');
const { ensureGpuPriceHistoryEntry } = require('../db/migrations');
const { sendError } = require('../utils/httpResponses.utils');

const getAllGPUs = (req, res) => {
  try {
    const { vendor, tier, sort = 'score', order = 'desc', search } = req.query;

    let query = 'SELECT * FROM gpu_benchmarks WHERE 1=1';
    const params = [];

    if (vendor && vendor !== 'all') {
      query += ' AND vendor = ?';
      params.push(vendor);
    }

    if (tier && tier !== 'all') {
      query += ' AND tier = ?';
      params.push(tier);
    }

    if (search) {
      query += ' AND (name LIKE ? OR vendor LIKE ? OR architecture LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const validSortFields = [
      'name',
      'vendor',
      'vram',
      'bandwidth',
      'score',
      'price_value',
      'price_new_value',
      'price_used_value',
      'tokens_8b',
    ];
    const sortField = validSortFields.includes(sort) ? sort : 'score';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortField} ${sortOrder}`;

    const gpus = db.prepare(query).all(...params);

    res.json({
      gpus,
      total: gpus.length
    });
  } catch (error) {
    console.error('Error fetching GPUs:', error);
    return sendError(res, 500, 'Failed to fetch GPUs');
  }
};

const getPublicBenchmarkDataset = (req, res) => {
  try {
    const gpus = db.prepare(`
      SELECT *
      FROM gpu_benchmarks
      ORDER BY score DESC, name ASC
    `).all();

    const models = db.prepare(`
      SELECT *
      FROM llm_models
      ORDER BY params_billions ASC, total_params_billions ASC, name ASC
    `).all();

    const benchmarkResults = db.prepare(`
      SELECT
        br.*,
        g.name AS gpu_name,
        g.vendor,
        g.architecture,
        g.tier,
        g.vram,
        g.price_value,
        g.price_new_value,
        g.price_used_value,
        lm.name AS model_name,
        lm.params_billions,
        lm.total_params_billions
      FROM benchmark_results br
      JOIN gpu_benchmarks g ON g.id = br.gpu_id
      JOIN llm_models lm ON lm.id = br.llm_model_id
      ORDER BY lm.params_billions ASC, lm.total_params_billions ASC, lm.name ASC, br.tokens_per_second DESC
    `).all();

    res.json({
      gpus,
      models,
      benchmark_results: benchmarkResults,
      totals: {
        gpus: gpus.length,
        models: models.length,
        benchmark_results: benchmarkResults.length
      }
    });
  } catch (error) {
    console.error('Error fetching public benchmark dataset:', error);
    return sendError(res, 500, 'Failed to fetch public benchmark dataset');
  }
};

const getPublicCatalogTableDataset = (req, res) => {
  try {
    const gpus = db.prepare(`
      SELECT *
      FROM gpu_benchmarks
      ORDER BY score DESC, name ASC
    `).all();

    const models = db.prepare(`
      SELECT *
      FROM llm_models
      ORDER BY params_billions ASC, total_params_billions ASC, name ASC
    `).all();

    const benchmarkResults = db.prepare(`
      SELECT
        br.*,
        g.name AS gpu_name,
        g.vendor,
        g.architecture,
        g.tier,
        g.vram,
        g.price_value,
        g.price_new_value,
        g.price_used_value,
        lm.name AS model_name,
        lm.params_billions,
        lm.total_params_billions
      FROM benchmark_results br
      JOIN gpu_benchmarks g ON g.id = br.gpu_id
      JOIN llm_models lm ON lm.id = br.llm_model_id
      ORDER BY g.score DESC, g.name ASC, lm.params_billions ASC, lm.total_params_billions ASC, lm.name ASC, br.tokens_per_second DESC, br.id ASC
    `).all();

    const resultsByGpu = new Map();

    for (const result of benchmarkResults) {
      if (!resultsByGpu.has(result.gpu_id)) {
        resultsByGpu.set(result.gpu_id, []);
      }

      resultsByGpu.get(result.gpu_id).push(result);
    }

    const catalog = gpus.map((gpu) => {
      const gpuBenchmarks = resultsByGpu.get(gpu.id) || [];

      return {
        ...gpu,
        benchmark_results: gpuBenchmarks,
        coverage_count: gpuBenchmarks.length,
      };
    });

    res.json({
      gpus: catalog,
      models,
      totals: {
        gpus: catalog.length,
        models: models.length,
        benchmark_results: benchmarkResults.length,
      },
    });
  } catch (error) {
    console.error('Error fetching public catalog table dataset:', error);
    return sendError(res, 500, 'Failed to fetch public catalog table dataset');
  }
};

const getGPUById = (req, res) => {
  try {
    const { id } = req.params;

    const gpu = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(id);

    if (!gpu) {
      return sendError(res, 404, 'GPU not found');
    }

    const benchmarkResults = db.prepare(`
      SELECT br.*, lm.name as model_name, lm.params_billions, lm.total_params_billions
      FROM benchmark_results br
      JOIN llm_models lm ON lm.id = br.llm_model_id
      WHERE br.gpu_id = ?
    `).all(id);

    res.json({
      ...gpu,
      benchmark_results: benchmarkResults
    });
  } catch (error) {
    console.error('Error fetching GPU:', error);
    return sendError(res, 500, 'Failed to fetch GPU');
  }
};

const getGpuPriceHistory = (req, res) => {
  try {
    const { id } = req.params;

    const gpu = db.prepare('SELECT id, name, price_new_value, price_used_value FROM gpu_benchmarks WHERE id = ?').get(id);

    if (!gpu) {
      return sendError(res, 404, 'GPU not found');
    }

    const history = db.prepare(`
      SELECT
        id,
        gpu_id,
        price_new_value,
        price_used_value,
        recorded_at
      FROM gpu_price_history
      WHERE gpu_id = ?
      ORDER BY recorded_at ASC, id ASC
    `).all(id);

    res.json({
      gpu,
      history,
    });
  } catch (error) {
    console.error('Error fetching GPU price history:', error);
    return sendError(res, 500, 'Failed to fetch GPU price history');
  }
};

const createGpuPriceHistoryEntry = (req, res) => {
  try {
    const { id } = req.params;
    const {
      price_new_value = 0,
      price_used_value = 0,
      recorded_at
    } = req.body;

    const gpu = db.prepare('SELECT id, name FROM gpu_benchmarks WHERE id = ?').get(id);

    if (!gpu) {
      return sendError(res, 404, 'GPU not found');
    }

    const result = db.prepare(`
      INSERT INTO gpu_price_history (
        gpu_id,
        price_new_value,
        price_used_value,
        recorded_at
      )
      VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `).run(
      id,
      price_new_value,
      price_used_value,
      recorded_at ?? null
    );

    const historyEntry = db.prepare(`
      SELECT id, gpu_id, price_new_value, price_used_value, recorded_at
      FROM gpu_price_history
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'GPU price history entry created successfully',
      history_entry: historyEntry
    });
  } catch (error) {
    console.error('Error creating GPU price history entry:', error);
    return sendError(res, 500, 'Failed to create GPU price history entry');
  }
};

const updateGpuPriceHistoryEntry = (req, res) => {
  try {
    const { id, history_id } = req.params;
    const {
      price_new_value,
      price_used_value,
      recorded_at
    } = req.body;

    const existingEntry = db.prepare(`
      SELECT id, gpu_id
      FROM gpu_price_history
      WHERE id = ? AND gpu_id = ?
    `).get(history_id, id);

    if (!existingEntry) {
      return sendError(res, 404, 'GPU price history entry not found');
    }

    const updateFields = [];
    const params = [];

    if (price_new_value !== undefined) {
      updateFields.push('price_new_value = ?');
      params.push(price_new_value);
    }

    if (price_used_value !== undefined) {
      updateFields.push('price_used_value = ?');
      params.push(price_used_value);
    }

    if (recorded_at !== undefined) {
      updateFields.push('recorded_at = ?');
      params.push(recorded_at);
    }

    if (updateFields.length === 0) {
      return sendError(res, 400, 'No fields to update');
    }

    params.push(history_id, id);

    db.prepare(`
      UPDATE gpu_price_history
      SET ${updateFields.join(', ')}
      WHERE id = ? AND gpu_id = ?
    `).run(...params);

    const historyEntry = db.prepare(`
      SELECT id, gpu_id, price_new_value, price_used_value, recorded_at
      FROM gpu_price_history
      WHERE id = ?
    `).get(history_id);

    res.json({
      message: 'GPU price history entry updated successfully',
      history_entry: historyEntry
    });
  } catch (error) {
    console.error('Error updating GPU price history entry:', error);
    return sendError(res, 500, 'Failed to update GPU price history entry');
  }
};

const deleteGpuPriceHistoryEntry = (req, res) => {
  try {
    const { id, history_id } = req.params;

    const existingEntry = db.prepare(`
      SELECT id, gpu_id
      FROM gpu_price_history
      WHERE id = ? AND gpu_id = ?
    `).get(history_id, id);

    if (!existingEntry) {
      return sendError(res, 404, 'GPU price history entry not found');
    }

    db.prepare(`
      DELETE FROM gpu_price_history
      WHERE id = ? AND gpu_id = ?
    `).run(history_id, id);

    res.json({
      message: 'GPU price history entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting GPU price history entry:', error);
    return sendError(res, 500, 'Failed to delete GPU price history entry');
  }
};

const createGPU = (req, res) => {
  try {
    const {
      name, vendor, architecture, vram, bandwidth,
      price, price_value, price_new_value, price_used_value, tier, score,
      tokens_8b = 0, tokens_32b = 0, tokens_70b = 0
    } = req.body;

    const effectivePriceValue =
      price_value ?? price_new_value ?? price_used_value ?? 0;

    const result = db.prepare(`
      INSERT INTO gpu_benchmarks (
        name,
        vendor,
        architecture,
        vram,
        bandwidth,
        price,
        price_value,
        price_new_value,
        price_used_value,
        tier,
        score,
        tokens_8b,
        tokens_32b,
        tokens_70b
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      vendor,
      architecture,
      vram,
      bandwidth,
      price,
      effectivePriceValue,
      price_new_value ?? 0,
      price_used_value ?? 0,
      tier,
      score,
      tokens_8b,
      tokens_32b,
      tokens_70b
    );

    const gpu = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(result.lastInsertRowid);
    ensureGpuPriceHistoryEntry(
      gpu.id,
      gpu.price_new_value ?? 0,
      gpu.price_used_value ?? 0
    );

    res.status(201).json({
      message: 'GPU created successfully',
      gpu
    });
  } catch (error) {
    console.error('Error creating GPU:', error);
    return sendError(res, 500, 'Failed to create GPU');
  }
};

const updateGPU = (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, vendor, architecture, vram, bandwidth,
      price, price_value, price_new_value, price_used_value, tier, score,
      tokens_8b, tokens_32b, tokens_70b
    } = req.body;

    const existingGPU = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(id);

    if (!existingGPU) {
      return sendError(res, 404, 'GPU not found');
    }

    const updateFields = [];
    const params = [];

    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (vendor !== undefined) { updateFields.push('vendor = ?'); params.push(vendor); }
    if (architecture !== undefined) { updateFields.push('architecture = ?'); params.push(architecture); }
    if (vram !== undefined) { updateFields.push('vram = ?'); params.push(vram); }
    if (bandwidth !== undefined) { updateFields.push('bandwidth = ?'); params.push(bandwidth); }
    if (price !== undefined) { updateFields.push('price = ?'); params.push(price); }
    if (price_value !== undefined) { updateFields.push('price_value = ?'); params.push(price_value); }
    if (price_new_value !== undefined) { updateFields.push('price_new_value = ?'); params.push(price_new_value); }
    if (price_used_value !== undefined) { updateFields.push('price_used_value = ?'); params.push(price_used_value); }
    if (tier !== undefined) { updateFields.push('tier = ?'); params.push(tier); }
    if (score !== undefined) { updateFields.push('score = ?'); params.push(score); }
    if (tokens_8b !== undefined) { updateFields.push('tokens_8b = ?'); params.push(tokens_8b); }
    if (tokens_32b !== undefined) { updateFields.push('tokens_32b = ?'); params.push(tokens_32b); }
    if (tokens_70b !== undefined) { updateFields.push('tokens_70b = ?'); params.push(tokens_70b); }

    if (
      price_value === undefined &&
      (price_new_value !== undefined || price_used_value !== undefined)
    ) {
      updateFields.push('price_value = ?');
      params.push(price_new_value ?? price_used_value ?? 0);
    }

    if (updateFields.length === 0) {
      return sendError(res, 400, 'No fields to update');
    }

    updateFields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`
      UPDATE gpu_benchmarks
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);

    const gpu = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(id);
    ensureGpuPriceHistoryEntry(
      gpu.id,
      gpu.price_new_value ?? 0,
      gpu.price_used_value ?? 0
    );

    res.json({
      message: 'GPU updated successfully',
      gpu
    });
  } catch (error) {
    console.error('Error updating GPU:', error);
    return sendError(res, 500, 'Failed to update GPU');
  }
};

const deleteGPU = (req, res) => {
  try {
    const { id } = req.params;

    const existingGPU = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(id);

    if (!existingGPU) {
      return sendError(res, 404, 'GPU not found');
    }

    db.prepare('DELETE FROM gpu_benchmarks WHERE id = ?').run(id);

    res.json({
      message: 'GPU deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting GPU:', error);
    return sendError(res, 500, 'Failed to delete GPU');
  }
};

module.exports = {
  getAllGPUs,
  getPublicCatalogTableDataset,
  getPublicBenchmarkDataset,
  getGPUById,
  getGpuPriceHistory,
  createGpuPriceHistoryEntry,
  updateGpuPriceHistoryEntry,
  deleteGpuPriceHistoryEntry,
  createGPU,
  updateGPU,
  deleteGPU
};
