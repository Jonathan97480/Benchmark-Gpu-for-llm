const db = require('../../config/database');

const createBenchmarkResult = (req, res) => {
  try {
    const { gpu_id } = req.params;
    const {
      llm_model_id,
      gpu_count = 1,
      tokens_per_second,
      context_size,
      precision,
      inference_backend,
      measurement_type,
      vram_used_gb,
      ram_used_gb,
      kv_cache_precision,
      batch_size,
      concurrency,
      gpu_power_limit_watts,
      gpu_core_clock_mhz,
      gpu_memory_clock_mhz,
      notes
    } = req.body;

    const gpuExists = db.prepare('SELECT id FROM gpu_benchmarks WHERE id = ?').get(gpu_id);
    if (!gpuExists) {
      return res.status(404).json({ error: 'GPU not found' });
    }

    const modelExists = db.prepare('SELECT id FROM llm_models WHERE id = ?').get(llm_model_id);
    if (!modelExists) {
      return res.status(404).json({ error: 'LLM model not found' });
    }

    const result = db.prepare(`
      INSERT INTO benchmark_results (
        gpu_id,
        gpu_count,
        llm_model_id,
        tokens_per_second,
        context_size,
        precision,
        inference_backend,
        measurement_type,
        vram_used_gb,
        ram_used_gb,
        kv_cache_precision,
        batch_size,
        concurrency,
        gpu_power_limit_watts,
        gpu_core_clock_mhz,
        gpu_memory_clock_mhz,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      gpu_id,
      gpu_count,
      llm_model_id,
      tokens_per_second,
      context_size,
      precision,
      inference_backend,
      measurement_type,
      vram_used_gb,
      ram_used_gb,
      kv_cache_precision,
      batch_size,
      concurrency,
      gpu_power_limit_watts,
      gpu_core_clock_mhz,
      gpu_memory_clock_mhz,
      notes
    );

    const benchmark = db.prepare('SELECT * FROM benchmark_results WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Benchmark result created successfully',
      benchmark
    });
  } catch (error) {
    console.error('Error creating benchmark result:', error);
    res.status(500).json({ error: 'Failed to create benchmark result' });
  }
};

const updateBenchmarkResult = (req, res) => {
  try {
    const { gpu_id, result_id } = req.params;
    const {
      llm_model_id,
      gpu_count,
      tokens_per_second,
      context_size,
      precision,
      inference_backend,
      measurement_type,
      vram_used_gb,
      ram_used_gb,
      kv_cache_precision,
      batch_size,
      concurrency,
      gpu_power_limit_watts,
      gpu_core_clock_mhz,
      gpu_memory_clock_mhz,
      notes
    } = req.body;

    const existingResult = db.prepare(`
      SELECT * FROM benchmark_results WHERE id = ? AND gpu_id = ?
    `).get(result_id, gpu_id);

    if (!existingResult) {
      return res.status(404).json({ error: 'Benchmark result not found' });
    }

    if (llm_model_id) {
      const modelExists = db.prepare('SELECT id FROM llm_models WHERE id = ?').get(llm_model_id);
      if (!modelExists) {
        return res.status(404).json({ error: 'LLM model not found' });
      }
    }

    const updateFields = [];
    const params = [];

    if (llm_model_id !== undefined) { updateFields.push('llm_model_id = ?'); params.push(llm_model_id); }
    if (gpu_count !== undefined) { updateFields.push('gpu_count = ?'); params.push(gpu_count); }
    if (tokens_per_second !== undefined) { updateFields.push('tokens_per_second = ?'); params.push(tokens_per_second); }
    if (context_size !== undefined) { updateFields.push('context_size = ?'); params.push(context_size); }
    if (precision !== undefined) { updateFields.push('precision = ?'); params.push(precision); }
    if (inference_backend !== undefined) { updateFields.push('inference_backend = ?'); params.push(inference_backend); }
    if (measurement_type !== undefined) { updateFields.push('measurement_type = ?'); params.push(measurement_type); }
    if (vram_used_gb !== undefined) { updateFields.push('vram_used_gb = ?'); params.push(vram_used_gb); }
    if (ram_used_gb !== undefined) { updateFields.push('ram_used_gb = ?'); params.push(ram_used_gb); }
    if (kv_cache_precision !== undefined) { updateFields.push('kv_cache_precision = ?'); params.push(kv_cache_precision); }
    if (batch_size !== undefined) { updateFields.push('batch_size = ?'); params.push(batch_size); }
    if (concurrency !== undefined) { updateFields.push('concurrency = ?'); params.push(concurrency); }
    if (gpu_power_limit_watts !== undefined) { updateFields.push('gpu_power_limit_watts = ?'); params.push(gpu_power_limit_watts); }
    if (gpu_core_clock_mhz !== undefined) { updateFields.push('gpu_core_clock_mhz = ?'); params.push(gpu_core_clock_mhz); }
    if (gpu_memory_clock_mhz !== undefined) { updateFields.push('gpu_memory_clock_mhz = ?'); params.push(gpu_memory_clock_mhz); }
    if (notes !== undefined) { updateFields.push('notes = ?'); params.push(notes); }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(result_id);

    db.prepare(`
      UPDATE benchmark_results
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);

    const benchmark = db.prepare('SELECT * FROM benchmark_results WHERE id = ?').get(result_id);

    res.json({
      message: 'Benchmark result updated successfully',
      benchmark
    });
  } catch (error) {
    console.error('Error updating benchmark result:', error);
    res.status(500).json({ error: 'Failed to update benchmark result' });
  }
};

const deleteBenchmarkResult = (req, res) => {
  try {
    const { gpu_id, result_id } = req.params;

    const existingResult = db.prepare(`
      SELECT * FROM benchmark_results WHERE id = ? AND gpu_id = ?
    `).get(result_id, gpu_id);

    if (!existingResult) {
      return res.status(404).json({ error: 'Benchmark result not found' });
    }

    db.prepare('DELETE FROM benchmark_results WHERE id = ?').run(result_id);

    res.json({
      message: 'Benchmark result deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting benchmark result:', error);
    res.status(500).json({ error: 'Failed to delete benchmark result' });
  }
};

module.exports = {
  createBenchmarkResult,
  updateBenchmarkResult,
  deleteBenchmarkResult
};
