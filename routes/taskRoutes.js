const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../data/store');
const {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  findTask,
  validateTask,
  calculateTaskProgress
} = require('../utils/helpers');

// GET tasks
router.get('/', (req, res) => {
  const eventId = req.params.eventId || req.query.eventId;
  let results = [...store.tasks];

  if (eventId) {
    if (!findEvent(eventId)) {
      return errorResponse(res, `Event with ID '${eventId}' not found`, 404);
    }
    results = results.filter(t => t.eventId === eventId);
  }

  if (req.query.status) {
    results = results.filter(t => t.status.toLowerCase() === req.query.status.toLowerCase());
  }
  if (req.query.priority) {
    results = results.filter(t => t.priority.toLowerCase() === req.query.priority.toLowerCase());
  }
  if (req.query.category) {
    results = results.filter(t => t.category.toLowerCase() === req.query.category.toLowerCase());
  }
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter(t =>
      t.taskName.toLowerCase().includes(term) ||
      (t.assignedMember && t.assignedMember.toLowerCase().includes(term)) ||
      (t.category && t.category.toLowerCase().includes(term)) ||
      (t.notes && t.notes.toLowerCase().includes(term))
    );
  }

  // Sorting
  if (req.query.sortBy === 'deadline') {
    results.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  } else if (req.query.sortBy === 'priority') {
    const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    results.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
  }

  const enriched = results.map(t => {
    const parentEvent = store.events.find(e => e.id === t.eventId);
    return {
      ...t,
      eventName: parentEvent ? parentEvent.name : 'Unknown Event'
    };
  });

  const progress = calculateTaskProgress(results);

  return successResponse(res, {
    tasks: enriched,
    total: enriched.length,
    completed: enriched.filter(t => t.status === 'Completed').length,
    pending: enriched.filter(t => t.status === 'Pending').length,
    inProgress: enriched.filter(t => t.status === 'In Progress').length,
    progressPercentage: progress
  }, 'Tasks retrieved successfully');
});

// GET single task
router.get('/:id', (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return errorResponse(res, `Task with ID '${req.params.id}' not found`, 404);
  }
  const parentEvent = store.events.find(e => e.id === task.eventId);
  return successResponse(res, {
    ...task,
    eventName: parentEvent ? parentEvent.name : 'Unknown Event'
  }, 'Task retrieved successfully');
});

// POST new task
router.post('/', (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  if (!eventId) {
    return errorResponse(res, 'Event ID is required to create a task', 400);
  }

  const parentEvent = findEvent(eventId);
  if (!parentEvent) {
    return errorResponse(res, `Event with ID '${eventId}' does not exist`, 404);
  }

  const validationErrors = validateTask(req.body, false);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for task', 400, validationErrors);
  }

  const { taskName, category, assignedMember, priority, deadline, status, notes } = req.body;

  const newTask = {
    id: generateId('TSK', store.tasks),
    eventId,
    taskName: taskName.trim(),
    category: category ? category.trim() : 'Operations',
    assignedMember: assignedMember ? assignedMember.trim() : 'Unassigned',
    priority: priority || 'Medium',
    deadline: deadline || parentEvent.date,
    status: status || 'Pending',
    notes: notes ? notes.trim() : ''
  };

  store.tasks.push(newTask);
  return successResponse(res, newTask, 'Task created successfully', 201);
});

// PATCH task
router.patch('/:id', (req, res) => {
  const index = store.tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Task with ID '${req.params.id}' not found`, 404);
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return errorResponse(res, 'Request body cannot be empty', 400);
  }

  const validationErrors = validateTask(req.body, true);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for task update', 400, validationErrors);
  }

  const current = store.tasks[index];
  const updated = {
    ...current,
    taskName: req.body.taskName !== undefined ? req.body.taskName.trim() : current.taskName,
    category: req.body.category !== undefined ? req.body.category.trim() : current.category,
    assignedMember: req.body.assignedMember !== undefined ? req.body.assignedMember.trim() : current.assignedMember,
    priority: req.body.priority !== undefined ? req.body.priority : current.priority,
    deadline: req.body.deadline !== undefined ? req.body.deadline : current.deadline,
    status: req.body.status !== undefined ? req.body.status : current.status,
    notes: req.body.notes !== undefined ? req.body.notes.trim() : current.notes
  };

  store.tasks[index] = updated;
  return successResponse(res, updated, 'Task updated successfully');
});

// DELETE task
router.delete('/:id', (req, res) => {
  const index = store.tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Task with ID '${req.params.id}' not found`, 404);
  }

  const deleted = store.tasks.splice(index, 1)[0];
  return successResponse(res, deleted, 'Task deleted successfully');
});

module.exports = router;
