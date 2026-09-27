const store = require('../data/store');

function successResponse(res, data, message = 'Operation successful', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function errorResponse(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const payload = {
    success: false,
    message
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
}

function generateId(prefix, list) {
  const nums = list
    .map(item => {
      const parts = item.id.split('-');
      return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 100;
  return `${prefix}-${max + 1}`;
}

function findEvent(id) {
  return store.events.find(e => e.id === id);
}

function findSchedule(id) {
  return store.schedule.find(s => s.id === id);
}

function findTeamMember(id) {
  return store.team.find(t => t.id === id);
}

function findTask(id) {
  return store.tasks.find(t => t.id === id);
}

function findBudgetItem(id) {
  return store.budget.find(b => b.id === id);
}

function findGuest(id) {
  return store.guests.find(g => g.id === id);
}

function findAnnouncement(id) {
  return store.announcements.find(a => a.id === id);
}

function validateEvent(data, isUpdate = false) {
  const errors = [];
  const validTypes = [
    'Conference', 'Workshop', 'Seminar', 'College Fest',
    'Corporate Meet', 'Cultural Event', 'Sports Event', 'Exhibition'
  ];
  const validStatuses = ['Planning', 'Ready', 'In Progress', 'Completed', 'Cancelled'];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Event name is required and must be non-empty.');
    }
  }

  if (!isUpdate || data.type !== undefined) {
    if (!data.type || !validTypes.includes(data.type)) {
      errors.push(`Event type must be one of: ${validTypes.join(', ')}.`);
    }
  }

  if (!isUpdate || data.venue !== undefined) {
    if (!data.venue || typeof data.venue !== 'string' || !data.venue.trim()) {
      errors.push('Event venue is required.');
    }
  }

  if (!isUpdate || data.date !== undefined) {
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push('Event date must be in YYYY-MM-DD format.');
    }
  }

  if (!isUpdate || data.organizer !== undefined) {
    if (!data.organizer || typeof data.organizer !== 'string' || !data.organizer.trim()) {
      errors.push('Organizer name is required.');
    }
  }

  if (data.status !== undefined && !validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}.`);
  }

  if (data.plannedBudget !== undefined) {
    const num = Number(data.plannedBudget);
    if (isNaN(num) || num < 0) {
      errors.push('Planned budget must be a positive number.');
    }
  }

  if (data.expectedParticipants !== undefined) {
    const num = Number(data.expectedParticipants);
    if (isNaN(num) || num < 0) {
      errors.push('Expected participants must be a non-negative integer.');
    }
  }

  return errors;
}

function validateSchedule(data, isUpdate = false) {
  const errors = [];
  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      errors.push('Session title is required.');
    }
  }
  if (!isUpdate || data.startTime !== undefined) {
    if (!data.startTime || typeof data.startTime !== 'string') {
      errors.push('Start time is required.');
    }
  }
  if (!isUpdate || data.endTime !== undefined) {
    if (!data.endTime || typeof data.endTime !== 'string') {
      errors.push('End time is required.');
    }
  }
  return errors;
}

function validateTeam(data, isUpdate = false) {
  const errors = [];
  const validRoles = [
    'Event Coordinator', 'Registration', 'Technical Team', 'Hospitality',
    'Stage Management', 'Photography', 'Security', 'Volunteer'
  ];
  const validStatuses = ['Available', 'Assigned', 'Busy', 'Completed'];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Team member name is required.');
    }
  }
  if (!isUpdate || data.role !== undefined) {
    if (!data.role || !validRoles.includes(data.role)) {
      errors.push(`Role must be one of: ${validRoles.join(', ')}.`);
    }
  }
  if (data.status !== undefined && !validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}.`);
  }
  return errors;
}

function validateTask(data, isUpdate = false) {
  const errors = [];
  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  const validStatuses = ['Pending', 'In Progress', 'Completed'];

  if (!isUpdate || data.taskName !== undefined) {
    if (!data.taskName || typeof data.taskName !== 'string' || !data.taskName.trim()) {
      errors.push('Task name is required.');
    }
  }
  if (data.priority !== undefined && !validPriorities.includes(data.priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(', ')}.`);
  }
  if (data.status !== undefined && !validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}.`);
  }
  return errors;
}

function validateBudget(data, isUpdate = false) {
  const errors = [];
  const validCategories = [
    'Venue', 'Food', 'Decoration', 'Equipment',
    'Marketing', 'Transportation', 'Photography', 'Miscellaneous'
  ];

  if (!isUpdate || data.category !== undefined) {
    if (!data.category || !validCategories.includes(data.category)) {
      errors.push(`Budget category must be one of: ${validCategories.join(', ')}.`);
    }
  }
  if (!isUpdate || data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
      errors.push('Description is required.');
    }
  }
  if (!isUpdate || data.plannedAmount !== undefined) {
    const planned = Number(data.plannedAmount);
    if (isNaN(planned) || planned < 0) {
      errors.push('Planned amount must be a positive number.');
    }
  }
  if (data.actualAmount !== undefined) {
    const actual = Number(data.actualAmount);
    if (isNaN(actual) || actual < 0) {
      errors.push('Actual amount must be a non-negative number.');
    }
  }
  return errors;
}

function validateGuest(data, isUpdate = false) {
  const errors = [];
  const validStatuses = ['Pending', 'Confirmed', 'Declined'];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Guest/Speaker name is required.');
    }
  }
  if (data.confirmationStatus !== undefined && !validStatuses.includes(data.confirmationStatus)) {
    errors.push(`Confirmation status must be one of: ${validStatuses.join(', ')}.`);
  }
  return errors;
}

function validateAnnouncement(data, isUpdate = false) {
  const errors = [];
  const validPriorities = ['Normal', 'Important', 'Urgent'];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      errors.push('Announcement title is required.');
    }
  }
  if (!isUpdate || data.message !== undefined) {
    if (!data.message || typeof data.message !== 'string' || !data.message.trim()) {
      errors.push('Announcement message is required.');
    }
  }
  if (data.priority !== undefined && !validPriorities.includes(data.priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(', ')}.`);
  }
  return errors;
}

function calculateTaskProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  return Math.round((completed / tasks.length) * 100);
}

function calculateBudgetSummary(budgetItems, plannedBudget = 0) {
  const items = budgetItems || [];
  const totalPlannedFromItems = items.reduce((sum, item) => sum + Number(item.plannedAmount || 0), 0);
  const effectivePlanned = plannedBudget > 0 ? plannedBudget : totalPlannedFromItems;
  const totalSpent = items.reduce((sum, item) => sum + Number(item.actualAmount || 0), 0);
  const remaining = effectivePlanned - totalSpent;
  const utilization = effectivePlanned > 0 ? Math.min(100, Math.round((totalSpent / effectivePlanned) * 100)) : 0;

  return {
    planned: effectivePlanned,
    spent: totalSpent,
    remaining,
    utilization
  };
}

function calculateEventReadiness(eventId) {
  const event = findEvent(eventId);
  if (!event) return null;

  const eventTasks = store.tasks.filter(t => t.eventId === eventId);
  const eventTeam = store.team.filter(t => t.eventId === eventId);
  const eventSessions = store.schedule.filter(s => s.eventId === eventId);
  const eventGuests = store.guests.filter(g => g.eventId === eventId);
  const eventBudget = store.budget.filter(b => b.eventId === eventId);

  // 1. Task factor (35% weight)
  const totalTasks = eventTasks.length;
  const completedTasks = eventTasks.filter(t => t.status === 'Completed').length;
  const taskFactor = totalTasks > 0 ? (completedTasks / totalTasks) : 0.5;

  // 2. Team factor (20% weight)
  const totalTeam = eventTeam.length;
  const assignedTeam = eventTeam.filter(t => t.status === 'Assigned' || t.status === 'Busy').length;
  const teamFactor = totalTeam > 0 ? (assignedTeam / totalTeam) : 0.5;

  // 3. Schedule factor (20% weight)
  const totalSessions = eventSessions.length;
  const scheduledSessions = eventSessions.filter(s => s.status === 'Scheduled' || s.status === 'Completed').length;
  const scheduleFactor = totalSessions > 0 ? (scheduledSessions / totalSessions) : 0.5;

  // 4. Speaker factor (15% weight)
  const totalGuests = eventGuests.length;
  const confirmedGuests = eventGuests.filter(g => g.confirmationStatus === 'Confirmed').length;
  const speakerFactor = totalGuests > 0 ? (confirmedGuests / totalGuests) : 0.5;

  // 5. Budget factor (10% weight)
  const budgetSummary = calculateBudgetSummary(eventBudget, event.plannedBudget);
  const budgetPrepared = eventBudget.length > 0 && budgetSummary.spent > 0;
  const budgetFactor = budgetPrepared ? 1.0 : (event.plannedBudget > 0 ? 0.7 : 0.3);

  // Overall readiness formula:
  // 35% tasks + 20% team + 20% schedule + 15% speakers + 10% budget
  const score = (taskFactor * 35) + (teamFactor * 20) + (scheduleFactor * 20) + (speakerFactor * 15) + (budgetFactor * 10);
  const readinessPercentage = Math.round(score);

  return {
    eventId,
    eventName: event.name,
    status: event.status,
    readinessPercentage,
    breakdown: {
      tasks: {
        completed: completedTasks,
        total: totalTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        weight: '35%'
      },
      team: {
        assigned: assignedTeam,
        total: totalTeam,
        percentage: totalTeam > 0 ? Math.round((assignedTeam / totalTeam) * 100) : 0,
        weight: '20%'
      },
      schedule: {
        scheduled: scheduledSessions,
        total: totalSessions,
        percentage: totalSessions > 0 ? Math.round((scheduledSessions / totalSessions) * 100) : 0,
        weight: '20%'
      },
      speakers: {
        confirmed: confirmedGuests,
        total: totalGuests,
        percentage: totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0,
        weight: '15%'
      },
      budget: {
        isPrepared: budgetPrepared,
        planned: budgetSummary.planned,
        spent: budgetSummary.spent,
        remaining: budgetSummary.remaining,
        utilization: budgetSummary.utilization,
        weight: '10%'
      }
    }
  };
}

function calculateEventAnalytics(eventId) {
  const event = findEvent(eventId);
  if (!event) return null;

  const eventTasks = store.tasks.filter(t => t.eventId === eventId);
  const eventTeam = store.team.filter(t => t.eventId === eventId);
  const eventSchedule = store.schedule.filter(s => s.eventId === eventId);
  const eventBudget = store.budget.filter(b => b.eventId === eventId);
  const eventGuests = store.guests.filter(g => g.eventId === eventId);
  const eventAnnouncements = store.announcements.filter(a => a.eventId === eventId);

  const readiness = calculateEventReadiness(eventId);
  const budgetSummary = calculateBudgetSummary(eventBudget, event.plannedBudget);
  const taskProgress = calculateTaskProgress(eventTasks);

  const tasksByPriority = {
    Low: eventTasks.filter(t => t.priority === 'Low').length,
    Medium: eventTasks.filter(t => t.priority === 'Medium').length,
    High: eventTasks.filter(t => t.priority === 'High').length,
    Critical: eventTasks.filter(t => t.priority === 'Critical').length
  };

  const tasksByStatus = {
    Pending: eventTasks.filter(t => t.status === 'Pending').length,
    InProgress: eventTasks.filter(t => t.status === 'In Progress').length,
    Completed: eventTasks.filter(t => t.status === 'Completed').length
  };

  const budgetByCategory = {};
  eventBudget.forEach(b => {
    budgetByCategory[b.category] = (budgetByCategory[b.category] || 0) + Number(b.actualAmount || 0);
  });

  return {
    eventId,
    eventName: event.name,
    type: event.type,
    status: event.status,
    date: event.date,
    venue: event.venue,
    taskProgress,
    readinessScore: readiness ? readiness.readinessPercentage : 0,
    readiness,
    budgetSummary,
    tasksCount: eventTasks.length,
    tasksByPriority,
    tasksByStatus,
    teamCount: eventTeam.length,
    sessionsCount: eventSchedule.length,
    guestsCount: eventGuests.length,
    confirmedGuestsCount: eventGuests.filter(g => g.confirmationStatus === 'Confirmed').length,
    announcementsCount: eventAnnouncements.length,
    budgetByCategory
  };
}

function buildDashboard() {
  const totalEvents = store.events.length;
  const upcomingEvents = store.events.filter(e => e.status === 'Ready' || e.status === 'Planning').length;
  const activeEvents = store.events.filter(e => e.status === 'In Progress').length;
  const completedEvents = store.events.filter(e => e.status === 'Completed').length;

  const totalTasks = store.tasks.length;
  const completedTasks = store.tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = store.tasks.filter(t => t.status === 'Pending').length;
  const inProgressTasks = store.tasks.filter(t => t.status === 'In Progress').length;

  const teamMembers = store.team.length;
  const totalGuests = store.guests.length;
  const confirmedGuests = store.guests.filter(g => g.confirmationStatus === 'Confirmed').length;

  // Planned budget is sum of all events planned budgets
  const totalPlannedBudget = store.events.reduce((sum, e) => sum + Number(e.plannedBudget || 0), 0);
  const totalSpent = store.budget.reduce((sum, b) => sum + Number(b.actualAmount || 0), 0);
  const remainingBudget = totalPlannedBudget - totalSpent;
  const budgetUtilization = totalPlannedBudget > 0 ? Math.min(100, Math.round((totalSpent / totalPlannedBudget) * 100)) : 0;

  // Upcoming sessions sorted by date / time
  const upcomingSchedule = [...store.schedule]
    .sort((a, b) => {
      const dateA = `${a.date}T${a.startTime}`;
      const dateB = `${b.date}T${b.startTime}`;
      return dateA.localeCompare(dateB);
    })
    .slice(0, 5)
    .map(s => {
      const parentEvent = store.events.find(e => e.id === s.eventId);
      return {
        ...s,
        eventName: parentEvent ? parentEvent.name : 'Unknown Event'
      };
    });

  // Recent announcements & activity
  const recentAnnouncements = [...store.announcements]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 4)
    .map(a => {
      const parentEvent = store.events.find(e => e.id === a.eventId);
      return {
        ...a,
        eventName: parentEvent ? parentEvent.name : 'All Events'
      };
    });

  // Primary event readiness (pick the flagship or first active/ready event)
  const primaryEvent = store.events.find(e => e.status === 'Ready' || e.status === 'In Progress') || store.events[0];
  const primaryEventReadiness = primaryEvent ? calculateEventReadiness(primaryEvent.id) : null;

  return {
    statistics: {
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        active: activeEvents,
        completed: completedEvents
      },
      operations: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        teamMembers,
        totalGuests,
        confirmedGuests
      },
      finance: {
        totalPlannedBudget,
        totalSpent,
        remainingBudget,
        budgetUtilization
      }
    },
    primaryEventReadiness,
    upcomingSchedule,
    recentAnnouncements,
    totalRecords: {
      events: totalEvents,
      schedule: store.schedule.length,
      team: store.team.length,
      tasks: totalTasks,
      budget: store.budget.length,
      guests: totalGuests,
      announcements: store.announcements.length
    }
  };
}

module.exports = {
  successResponse,
  errorResponse,
  generateId,
  findEvent,
  findSchedule,
  findTeamMember,
  findTask,
  findBudgetItem,
  findGuest,
  findAnnouncement,
  validateEvent,
  validateSchedule,
  validateTeam,
  validateTask,
  validateBudget,
  validateGuest,
  validateAnnouncement,
  calculateTaskProgress,
  calculateBudgetSummary,
  calculateEventReadiness,
  calculateEventAnalytics,
  buildDashboard
};
