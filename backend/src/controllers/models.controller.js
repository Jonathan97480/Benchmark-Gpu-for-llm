const db = require('../../config/database');
const { computeCalibrationFromBenchmarks } = require('../utils/analyticalProfile.utils');

const MODEL_ANALYTICAL_COLUMNS = [
  'analytical_kv_cache_multiplier',
  'analytical_runtime_memory_multiplier',
  'analytical_runtime_memory_minimum',
  'analytical_context_penalty_multiplier',
  'analytical_context_penalty_floor',
  'analytical_offload_penalty_multiplier',
  'analytical_throughput_multiplier',
];

const getAllModels = (req, res) => {
  try {
    const models = db.prepare('SELECT * FROM llm_models ORDER BY params_billions ASC, total_params_billions ASC, name ASC').all();

    res.json({
      models,
      total: models.length
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch LLM models' });
  }
};

const getModelById = (req, res) => {
  try {
    const { id } = req.params;

    const model = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(id);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const benchmarks = db.prepare(`
      SELECT br.*, g.name as gpu_name, g.vendor
      FROM benchmark_results br
      JOIN gpu_benchmarks g ON g.id = br.gpu_id
      WHERE br.llm_model_id = ?
      ORDER BY br.tokens_per_second DESC
    `).all(id);

    res.json({
      ...model,
      benchmarks
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ error: 'Failed to fetch LLM model' });
  }
};

const createModel = (req, res) => {
  try {
    const {
      name,
      params_billions,
      total_params_billions,
      max_context_size,
      analytical_kv_cache_multiplier,
      analytical_runtime_memory_multiplier,
      analytical_runtime_memory_minimum,
      analytical_context_penalty_multiplier,
      analytical_context_penalty_floor,
      analytical_offload_penalty_multiplier,
      analytical_throughput_multiplier,
      description,
    } = req.body;

    const result = db.prepare(`
      INSERT INTO llm_models (
        name,
        params_billions,
        total_params_billions,
        max_context_size,
        analytical_kv_cache_multiplier,
        analytical_runtime_memory_multiplier,
        analytical_runtime_memory_minimum,
        analytical_context_penalty_multiplier,
        analytical_context_penalty_floor,
        analytical_offload_penalty_multiplier,
        analytical_throughput_multiplier,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      params_billions,
      total_params_billions,
      max_context_size,
      analytical_kv_cache_multiplier,
      analytical_runtime_memory_multiplier,
      analytical_runtime_memory_minimum,
      analytical_context_penalty_multiplier,
      analytical_context_penalty_floor,
      analytical_offload_penalty_multiplier,
      analytical_throughput_multiplier,
      description
    );

    const model = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'LLM model created successfully',
      model
    });
  } catch (error) {
    console.error('Error creating model:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Model name already exists' });
    }
    res.status(500).json({ error: 'Failed to create LLM model' });
  }
};

const updateModel = (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      params_billions,
      total_params_billions,
      max_context_size,
      analytical_kv_cache_multiplier,
      analytical_runtime_memory_multiplier,
      analytical_runtime_memory_minimum,
      analytical_context_penalty_multiplier,
      analytical_context_penalty_floor,
      analytical_offload_penalty_multiplier,
      analytical_throughput_multiplier,
      description,
    } = req.body;

    const existingModel = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(id);

    if (!existingModel) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const updateFields = [];
    const params = [];

    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (params_billions !== undefined) { updateFields.push('params_billions = ?'); params.push(params_billions); }
    if (total_params_billions !== undefined) { updateFields.push('total_params_billions = ?'); params.push(total_params_billions); }
    if (max_context_size !== undefined) { updateFields.push('max_context_size = ?'); params.push(max_context_size); }
    if (analytical_kv_cache_multiplier !== undefined) { updateFields.push('analytical_kv_cache_multiplier = ?'); params.push(analytical_kv_cache_multiplier); }
    if (analytical_runtime_memory_multiplier !== undefined) { updateFields.push('analytical_runtime_memory_multiplier = ?'); params.push(analytical_runtime_memory_multiplier); }
    if (analytical_runtime_memory_minimum !== undefined) { updateFields.push('analytical_runtime_memory_minimum = ?'); params.push(analytical_runtime_memory_minimum); }
    if (analytical_context_penalty_multiplier !== undefined) { updateFields.push('analytical_context_penalty_multiplier = ?'); params.push(analytical_context_penalty_multiplier); }
    if (analytical_context_penalty_floor !== undefined) { updateFields.push('analytical_context_penalty_floor = ?'); params.push(analytical_context_penalty_floor); }
    if (analytical_offload_penalty_multiplier !== undefined) { updateFields.push('analytical_offload_penalty_multiplier = ?'); params.push(analytical_offload_penalty_multiplier); }
    if (analytical_throughput_multiplier !== undefined) { updateFields.push('analytical_throughput_multiplier = ?'); params.push(analytical_throughput_multiplier); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    db.prepare(`
      UPDATE llm_models
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);

    const model = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(id);

    res.json({
      message: 'LLM model updated successfully',
      model
    });
  } catch (error) {
    console.error('Error updating model:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Model name already exists' });
    }
    res.status(500).json({ error: 'Failed to update LLM model' });
  }
};

const deleteModel = (req, res) => {
  try {
    const { id } = req.params;

    const existingModel = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(id);

    if (!existingModel) {
      return res.status(404).json({ error: 'Model not found' });
    }

    db.prepare('DELETE FROM llm_models WHERE id = ?').run(id);

    res.json({
      message: 'LLM model deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete LLM model' });
  }
};

const recomputeModelAnalyticalProfile = (req, res) => {
  try {
    const { id } = req.params;

    const model = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(id);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const benchmarks = db.prepare(`
      SELECT
        br.*,
        g.vram,
        g.bandwidth,
        g.score
      FROM benchmark_results br
      JOIN gpu_benchmarks g ON g.id = br.gpu_id
      WHERE br.llm_model_id = ?
        AND br.tokens_per_second > 0
    `).all(id);

    if (benchmarks.length === 0) {
      return res.status(400).json({ error: 'No benchmark available for this model' });
    }

    const calibration = computeCalibrationFromBenchmarks(model, benchmarks);

    if (!calibration) {
      return res.status(400).json({ error: 'Unable to derive analytical coefficient from available benchmarks' });
    }

    const updateFields = [];
    const updateValues = [];

    for (const column of MODEL_ANALYTICAL_COLUMNS) {
      if (calibration[column] !== undefined && calibration[column] !== null) {
        updateFields.push(`${column} = ?`);
        updateValues.push(calibration[column]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Unable to derive analytical coefficient from available benchmarks' });
    }

    updateValues.push(id);

    db.prepare(`
      UPDATE llm_models
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues);

    const updatedModel = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(id);

    res.json({
      message: 'Analytical coefficient recomputed successfully',
      model: updatedModel,
      calibration,
    });
  } catch (error) {
    console.error('Error recomputing model analytical profile:', error);
    res.status(500).json({ error: 'Failed to recompute analytical coefficient' });
  }
};

module.exports = {
  getAllModels,
  getModelById,
  createModel,
  updateModel,
  deleteModel,
  recomputeModelAnalyticalProfile,
};
