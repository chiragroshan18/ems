const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  successResponse,
  errorResponse,
  findEvent,
  calculateEventAnalytics
} = require('../utils/helpers');

// GET /api/events/:eventId/analytics
router.get('/:eventId/analytics', (req, res) => {
  const event = findEvent(req.params.eventId);
  if (!event) {
    return errorResponse(res, `Event with ID '${req.params.eventId}' not found`, 404);
  }

  const analytics = calculateEventAnalytics(req.params.eventId);
  return successResponse(res, analytics, 'Event analytics generated successfully');
});

module.exports = router;
