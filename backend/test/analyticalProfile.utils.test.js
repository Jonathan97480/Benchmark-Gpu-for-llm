const test = require('node:test');
const assert = require('node:assert/strict');
const { computeCalibrationFromBenchmarks } = require('../src/utils/analyticalProfile.utils');

test('computeCalibrationFromBenchmarks utilise les nouveaux champs benchmark quand ils sont disponibles', async () => {
  const model = {
    name: 'Unit Test 10B',
    params_billions: 10,
    total_params_billions: 10,
  };

  const benchmarks = [
    {
      gpu_id: 1,
      gpu_count: 1,
      bandwidth: 448,
      score: 72,
      vram: 8,
      precision: 'INT4',
      inference_backend: 'vLLM',
      measurement_type: 'decode',
      context_size: 4096,
      tokens_per_second: 42,
      vram_used_gb: 6.2,
      ram_used_gb: 1.0,
      kv_cache_precision: 'FP8',
      batch_size: 1,
      concurrency: 1,
    },
    {
      gpu_id: 1,
      gpu_count: 1,
      bandwidth: 448,
      score: 72,
      vram: 8,
      precision: 'INT4',
      inference_backend: 'vLLM',
      measurement_type: 'decode',
      context_size: 32768,
      tokens_per_second: 12,
      vram_used_gb: 7.4,
      ram_used_gb: 2.8,
      kv_cache_precision: 'FP8',
      batch_size: 1,
      concurrency: 1,
    },
    {
      gpu_id: 1,
      gpu_count: 1,
      bandwidth: 448,
      score: 72,
      vram: 8,
      precision: 'INT4',
      inference_backend: 'vLLM',
      measurement_type: 'prefill',
      context_size: 32768,
      tokens_per_second: 900,
      vram_used_gb: 7.1,
      ram_used_gb: 2.1,
      kv_cache_precision: 'FP8',
      batch_size: 16,
      concurrency: 4,
    },
  ];

  const calibration = await computeCalibrationFromBenchmarks(model, benchmarks);

  assert.deepEqual(calibration, {
    analytical_throughput_multiplier: 0.666,
    analytical_kv_cache_multiplier: 1.197,
    analytical_runtime_memory_multiplier: 0.5,
    analytical_runtime_memory_minimum: 0.73,
    analytical_context_penalty_multiplier: 0.5,
    analytical_context_penalty_floor: 0.45,
    analytical_offload_penalty_multiplier: null,
    benchmark_count: 2,
  });
});
