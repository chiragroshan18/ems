const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../data/store');
const {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  findGuest,
  validateGuest
} = require('../utils/helpers');

// GET guests/speakers
router.get('/', (req, res) => {
  const eventId = req.params.eventId || req.query.eventId;
  let results = [...store.guests];

  if (eventId) {
    if (!findEvent(eventId)) {
      return errorResponse(res, `Event with ID '${eventId}' not found`, 404);
    }
    results = results.filter(g => g.eventId === eventId);
  }

  if (req.query.status) {
    results = results.filter(g => g.confirmationStatus.toLowerCase() === req.query.status.toLowerCase());
  }
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter(g =>
      g.name.toLowerCase().includes(term) ||
      (g.organization && g.organization.toLowerCase().includes(term)) ||
      (g.topic && g.topic.toLowerCase().includes(term)) ||
      (g.designation && g.designation.toLowerCase().includes(term))
    );
  }

  const enriched = results.map(g => {
    const parentEvent = store.events.find(e => e.id === g.eventId);
    const sessionObj = store.schedule.find(s => s.id === g.session || s.title.toLowerCase().includes(g.topic ? g.topic.toLowerCase() : ''));
    return {
      ...g,
      eventName: parentEvent ? parentEvent.name : 'Unknown Event',
      sessionTitle: sessionObj ? sessionObj.title : (g.session || 'General Session')
    };
  });

  return successResponse(res, enriched, 'Guests & speakers retrieved successfully');
});

// GET single guest
router.get('/:id', (req, res) => {
  const guest = findGuest(req.params.id);
  if (!guest) {
    return errorResponse(res, `Guest/Speaker with ID '${req.params.id}' not found`, 404);
  }
  const parentEvent = store.events.find(e => e.id === guest.eventId);
  return successResponse(res, {
    ...guest,
    eventName: parentEvent ? parentEvent.name : 'Unknown Event'
  }, 'Guest retrieved successfully');
});

// POST new guest
router.post('/', (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  if (!eventId) {
    return errorResponse(res, 'Event ID is required to register a guest/speaker', 400);
  }

  const parentEvent = findEvent(eventId);
  if (!parentEvent) {
    return errorResponse(res, `Event with ID '${eventId}' does not exist`, 404);
  }

  const validationErrors = validateGuest(req.body, false);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for guest/speaker', 400, validationErrors);
  }

  const { name, designation, organization, topic, session, contact, confirmationStatus } = req.body;

  const newGuest = {
    id: generateId('GST', store.guests),
    eventId,
    name: name.trim(),
    designation: designation ? designation.trim() : 'Honored Guest',
    organization: organization ? organization.trim() : 'Independent',
    topic: topic ? topic.trim() : 'Keynote Address',
    session: session ? session.trim() : 'Plenary Session',
    contact: contact ? contact.trim() : '',
    confirmationStatus: confirmationStatus || 'Pending'
  };

  store.guests.push(newGuest);
  return successResponse(res, newGuest, 'Guest/Speaker registered successfully', 201);
});

// PATCH guest
router.patch('/:id', (req, res) => {
  const index = store.guests.findIndex(g => g.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Guest with ID '${req.params.id}' not found`, 404);
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return errorResponse(res, 'Request body cannot be empty', 400);
  }

  const validationErrors = validateGuest(req.body, true);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for guest update', 400, validationErrors);
  }

  const current = store.guests[index];
  const updated = {
    ...current,
    name: req.body.name !== undefined ? req.body.name.trim() : current.name,
    designation: req.body.designation !== undefined ? req.body.designation.trim() : current.designation,
    organization: req.body.organization !== undefined ? req.body.organization.trim() : current.organization,
    topic: req.body.topic !== undefined ? req.body.topic.trim() : current.topic,
    session: req.body.session !== undefined ? req.body.session.trim() : current.session,
    contact: req.body.contact !== undefined ? req.body.contact.trim() : current.contact,
    confirmationStatus: req.body.confirmationStatus !== undefined ? req.body.confirmationStatus : current.confirmationStatus
  };

  store.guests[index] = updated;
  return successResponse(res, updated, 'Guest/Speaker updated successfully');
});

// DELETE guest
router.delete('/:id', (req, res) => {
  const index = store.guests.findIndex(g => g.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Guest with ID '${req.params.id}' not found`, 404);
  }

  const deleted = store.guests.splice(index, 1)[0];
  return successResponse(res, deleted, 'Guest/Speaker deleted successfully');
});

module.exports = router;
