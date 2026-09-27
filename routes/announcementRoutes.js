const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../data/store');
const {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  findAnnouncement,
  validateAnnouncement
} = require('../utils/helpers');

// GET announcements
router.get('/', (req, res) => {
  const eventId = req.params.eventId || req.query.eventId;
  let results = [...store.announcements];

  if (eventId) {
    if (!findEvent(eventId)) {
      return errorResponse(res, `Event with ID '${eventId}' not found`, 404);
    }
    results = results.filter(a => a.eventId === eventId);
  }

  if (req.query.priority) {
    results = results.filter(a => a.priority.toLowerCase() === req.query.priority.toLowerCase());
  }
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter(a =>
      a.title.toLowerCase().includes(term) ||
      a.message.toLowerCase().includes(term)
    );
  }

  // Sort by timestamp descending (newest first)
  results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const enriched = results.map(a => {
    const parentEvent = store.events.find(e => e.id === a.eventId);
    return {
      ...a,
      eventName: parentEvent ? parentEvent.name : 'All Events'
    };
  });

  return successResponse(res, enriched, 'Announcements retrieved successfully');
});

// GET single announcement
router.get('/:id', (req, res) => {
  const item = findAnnouncement(req.params.id);
  if (!item) {
    return errorResponse(res, `Announcement with ID '${req.params.id}' not found`, 404);
  }
  const parentEvent = store.events.find(e => e.id === item.eventId);
  return successResponse(res, {
    ...item,
    eventName: parentEvent ? parentEvent.name : 'All Events'
  }, 'Announcement retrieved successfully');
});

// POST new announcement
router.post('/', (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  if (!eventId) {
    return errorResponse(res, 'Event ID is required to publish an announcement', 400);
  }

  const parentEvent = findEvent(eventId);
  if (!parentEvent) {
    return errorResponse(res, `Event with ID '${eventId}' does not exist`, 404);
  }

  const validationErrors = validateAnnouncement(req.body, false);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for announcement', 400, validationErrors);
  }

  const { title, message, priority, status } = req.body;

  const newAnnouncement = {
    id: generateId('ANN', store.announcements),
    eventId,
    title: title.trim(),
    message: message.trim(),
    priority: priority || 'Normal',
    timestamp: new Date().toISOString(),
    status: status || 'Published'
  };

  store.announcements.push(newAnnouncement);
  return successResponse(res, newAnnouncement, 'Announcement published successfully', 201);
});

// PATCH announcement
router.patch('/:id', (req, res) => {
  const index = store.announcements.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Announcement with ID '${req.params.id}' not found`, 404);
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return errorResponse(res, 'Request body cannot be empty', 400);
  }

  const validationErrors = validateAnnouncement(req.body, true);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for announcement update', 400, validationErrors);
  }

  const current = store.announcements[index];
  const updated = {
    ...current,
    title: req.body.title !== undefined ? req.body.title.trim() : current.title,
    message: req.body.message !== undefined ? req.body.message.trim() : current.message,
    priority: req.body.priority !== undefined ? req.body.priority : current.priority,
    status: req.body.status !== undefined ? req.body.status : current.status
  };

  store.announcements[index] = updated;
  return successResponse(res, updated, 'Announcement updated successfully');
});

// DELETE announcement
router.delete('/:id', (req, res) => {
  const index = store.announcements.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Announcement with ID '${req.params.id}' not found`, 404);
  }

  const deleted = store.announcements.splice(index, 1)[0];
  return successResponse(res, deleted, 'Announcement deleted successfully');
});

module.exports = router;
