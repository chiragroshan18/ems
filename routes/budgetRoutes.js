const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../data/store');
const {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  findBudgetItem,
  validateBudget,
  calculateBudgetSummary
} = require('../utils/helpers');

// GET budget items
router.get('/', (req, res) => {
  const eventId = req.params.eventId || req.query.eventId;
  let results = [...store.budget];
  let parentPlannedBudget = 0;

  if (eventId) {
    const ev = findEvent(eventId);
    if (!ev) {
      return errorResponse(res, `Event with ID '${eventId}' not found`, 404);
    }
    parentPlannedBudget = ev.plannedBudget || 0;
    results = results.filter(b => b.eventId === eventId);
  } else {
    parentPlannedBudget = store.events.reduce((sum, e) => sum + Number(e.plannedBudget || 0), 0);
  }

  if (req.query.category) {
    results = results.filter(b => b.category.toLowerCase() === req.query.category.toLowerCase());
  }
  if (req.query.status) {
    results = results.filter(b => b.status.toLowerCase() === req.query.status.toLowerCase());
  }
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter(b =>
      b.description.toLowerCase().includes(term) ||
      b.category.toLowerCase().includes(term)
    );
  }

  const enriched = results.map(b => {
    const parentEvent = store.events.find(e => e.id === b.eventId);
    return {
      ...b,
      eventName: parentEvent ? parentEvent.name : 'Unknown Event'
    };
  });

  const summary = calculateBudgetSummary(results, parentPlannedBudget);

  // Group by category
  const categoryBreakdown = {};
  results.forEach(item => {
    if (!categoryBreakdown[item.category]) {
      categoryBreakdown[item.category] = { planned: 0, actual: 0 };
    }
    categoryBreakdown[item.category].planned += Number(item.plannedAmount || 0);
    categoryBreakdown[item.category].actual += Number(item.actualAmount || 0);
  });

  return successResponse(res, {
    items: enriched,
    summary,
    categoryBreakdown
  }, 'Budget records retrieved successfully');
});

// GET single budget item
router.get('/:id', (req, res) => {
  const item = findBudgetItem(req.params.id);
  if (!item) {
    return errorResponse(res, `Budget item with ID '${req.params.id}' not found`, 404);
  }
  const parentEvent = store.events.find(e => e.id === item.eventId);
  return successResponse(res, {
    ...item,
    eventName: parentEvent ? parentEvent.name : 'Unknown Event'
  }, 'Budget item retrieved successfully');
});

// POST new budget item
router.post('/', (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  if (!eventId) {
    return errorResponse(res, 'Event ID is required for budget entry', 400);
  }

  const parentEvent = findEvent(eventId);
  if (!parentEvent) {
    return errorResponse(res, `Event with ID '${eventId}' does not exist`, 404);
  }

  const validationErrors = validateBudget(req.body, false);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for budget item', 400, validationErrors);
  }

  const { category, description, plannedAmount, actualAmount, date, status } = req.body;

  const newItem = {
    id: generateId('BDG', store.budget),
    eventId,
    category,
    description: description.trim(),
    plannedAmount: Number(plannedAmount),
    actualAmount: actualAmount !== undefined ? Number(actualAmount) : 0,
    date: date || new Date().toISOString().split('T')[0],
    status: status || 'Pending'
  };

  store.budget.push(newItem);
  return successResponse(res, newItem, 'Budget item recorded successfully', 201);
});

// PATCH budget item
router.patch('/:id', (req, res) => {
  const index = store.budget.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Budget item with ID '${req.params.id}' not found`, 404);
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return errorResponse(res, 'Request body cannot be empty', 400);
  }

  const validationErrors = validateBudget(req.body, true);
  if (validationErrors.length > 0) {
    return errorResponse(res, 'Validation failed for budget update', 400, validationErrors);
  }

  const current = store.budget[index];
  const updated = {
    ...current,
    category: req.body.category !== undefined ? req.body.category : current.category,
    description: req.body.description !== undefined ? req.body.description.trim() : current.description,
    plannedAmount: req.body.plannedAmount !== undefined ? Number(req.body.plannedAmount) : current.plannedAmount,
    actualAmount: req.body.actualAmount !== undefined ? Number(req.body.actualAmount) : current.actualAmount,
    date: req.body.date !== undefined ? req.body.date : current.date,
    status: req.body.status !== undefined ? req.body.status : current.status
  };

  store.budget[index] = updated;
  return successResponse(res, updated, 'Budget item updated successfully');
});

// DELETE budget item
router.delete('/:id', (req, res) => {
  const index = store.budget.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return errorResponse(res, `Budget item with ID '${req.params.id}' not found`, 404);
  }

  const deleted = store.budget.splice(index, 1)[0];
  return successResponse(res, deleted, 'Budget item deleted successfully');
});

module.exports = router;
