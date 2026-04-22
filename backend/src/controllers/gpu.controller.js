const db = require('../../config/database');

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
    res.status(500).json({ error: 'Failed to fetch GPUs' });
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
    res.status(500).json({ error: 'Failed to fetch public benchmark dataset' });
  }
};

const getGPUById = (req, res) => {
  try {
    const { id } = req.params;

    const gpu = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(id);

    if (!gpu) {
      return res.status(404).json({ error: 'GPU not found' });
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
    res.status(500).json({ error: 'Failed to fetch GPU' });
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

    res.status(201).json({
      message: 'GPU created successfully',
      gpu
    });
  } catch (error) {
    console.error('Error creating GPU:', error);
    res.status(500).json({ error: 'Failed to create GPU' });
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
      return res.status(404).json({ error: 'GPU not found' });
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
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`
      UPDATE gpu_benchmarks
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);

    const gpu = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(id);

    res.json({
      message: 'GPU updated successfully',
      gpu
    });
  } catch (error) {
    console.error('Error updating GPU:', error);
    res.status(500).json({ error: 'Failed to update GPU' });
  }
};

const deleteGPU = (req, res) => {
  try {
    const { id } = req.params;

    const existingGPU = db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(id);

    if (!existingGPU) {
      return res.status(404).json({ error: 'GPU not found' });
    }

    db.prepare('DELETE FROM gpu_benchmarks WHERE id = ?').run(id);

    res.json({
      message: 'GPU deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting GPU:', error);
    res.status(500).json({ error: 'Failed to delete GPU' });
  }
};

module.exports = {
  getAllGPUs,
  getPublicBenchmarkDataset,
  getGPUById,
  createGPU,
  updateGPU,
  deleteGPU
};
