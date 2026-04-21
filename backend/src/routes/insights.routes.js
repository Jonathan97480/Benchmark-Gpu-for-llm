const express = require('express');
const router = express.Router();
const { getAllInsights } = require('../controllers/insights.controller');

router.get('/', getAllInsights);

module.exports = router;