const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../data/store');
const {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  findTeamMember,
  validateTeam
} = require('../utils/helpers');

// GET team members
router.get('/', (req, res) => {
  const eventId = req.params.eventId || req.query.eventId;
  let results = [...store.team];

  if (eventId) {
    if (!findEvent(eventId)) {
      return errorResponse(res, `Event with ID '${eventId}' not found`, 404);
    }
    results = results.filter(t => t.eventId === eventId);
  }

  if (req.query.role) {
    results = results.filter(t => t.role.toLowerCase() === req.query.role.toLowerCase());
  }
  if (req.query.status) {
    results = results.filter(t => t.status.toLowerCase() === req.query.status.toLowerCase());
  }
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.role.toLowerCase().includes(term) ||
      (t.department && t.department.toLowerCase().includes(term))
    );
  }

  const enriched = results.map(t => {
    const parentEvent = store.events.find(e => e.id === t.eventId);
    const assignedTasks = store.tasks.filter(tsk => tsk.assignedMember && tsk.assignedMember.toLowerCase() === t.name.toLowerCase());
    return {
      ...t,
      eventName: parentEvent ? parentEvent.name : 'Unknown Event',
      tasksCount: assignedTasks.length
    };
  });

  return successResponse(res, enriched, 'Team members retrieved successfully');
});

// GET single team member
router.get('/:id', (req, res) => {
  const member = findTeamMember(req.params.id);
  if (!member) {
    return errorResponse(res, `Team member with ID '${req.params.id}' not found`, 404);
  }
  const parentEvent = store.events.find(e => e.id === member.eventId);
  const assignedTasks = store.tasks.filter(tsk => tsk.assignedMember && tsk.assignedMember.toLowerCase() === member.name.toLowerCase());

  return successResponse(res, {
    ...member,
    eventName: parentEvent ? parentEvent.name : 'Unknown Event',
    tasks: assignedTasks
  }, 'Team member retrieved successfully');
});

// POST new team member
router.post('/', (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  if (!eventId) {
    return errorResponse(res, 'Event ID is required to add a team member', 400);
  }

  const parentEvent = findEvent(eventId);
  if (!parentEvent) {
    return errorResponse(res, `Event with ID '${eventId}' does not exist`, 404);
  }

  const validationErrors = validateTeam(req.body, false);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for team member', 400, validationErrors);
  }

  const { name, role, department, contact, status } = req.body;

  const newMember = {
    id: generateId('TM', store.team),
    eventId,
    name: name.trim(),
    role,
    department: department ? department.trim() : 'Operations',
    contact: contact ? contact.trim() : '',
    status: status || 'Assigned'
  };

  store.team.push(newMember);
  return successResponse(res, newMember, 'Team member added successfully', 201);
});

// PATCH team member
router.patch('/:id', (req, res) => {
  const index = store.team.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Team member with ID '${req.params.id}' not found`, 404);
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return errorResponse(res, 'Request body cannot be empty', 400);
  }

  const validationErrors = validateTeam(req.body, true);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for team update', 400, validationErrors);
  }

  const current = store.team[index];
  const oldName = current.name;
  const newName = req.body.name !== undefined ? req.body.name.trim() : oldName;

  const updated = {
    ...current,
    name: newName,
    role: req.body.role !== undefined ? req.body.role : current.role,
    department: req.body.department !== undefined ? req.body.department.trim() : current.department,
    contact: req.body.contact !== undefined ? req.body.contact.trim() : current.contact,
    status: req.body.status !== undefined ? req.body.status : current.status
  };

  // If member name changed, update tasks assigned to old name
  if (oldName !== newName) {
    store.tasks.forEach(tsk => {
      if (tsk.assignedMember === oldName) {
        tsk.assignedMember = newName;
      }
    });
  }

  store.team[index] = updated;
  return successResponse(res, updated, 'Team member updated successfully');
});

// DELETE team member
router.delete('/:id', (req, res) => {
  const index = store.team.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Team member with ID '${req.params.id}' not found`, 404);
  }

  const deleted = store.team.splice(index, 1)[0];
  return successResponse(res, deleted, 'Team member deleted successfully');
});

module.exports = router;
