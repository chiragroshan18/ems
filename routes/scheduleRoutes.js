const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../data/store');
const {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  findSchedule,
  validateSchedule
} = require('../utils/helpers');

// GET schedule (can be scoped by eventId via mergeParams or query)
router.get('/', (req, res) => {
  const eventId = req.params.eventId || req.query.eventId;
  let results = [...store.schedule];

  if (eventId) {
    if (!findEvent(eventId)) {
      return errorResponse(res, `Event with ID '${eventId}' not found`, 404);
    }
    results = results.filter(s => s.eventId === eventId);
  }

  // Optional filters
  if (req.query.status) {
    results = results.filter(s => s.status.toLowerCase() === req.query.status.toLowerCase());
  }
  if (req.query.speaker) {
    const sp = req.query.speaker.toLowerCase();
    results = results.filter(s => s.speaker && s.speaker.toLowerCase().includes(sp));
  }
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter(s =>
      s.title.toLowerCase().includes(term) ||
      (s.venue && s.venue.toLowerCase().includes(term)) ||
      (s.speaker && s.speaker.toLowerCase().includes(term))
    );
  }

  // Sort by date then startTime
  results.sort((a, b) => {
    const timeA = `${a.date}T${a.startTime}`;
    const timeB = `${b.date}T${b.startTime}`;
    return timeA.localeCompare(timeB);
  });

  const enriched = results.map(s => {
    const parentEvent = store.events.find(e => e.id === s.eventId);
    return {
      ...s,
      eventName: parentEvent ? parentEvent.name : 'Unknown Event'
    };
  });

  return successResponse(res, enriched, 'Schedule sessions retrieved successfully');
});

// GET single session by ID
router.get('/:id', (req, res) => {
  const session = findSchedule(req.params.id);
  if (!session) {
    return errorResponse(res, `Schedule session with ID '${req.params.id}' not found`, 404);
  }
  const parentEvent = store.events.find(e => e.id === session.eventId);
  return successResponse(res, {
    ...session,
    eventName: parentEvent ? parentEvent.name : 'Unknown Event'
  }, 'Session retrieved successfully');
});

// POST new session
router.post('/', (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  if (!eventId) {
    return errorResponse(res, 'Event ID is required to schedule a session', 400);
  }

  const parentEvent = findEvent(eventId);
  if (!parentEvent) {
    return errorResponse(res, `Event with ID '${eventId}' does not exist`, 404);
  }

  const validationErrors = validateSchedule(req.body, false);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for schedule session', 400, validationErrors);
  }

  const { title, date, startTime, endTime, venue, speaker, description, status } = req.body;

  const newSession = {
    id: generateId('SCH', store.schedule),
    eventId,
    title: title.trim(),
    date: date || parentEvent.date,
    startTime,
    endTime,
    venue: venue ? venue.trim() : parentEvent.venue,
    speaker: speaker ? speaker.trim() : 'TBD',
    description: description ? description.trim() : '',
    status: status || 'Scheduled'
  };

  store.schedule.push(newSession);
  return successResponse(res, newSession, 'Session scheduled successfully', 201);
});

// PATCH session
router.patch('/:id', (req, res) => {
  const index = store.schedule.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Schedule session with ID '${req.params.id}' not found`, 404);
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return errorResponse(res, 'Request body cannot be empty', 400);
  }

  const validationErrors = validateSchedule(req.body, true);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for schedule update', 400, validationErrors);
  }

  const current = store.schedule[index];
  const updated = {
    ...current,
    title: req.body.title !== undefined ? req.body.title.trim() : current.title,
    date: req.body.date !== undefined ? req.body.date : current.date,
    startTime: req.body.startTime !== undefined ? req.body.startTime : current.startTime,
    endTime: req.body.endTime !== undefined ? req.body.endTime : current.endTime,
    venue: req.body.venue !== undefined ? req.body.venue.trim() : current.venue,
    speaker: req.body.speaker !== undefined ? req.body.speaker.trim() : current.speaker,
    description: req.body.description !== undefined ? req.body.description.trim() : current.description,
    status: req.body.status !== undefined ? req.body.status : current.status
  };

  store.schedule[index] = updated;
  return successResponse(res, updated, 'Session updated successfully');
});

// DELETE session
router.delete('/:id', (req, res) => {
  const index = store.schedule.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Schedule session with ID '${req.params.id}' not found`, 404);
  }

  const deleted = store.schedule.splice(index, 1)[0];
  return successResponse(res, deleted, 'Session deleted successfully');
});

module.exports = router;
