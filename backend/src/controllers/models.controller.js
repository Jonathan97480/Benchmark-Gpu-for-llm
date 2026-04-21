const db = require('../../config/database');

const getAllModels = (req, res) => {
  try {
    const models = db.prepare('SELECT * FROM llm_models ORDER BY params_billions ASC').all();

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
    const { name, params_billions, description } = req.body;

    const result = db.prepare(`
      INSERT INTO llm_models (name, params_billions, description)
      VALUES (?, ?, ?)
    `).run(name, params_billions, description);

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
    const { name, params_billions, description } = req.body;

    const existingModel = db.prepare('SELECT * FROM llm_models WHERE id = ?').get(id);

    if (!existingModel) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const updateFields = [];
    const params = [];

    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (params_billions !== undefined) { updateFields.push('params_billions = ?'); params.push(params_billions); }
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

module.exports = {
  getAllModels,
  getModelById,
  createModel,
  updateModel,
  deleteModel
};