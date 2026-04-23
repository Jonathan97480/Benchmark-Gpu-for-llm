const Joi = require('joi');

const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.ref('password')
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  if (req.body.password !== req.body.confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const { validatePassword } = require('../utils/password.utils');
  const passwordValidation = validatePassword(req.body.password);

  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.message });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

const validateGPU = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    vendor: Joi.string().valid('NVIDIA', 'AMD', 'Intel').required(),
    architecture: Joi.string().required(),
    vram: Joi.number().integer().min(1).required(),
    bandwidth: Joi.number().integer().min(0).required(),
    price: Joi.string().allow('', null),
    price_value: Joi.number().integer().min(0).default(0),
    price_new_value: Joi.number().integer().min(0).default(0),
    price_used_value: Joi.number().integer().min(0).default(0),
    tier: Joi.string().valid('budget', 'prosumer', 'enterprise').required(),
    score: Joi.number().integer().min(0).max(100).required(),
    tokens_8b: Joi.number().min(0).default(0),
    tokens_32b: Joi.number().min(0).default(0),
    tokens_70b: Joi.number().min(0).default(0)
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

const validateLLMModel = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    params_billions: Joi.number().integer().min(1),
    total_params_billions: Joi.number().integer().min(1).allow(null),
    max_context_size: Joi.number().integer().min(1).allow(null),
    analytical_kv_cache_multiplier: Joi.number().positive().allow(null),
    analytical_runtime_memory_multiplier: Joi.number().positive().allow(null),
    analytical_runtime_memory_minimum: Joi.number().positive().allow(null),
    analytical_context_penalty_multiplier: Joi.number().positive().allow(null),
    analytical_context_penalty_floor: Joi.number().positive().max(1).allow(null),
    analytical_offload_penalty_multiplier: Joi.number().positive().allow(null),
    analytical_throughput_multiplier: Joi.number().positive().allow(null),
    description: Joi.string().allow('', null)
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

const validateBenchmarkResult = (req, res, next) => {
  const schema = Joi.object({
    llm_model_id: Joi.number().integer().required(),
    gpu_count: Joi.number().integer().min(1).default(1),
    tokens_per_second: Joi.number().min(0).required(),
    context_size: Joi.number().integer().min(1).allow(null),
    precision: Joi.string().allow('', null),
    inference_backend: Joi.string().valid('llama.cpp', 'Ollama', 'vLLM', 'exllamav2', 'tabbyAPI', 'SGLang', 'Autre').allow('', null),
    measurement_type: Joi.string().valid('decode', 'prefill', 'mixed').allow('', null),
    vram_used_gb: Joi.number().min(0).allow(null),
    ram_used_gb: Joi.number().min(0).allow(null),
    kv_cache_precision: Joi.string().valid('FP16', 'FP8', 'INT8', 'INT4', 'Non spécifié').allow('', null),
    batch_size: Joi.number().integer().min(1).allow(null),
    concurrency: Joi.number().integer().min(1).allow(null),
    gpu_power_limit_watts: Joi.number().integer().min(1).allow(null),
    gpu_core_clock_mhz: Joi.number().integer().min(1).allow(null),
    gpu_memory_clock_mhz: Joi.number().integer().min(1).allow(null),
    notes: Joi.string().allow('', null)
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

const validateApiKeyCreate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).required()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateGPU,
  validateLLMModel,
  validateBenchmarkResult,
  validateApiKeyCreate
};
