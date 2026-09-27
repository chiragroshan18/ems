const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /api/search?q=...
router.get('/', (req, res) => {
  const query = req.query.q;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return errorResponse(res, 'Query parameter "q" is required and cannot be empty', 400);
  }

  const term = query.trim().toLowerCase();

  const matchedEvents = store.events.filter(e =>
    e.name.toLowerCase().includes(term) ||
    e.venue.toLowerCase().includes(term) ||
    e.organizer.toLowerCase().includes(term) ||
    e.type.toLowerCase().includes(term)
  );

  const matchedTasks = store.tasks.filter(t =>
    t.taskName.toLowerCase().includes(term) ||
    (t.assignedMember && t.assignedMember.toLowerCase().includes(term)) ||
    t.category.toLowerCase().includes(term) ||
    (t.notes && t.notes.toLowerCase().includes(term))
  );

  const matchedTeam = store.team.filter(m =>
    m.name.toLowerCase().includes(term) ||
    m.role.toLowerCase().includes(term) ||
    (m.department && m.department.toLowerCase().includes(term))
  );

  const matchedGuests = store.guests.filter(g =>
    g.name.toLowerCase().includes(term) ||
    (g.organization && g.organization.toLowerCase().includes(term)) ||
    (g.topic && g.topic.toLowerCase().includes(term)) ||
    (g.designation && g.designation.toLowerCase().includes(term))
  );

  const matchedSchedule = store.schedule.filter(s =>
    s.title.toLowerCase().includes(term) ||
    (s.venue && s.venue.toLowerCase().includes(term)) ||
    (s.speaker && s.speaker.toLowerCase().includes(term))
  );

  const totalMatches = matchedEvents.length + matchedTasks.length + matchedTeam.length + matchedGuests.length + matchedSchedule.length;

  return successResponse(res, {
    query: query.trim(),
    totalMatches,
    results: {
      events: matchedEvents,
      tasks: matchedTasks,
      team: matchedTeam,
      guests: matchedGuests,
      schedule: matchedSchedule
    }
  }, `Found ${totalMatches} matching results across all modules`);
});

module.exports = router;
