const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { successResponse, buildDashboard } = require('../utils/helpers');

// POST /api/data/clear - Empty active dataset to prove dynamic data binding
router.post('/clear', (req, res) => {
  store.clear();
  const dashboard = buildDashboard();
  return successResponse(res, dashboard, 'All application data cleared successfully (0 records)');
});

// POST /api/data/restore - Restore realistic fictional sample data
router.post('/restore', (req, res) => {
  store.restore();
  const dashboard = buildDashboard();
  return successResponse(res, dashboard, 'Realistic sample data restored successfully');
});

module.exports = router;
