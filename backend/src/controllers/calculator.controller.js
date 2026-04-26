const { computeCalculatorEstimate } = require('../services/calculator.service');

async function estimateCalculator(req, res, next) {
  try {
    const estimate = await computeCalculatorEstimate(req.body || {});
    res.json({ estimate });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  estimateCalculator,
};
