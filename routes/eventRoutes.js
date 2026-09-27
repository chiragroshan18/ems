const express = require('express');
const router = express.Router();
const store = require('../data/store');
const {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  validateEvent,
  calculateEventReadiness
} = require('../utils/helpers');

// GET /api/events - List events with optional filtering & sorting
router.get('/', (req, res) => {
  let results = [...store.events];
  const { status, type, search, sortBy } = req.query;

  if (status) {
    results = results.filter(e => e.status.toLowerCase() === status.toLowerCase());
  }

  if (type) {
    results = results.filter(e => e.type.toLowerCase() === type.toLowerCase());
  }

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(e =>
      e.name.toLowerCase().includes(term) ||
      e.venue.toLowerCase().includes(term) ||
      e.organizer.toLowerCase().includes(term) ||
      e.type.toLowerCase().includes(term)
    );
  }

  if (sortBy === 'oldest') {
    results.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (sortBy === 'name') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Default newest
    results.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Attach readiness summary to each event
  const eventsWithReadiness = results.map(e => {
    const readiness = calculateEventReadiness(e.id);
    return {
      ...e,
      readinessScore: readiness ? readiness.readinessPercentage : 0
    };
  });

  return successResponse(res, eventsWithReadiness, 'Events retrieved successfully');
});

// GET /api/events/:id - Get specific event with its readiness breakdown
router.get('/:id', (req, res) => {
  const event = findEvent(req.params.id);
  if (!event) {
    return errorResponse(res, `Event with ID '${req.params.id}' not found`, 404);
  }
  const readiness = calculateEventReadiness(event.id);
  return successResponse(res, { ...event, readiness }, 'Event details retrieved successfully');
});

// POST /api/events - Create new event
router.post('/', (req, res) => {
  const validationErrors = validateEvent(req.body, false);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for event creation', 400, validationErrors);
  }

  const {
    name,
    type,
    description,
    venue,
    date,
    startTime,
    endTime,
    organizer,
    expectedParticipants,
    plannedBudget,
    status
  } = req.body;

  const newEvent = {
    id: generateId('EVT', store.events),
    name: name.trim(),
    type,
    description: description ? description.trim() : '',
    venue: venue.trim(),
    date,
    startTime: startTime || '09:00',
    endTime: endTime || '17:00',
    organizer: organizer.trim(),
    expectedParticipants: expectedParticipants ? Number(expectedParticipants) : 0,
    plannedBudget: plannedBudget ? Number(plannedBudget) : 0,
    status: status || 'Planning'
  };

  store.events.push(newEvent);
  return successResponse(res, newEvent, 'Event created successfully', 201);
});

// PATCH /api/events/:id - Update existing event
router.patch('/:id', (req, res) => {
  const eventIndex = store.events.findIndex(e => e.id === req.params.id);
  if (eventIndex === -1) {
    return errorResponse(res, `Event with ID '${req.params.id}' not found`, 404);
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return errorResponse(res, 'Request body cannot be empty for updates', 400);
  }

  const validationErrors = validateEvent(req.body, true);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for event update', 400, validationErrors);
  }

  const current = store.events[eventIndex];
  const updated = {
    ...current,
    name: req.body.name !== undefined ? req.body.name.trim() : current.name,
    type: req.body.type !== undefined ? req.body.type : current.type,
    description: req.body.description !== undefined ? req.body.description.trim() : current.description,
    venue: req.body.venue !== undefined ? req.body.venue.trim() : current.venue,
    date: req.body.date !== undefined ? req.body.date : current.date,
    startTime: req.body.startTime !== undefined ? req.body.startTime : current.startTime,
    endTime: req.body.endTime !== undefined ? req.body.endTime : current.endTime,
    organizer: req.body.organizer !== undefined ? req.body.organizer.trim() : current.organizer,
    expectedParticipants: req.body.expectedParticipants !== undefined ? Number(req.body.expectedParticipants) : current.expectedParticipants,
    plannedBudget: req.body.plannedBudget !== undefined ? Number(req.body.plannedBudget) : current.plannedBudget,
    status: req.body.status !== undefined ? req.body.status : current.status
  };

  store.events[eventIndex] = updated;
  return successResponse(res, updated, 'Event updated successfully');
});

// DELETE /api/events/:id - Delete event and cascade cleanup its child resources
router.delete('/:id', (req, res) => {
  const eventIndex = store.events.findIndex(e => e.id === req.params.id);
  if (eventIndex === -1) {
    return errorResponse(res, `Event with ID '${req.params.id}' not found`, 404);
  }

  const deletedEvent = store.events.splice(eventIndex, 1)[0];

  // Cascading cleanup of child resources
  store.schedule = store.schedule.filter(s => s.eventId !== req.params.id);
  store.team = store.team.filter(t => t.eventId !== req.params.id);
  store.tasks = store.tasks.filter(t => t.eventId !== req.params.id);
  store.budget = store.budget.filter(b => b.eventId !== req.params.id);
  store.guests = store.guests.filter(g => g.eventId !== req.params.id);
  store.announcements = store.announcements.filter(a => a.eventId !== req.params.id);

  return successResponse(res, deletedEvent, 'Event and associated resources deleted successfully');
});

module.exports = router;
