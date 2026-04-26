const express = require('express');
const { estimateCalculator } = require('../controllers/calculator.controller');

const router = express.Router();

router.post('/estimate', estimateCalculator);

module.exports = router;
