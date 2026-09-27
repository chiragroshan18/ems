const express = require('express');
const router = express.Router();
const { successResponse, buildDashboard } = require('../utils/helpers');

// GET /api/dashboard - Aggregated command center statistics
router.get('/', (req, res) => {
  const dashboardData = buildDashboard();
  return successResponse(res, dashboardData, 'Dashboard statistics aggregated successfully');
});

module.exports = router;
