/* ==========================================================================
   EMS - EVENT WORKSPACE CONTROLLER
   ========================================================================== */

let currentEventId = null;
let currentEvent = null;
let allEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentEventId = urlParams.get('id');

  await loadAllEventsList();
  if (currentEventId) {
    loadEventWorkspace(currentEventId);
  } else if (allEvents.length > 0) {
    loadEventWorkspace(allEvents[0].id);
  } else {
    renderEmptyWorkspace();
  }

  setupWorkspaceEvents();
});

async function loadAllEventsList() {
  try {
    const res = await apiRequest('/events');
    allEvents = res.data;
    const select = document.getElementById('workspaceEventSelect');
    if (select) {
      select.innerHTML = allEvents.map(e => `
        <option value="${e.id}" ${e.id === currentEventId ? 'selected' : ''}>${e.name} (${e.status})</option>
      `).join('');
    }
  } catch (err) {
    handleApiError(err, 'Failed to list events');
  }
}

async function loadEventWorkspace(eventId) {
  currentEventId = eventId;
  const select = document.getElementById('workspaceEventSelect');
  if (select) select.value = eventId;

  // Update URL without reload
  const newUrl = `${window.location.pathname}?id=${eventId}`;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  try {
    const [eventRes, schedRes, teamRes, tasksRes, budgetRes, guestsRes, annRes, analyticsRes] = await Promise.all([
      apiRequest(`/events/${eventId}`),
      apiRequest(`/events/${eventId}/schedule`),
      apiRequest(`/events/${eventId}/team`),
      apiRequest(`/events/${eventId}/tasks`),
      apiRequest(`/events/${eventId}/budget`),
      apiRequest(`/events/${eventId}/guests`),
      apiRequest(`/events/${eventId}/announcements`),
      apiRequest(`/events/${eventId}/analytics`)
    ]);

    currentEvent = eventRes.data;
    const schedule = schedRes.data || [];
    const team = teamRes.data || [];
    const tasks = (tasksRes.data && tasksRes.data.tasks) || [];
    const budget = budgetRes.data || { items: [], summary: {} };
    const guests = guestsRes.data || [];
    const announcements = annRes.data || [];
    const analytics = analyticsRes.data || {};

    renderWorkspaceHeader(currentEvent, analytics);
    renderOverviewTab(currentEvent, analytics, schedule, tasks);
    renderScheduleTab(schedule);
    renderTeamTab(team);
    renderTasksTab(tasks);
    renderBudgetTab(budget);
    renderGuestsTab(guests);
    renderAnnouncementsTab(announcements);
    renderAnalyticsTab(analytics);

  } catch (err) {
    handleApiError(err, 'Failed to load event workspace');
  }
}

function renderEmptyWorkspace() {
  document.getElementById('workspaceContent').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🚀</div>
      <div class="empty-title">No Events Available</div>
      <div class="empty-description">Create an event to activate the dedicated event operations workspace.</div>
      <a href="events.html" class="btn btn-primary">+ Create First Event</a>
    </div>
  `;
}

function renderWorkspaceHeader(event, analytics) {
  document.getElementById('wsEventTitle').innerText = event.name;
  document.getElementById('wsEventMeta').innerText = `🗓️ ${formatDate(event.date)} (${event.startTime} - ${event.endTime}) · 📍 ${event.venue} · 👤 ${event.organizer}`;

  const statusBadge = document.getElementById('wsEventStatus');
  let badgeClass = 'badge-planning';
  if (event.status === 'Ready') badgeClass = 'badge-ready';
  if (event.status === 'In Progress') badgeClass = 'badge-progress';
  if (event.status === 'Completed') badgeClass = 'badge-completed';
  if (event.status === 'Cancelled') badgeClass = 'badge-cancelled';
  statusBadge.className = `badge ${badgeClass}`;
  statusBadge.innerText = event.status;

  // Header quick metrics
  document.getElementById('wsHeaderProgress').innerText = `${analytics.taskProgress || 0}%`;
  document.getElementById('wsHeaderTasks').innerText = `${analytics.tasksByStatus ? analytics.tasksByStatus.Completed : 0}/${analytics.tasksCount || 0}`;
  document.getElementById('wsHeaderBudget').innerText = formatCurrency(analytics.budgetSummary ? analytics.budgetSummary.spent : 0);
  document.getElementById('wsHeaderTeam').innerText = analytics.teamCount || 0;
  document.getElementById('wsHeaderReadiness').innerText = `${analytics.readinessScore || 0}%`;
}

function renderOverviewTab(event, analytics, schedule, tasks) {
  const r = analytics.readiness;
  let readinessHtml = '';
  if (r) {
    readinessHtml = `
      <div class="readiness-banner" style="margin-top: 10px;">
        <div class="readiness-header">
          <div class="readiness-title-group">
            <h3>⚡ Event Preparation Readiness</h3>
            <span style="font-size: 13px; color: var(--text-muted);">Weighted formula across operational milestones</span>
          </div>
          <div class="readiness-percent-badge">${r.readinessPercentage}<span>%</span></div>
        </div>
        <div class="readiness-progress-track">
          <div class="readiness-progress-fill" style="width: ${r.readinessPercentage}%;"></div>
        </div>
        <div class="readiness-factors-grid">
          <div class="factor-item"><span class="factor-name">Tasks</span><span class="factor-value">${r.breakdown.tasks.completed}/${r.breakdown.tasks.total}</span></div>
          <div class="factor-item"><span class="factor-name">Team Roles</span><span class="factor-value">${r.breakdown.team.assigned}/${r.breakdown.team.total}</span></div>
          <div class="factor-item"><span class="factor-name">Sessions</span><span class="factor-value">${r.breakdown.schedule.scheduled}/${r.breakdown.schedule.total}</span></div>
          <div class="factor-item"><span class="factor-name">Speakers</span><span class="factor-value">${r.breakdown.speakers.confirmed}/${r.breakdown.speakers.total}</span></div>
          <div class="factor-item"><span class="factor-name">Budget</span><span class="factor-value">${r.breakdown.budget.isPrepared ? 'Prepared' : 'Review'}</span></div>
        </div>
      </div>
    `;
  }

  document.getElementById('tabOverviewContent').innerHTML = `
    ${readinessHtml}

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-top: 20px;">
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 22px;">
        <h4 style="font-size: 16px; margin-bottom: 12px;">About the Event</h4>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 18px;">
          ${event.description || 'No detailed description provided.'}
        </p>

        <h4 style="font-size: 16px; margin-bottom: 12px;">Upcoming Sessions</h4>
        <div class="timeline-container">
          ${schedule.slice(0, 3).map(s => `
            <div class="timeline-node">
              <div class="timeline-dot"></div>
              <div class="timeline-card">
                <div class="timeline-meta">
                  <span style="font-weight: 700; color: var(--brand-primary);">${s.startTime} - ${s.endTime}</span>
                  <span>📍 ${s.venue}</span>
                  <span>🎤 ${s.speaker}</span>
                </div>
                <div style="font-weight: 700;">${s.title}</div>
              </div>
            </div>
          `).join('') || '<div style="color: var(--text-muted); font-size: 13px;">No sessions scheduled yet.</div>'}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px;">
          <h4 style="font-size: 15px; margin-bottom: 12px;">Action Checklist</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${tasks.slice(0, 4).map(t => `
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 8px 10px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
                <span style="display: flex; align-items: center; gap: 8px;">
                  <span>${t.status === 'Completed' ? '✅' : '⏳'}</span>
                  <span style="${t.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.taskName}</span>
                </span>
                <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
              </div>
            `).join('') || '<div style="color: var(--text-muted); font-size: 13px;">No tasks created.</div>'}
          </div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px;">
          <h4 style="font-size: 15px; margin-bottom: 8px;">Quick Operations</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="openAddSessionModal()">+ Schedule Session</button>
            <button class="btn btn-secondary btn-sm" onclick="openAddTaskModal()">+ Add Event Task</button>
            <button class="btn btn-secondary btn-sm" onclick="openAddExpenseModal()">+ Add Budget Expense</button>
            <button class="btn btn-primary btn-sm" onclick="printEventSummaryReport('${event.id}')">🖨️ Print Full Dossier (PDF)</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderScheduleTab(schedule) {
  const container = document.getElementById('tabScheduleContent');
  if (schedule.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏰</div>
        <div class="empty-title">No Sessions Scheduled</div>
        <div class="empty-description">Build this event's agenda by adding keynote speeches, workshops, or panels.</div>
        <button class="btn btn-primary" onclick="openAddSessionModal()">+ Schedule Session</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 16px; font-weight: 700;">Event Agenda Timeline (${schedule.length} Sessions)</h3>
      <button class="btn btn-primary btn-sm" onclick="openAddSessionModal()">+ Schedule Session</button>
    </div>
    <div class="timeline-container">
      ${schedule.map(s => `
        <div class="timeline-node">
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div class="timeline-meta">
                <span style="font-weight: 700; color: var(--brand-primary);">🕒 ${s.startTime} - ${s.endTime}</span>
                <span>📍 ${s.venue}</span>
                <span class="badge badge-ready">${s.status}</span>
              </div>
              <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')">🗑️</button>
            </div>
            <h4 style="font-size: 16px; margin: 4px 0 6px;">${s.title}</h4>
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">
              🎤 <strong>${s.speaker}</strong>
            </div>
            <p style="font-size: 13px; color: var(--text-muted);">${s.description || ''}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTeamTab(team) {
  const container = document.getElementById('tabTeamContent');
  if (team.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">No Team Members Assigned</div>
        <div class="empty-description">Assign coordinators, technical crew, and volunteers to this event.</div>
        <button class="btn btn-primary" onclick="openAddTeamModal()">+ Add Team Member</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 16px; font-weight: 700;">Assigned Event Crew (${team.length} Members)</h3>
      <button class="btn btn-primary btn-sm" onclick="openAddTeamModal()">+ Add Team Member</button>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
      ${team.map(m => `
        <div class="metric-card" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge badge-ready">${m.role}</span>
            <span class="badge badge-planning">${m.status}</span>
          </div>
          <h4 style="font-size: 16px; font-weight: 700;">${m.name}</h4>
          <div style="font-size: 12px; color: var(--text-muted);">
            <div>🏢 ${m.department}</div>
            <div>📞 ${m.contact || 'No contact'}</div>
            <div>📋 ${m.tasksCount || 0} assigned tasks</div>
          </div>
          <div style="border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px; display: flex; justify-content: flex-end;">
            <button class="btn btn-danger btn-sm" onclick="deleteTeamMember('${m.id}')">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTasksTab(tasks) {
  const container = document.getElementById('tabTasksContent');
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No Tasks Assigned</div>
        <div class="empty-description">Create an operational task checklist for stage, sound, logistics, or registration.</div>
        <button class="btn btn-primary" onclick="openAddTaskModal()">+ Add Task</button>
      </div>
    `;
    return;
  }

  const completed = tasks.filter(t => t.status === 'Completed').length;
  const progress = Math.round((completed / tasks.length) * 100);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700;">Task Checklist (${completed}/${tasks.length} Completed - ${progress}%)</h3>
        <div class="readiness-progress-track" style="margin-top: 6px; width: 300px; height: 8px;">
          <div class="readiness-progress-fill" style="width: ${progress}%;"></div>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddTaskModal()">+ Add Task</button>
    </div>

    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Task Name</th>
            <th>Assigned Member</th>
            <th>Priority</th>
            <th>Deadline</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(t => `
            <tr>
              <td>
                <button class="btn btn-sm ${t.status === 'Completed' ? 'btn-secondary' : 'btn-primary'}" onclick="toggleTaskStatus('${t.id}', '${t.status}')">
                  ${t.status === 'Completed' ? '✓ Done' : 'Pending'}
                </button>
              </td>
              <td style="font-weight: 600; ${t.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.taskName}</td>
              <td>👤 ${t.assignedMember}</td>
              <td><span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span></td>
              <td>🗓️ ${t.deadline}</td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderBudgetTab(budget) {
  const container = document.getElementById('tabBudgetContent');
  const items = budget.items || [];
  const summary = budget.summary || {};

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 16px; font-weight: 700;">Event Expenses & Allocations</h3>
      <button class="btn btn-primary btn-sm" onclick="openAddExpenseModal()">+ Add Expense</button>
    </div>

    <div class="metrics-grid" style="margin-bottom: 20px;">
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Planned Budget</span>
          <span class="metric-value">${formatCurrency(summary.planned || 0)}</span>
        </div>
        <div class="metric-icon-wrap icon-blue">💰</div>
      </div>
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Total Spent</span>
          <span class="metric-value">${formatCurrency(summary.spent || 0)}</span>
        </div>
        <div class="metric-icon-wrap icon-amber">💸</div>
      </div>
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Remaining Balance</span>
          <span class="metric-value">${formatCurrency(summary.remaining || 0)}</span>
        </div>
        <div class="metric-icon-wrap icon-emerald">📊</div>
      </div>
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Utilization</span>
          <span class="metric-value">${summary.utilization || 0}%</span>
        </div>
        <div class="metric-icon-wrap icon-purple">⚡</div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Description</th>
            <th>Planned (₹)</th>
            <th>Actual (₹)</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(b => `
            <tr>
              <td><span class="badge badge-planning">${b.category}</span></td>
              <td style="font-weight: 600;">${b.description}</td>
              <td>${formatCurrency(b.plannedAmount)}</td>
              <td><strong style="color: var(--brand-primary);">${formatCurrency(b.actualAmount)}</strong></td>
              <td>${b.date}</td>
              <td><span class="badge badge-ready">${b.status}</span></td>
              <td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${b.id}')">🗑️</button></td>
            </tr>
          `).join('') || '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No expenses recorded for this event.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderGuestsTab(guests) {
  const container = document.getElementById('tabGuestsContent');
  if (guests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎙️</div>
        <div class="empty-title">No Guests or Speakers Registered</div>
        <div class="empty-description">Invite keynote speakers, VIP dignitaries, and panellists.</div>
        <button class="btn btn-primary" onclick="openAddGuestModal()">+ Register Guest/Speaker</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 16px; font-weight: 700;">Invited Guests & Keynote Speakers (${guests.length})</h3>
      <button class="btn btn-primary btn-sm" onclick="openAddGuestModal()">+ Register Guest/Speaker</button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      ${guests.map(g => {
        let badgeClass = 'badge-planning';
        if (g.confirmationStatus === 'Confirmed') badgeClass = 'badge-completed';
        if (g.confirmationStatus === 'Declined') badgeClass = 'badge-cancelled';

        return `
          <div class="metric-card" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="badge ${badgeClass}">${g.confirmationStatus}</span>
              <span style="font-size: 11px; color: var(--text-muted);">${g.id}</span>
            </div>
            <h4 style="font-size: 16px; font-weight: 700;">${g.name}</h4>
            <div style="font-size: 13px; color: var(--text-secondary);">
              <strong>${g.designation}</strong> · ${g.organization}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); background: var(--bg-subtle); padding: 8px 10px; border-radius: var(--radius-sm); margin-top: 4px;">
              🎯 <strong>Topic:</strong> ${g.topic}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              📞 ${g.contact || 'No contact provided'}
            </div>
            <div style="border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
              <button class="btn btn-sm btn-secondary" onclick="toggleGuestStatus('${g.id}', '${g.confirmationStatus}')">Toggle Status</button>
              <button class="btn btn-danger btn-sm" onclick="deleteGuest('${g.id}')">Remove</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderAnnouncementsTab(announcements) {
  const container = document.getElementById('tabAnnouncementsContent');
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 16px; font-weight: 700;">Event Broadcasts & Notifications (${announcements.length})</h3>
      <button class="btn btn-primary btn-sm" onclick="openAddAnnouncementModal()">+ Publish Announcement</button>
    </div>

    ${announcements.map(a => {
      let badgeClass = 'badge-normal';
      if (a.priority === 'Urgent') badgeClass = 'badge-urgent';
      if (a.priority === 'Important') badgeClass = 'badge-important';

      return `
        <div class="announcement-card priority-${a.priority.toLowerCase()}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${badgeClass}">${a.priority}</span>
              <span style="font-size: 12px; color: var(--text-muted);">${new Date(a.timestamp).toLocaleString()}</span>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteAnnouncement('${a.id}')">Delete</button>
          </div>
          <h4 style="font-size: 15px; margin-bottom: 4px;">${a.title}</h4>
          <p style="font-size: 14px; color: var(--text-secondary);">${a.message}</p>
        </div>
      `;
    }).join('') || '<div class="empty-state"><div class="empty-title">No Announcements Published</div></div>'}
  `;
}

function renderAnalyticsTab(analytics) {
  const container = document.getElementById('tabAnalyticsContent');
  const b = analytics.budgetByCategory || {};
  const priorities = analytics.tasksByPriority || {};
  const statuses = analytics.tasksByStatus || { Completed: 0, InProgress: 0, Pending: 0 };
  const totalSpent = analytics.budgetSummary ? analytics.budgetSummary.spent : 0;

  // 1. Task Donut Chart Data
  const taskSegments = [
    { label: 'Completed', value: statuses.Completed, color: '#10b981', valueFormatted: `${statuses.Completed} tasks` },
    { label: 'In Progress', value: statuses.InProgress, color: '#f59e0b', valueFormatted: `${statuses.InProgress} tasks` },
    { label: 'Pending', value: statuses.Pending, color: '#6366f1', valueFormatted: `${statuses.Pending} tasks` }
  ];
  const taskChartHtml = generateDonutChartSVG(taskSegments, `${analytics.taskProgress || 0}%`, 'Complete');

  // 2. Category Budget Donut Chart Data
  const categoryPalette = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#64748b'];
  const budgetSegments = Object.keys(b).map((cat, idx) => ({
    label: cat,
    value: b[cat],
    color: categoryPalette[idx % categoryPalette.length],
    valueFormatted: formatCurrency(b[cat])
  }));
  const budgetChartHtml = generateDonutChartSVG(budgetSegments, formatCurrency(totalSpent), 'Total Spent');

  // 3. Category Dual Bar Chart Data
  const barItems = Object.keys(b).map((cat, idx) => {
    // estimate planned allocation proportionally or default
    const actual = Number(b[cat] || 0);
    const planned = Math.round(actual * 1.15) || 10000;
    return {
      label: cat,
      planned,
      actual
    };
  });
  const barChartHtml = generateDualBarChartHTML(barItems);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div>
        <h3 style="font-size: 18px; font-weight: 800;">📊 Event Operations Analytics & Visual Insights</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Comprehensive pictorial representations of preparation milestones, task distribution, and financial health.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="printEventSummaryReport('${currentEventId}')">🖨️ Export PDF Analytics</button>
    </div>

    <!-- Top Key Metric Cards -->
    <div class="metrics-grid" style="margin-bottom: 24px;">
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Task Completion</span>
          <span class="metric-value">${analytics.taskProgress || 0}%</span>
          <span class="metric-subtext">${statuses.Completed} of ${analytics.tasksCount} done</span>
        </div>
        <div class="metric-icon-wrap icon-purple">📋</div>
      </div>
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Speaker Confirmation</span>
          <span class="metric-value">${analytics.confirmedGuestsCount} / ${analytics.guestsCount}</span>
          <span class="metric-subtext">Confirmed Keynotes</span>
        </div>
        <div class="metric-icon-wrap icon-emerald">🎙️</div>
      </div>
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Program Sessions</span>
          <span class="metric-value">${analytics.sessionsCount}</span>
          <span class="metric-subtext">Agenda Sessions</span>
        </div>
        <div class="metric-icon-wrap icon-cyan">⏰</div>
      </div>
      <div class="metric-card">
        <div class="metric-info">
          <span class="metric-label">Team Allocation</span>
          <span class="metric-value">${analytics.teamCount}</span>
          <span class="metric-subtext">Active Roles</span>
        </div>
        <div class="metric-icon-wrap icon-blue">👥</div>
      </div>
    </div>

    <!-- Pictorial Charts Grid (Donuts / Pie Charts) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px; margin-bottom: 24px;">
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">🥧 Task Execution & Status Breakdown</div>
          <span class="badge badge-ready">${analytics.tasksCount} Tasks Total</span>
        </div>
        ${taskChartHtml}
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">🍩 Operational Expense Distribution</div>
          <span class="badge badge-completed">${formatCurrency(totalSpent)} Spent</span>
        </div>
        ${budgetChartHtml}
      </div>
    </div>

    <!-- Pictorial Bar Graph Section -->
    <div class="chart-card" style="margin-bottom: 24px;">
      <div class="chart-header">
        <div class="chart-title">📊 Category Budget vs Actual Spent Comparison (Bar Graph)</div>
        <div style="display: flex; align-items: center; gap: 14px; font-size: 12px; color: var(--text-muted);">
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 12px; border-radius: 2px; background: linear-gradient(90deg, var(--brand-primary), var(--brand-cyan)); display: inline-block;"></span> Actual Spent</span>
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 3px; height: 12px; background: #f59e0b; display: inline-block;"></span> Planned Target</span>
        </div>
      </div>
      ${barChartHtml}
    </div>

    <!-- Priority Breakdown Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
      <div class="metric-card" style="border-left: 4px solid #ef4444;">
        <div class="metric-info">
          <span class="metric-label" style="color: #ef4444;">Critical Priority</span>
          <span class="metric-value">${priorities.Critical || 0}</span>
          <span class="metric-subtext">Immediate action required</span>
        </div>
      </div>
      <div class="metric-card" style="border-left: 4px solid #f59e0b;">
        <div class="metric-info">
          <span class="metric-label" style="color: #f59e0b;">High Priority</span>
          <span class="metric-value">${priorities.High || 0}</span>
          <span class="metric-subtext">Major milestones</span>
        </div>
      </div>
      <div class="metric-card" style="border-left: 4px solid #3b82f6;">
        <div class="metric-info">
          <span class="metric-label" style="color: #3b82f6;">Medium Priority</span>
          <span class="metric-value">${priorities.Medium || 0}</span>
          <span class="metric-subtext">Standard logistics</span>
        </div>
      </div>
      <div class="metric-card" style="border-left: 4px solid #10b981;">
        <div class="metric-info">
          <span class="metric-label" style="color: #10b981;">Low Priority</span>
          <span class="metric-value">${priorities.Low || 0}</span>
          <span class="metric-subtext">Minor tasks</span>
        </div>
      </div>
    </div>
  `;
}

// Switching workspace tabs
function switchWorkspaceTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content-panel').forEach(panel => panel.style.display = 'none');

  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  const activePanel = document.getElementById(`tabPanel-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activePanel) activePanel.style.display = 'block';
}

function setupWorkspaceEvents() {
  const select = document.getElementById('workspaceEventSelect');
  if (select) {
    select.addEventListener('change', (e) => {
      loadEventWorkspace(e.target.value);
    });
  }

  // Modals form hooks
  const sessionForm = document.getElementById('addSessionForm');
  if (sessionForm) {
    sessionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('schTitle').value,
        startTime: document.getElementById('schStart').value,
        endTime: document.getElementById('schEnd').value,
        venue: document.getElementById('schVenue').value,
        speaker: document.getElementById('schSpeaker').value,
        description: document.getElementById('schDesc').value
      };
      try {
        await apiRequest(`/events/${currentEventId}/schedule`, { method: 'POST', body: payload });
        showToast('Session added to schedule', 'success');
        closeModal('addSessionModal');
        sessionForm.reset();
        loadEventWorkspace(currentEventId);
      } catch (err) {
        handleApiError(err);
      }
    });
  }

  const teamForm = document.getElementById('addTeamForm');
  if (teamForm) {
    teamForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('tmName').value,
        role: document.getElementById('tmRole').value,
        department: document.getElementById('tmDept').value,
        contact: document.getElementById('tmContact').value,
        status: document.getElementById('tmStatus').value
      };
      try {
        await apiRequest(`/events/${currentEventId}/team`, { method: 'POST', body: payload });
        showToast('Team member assigned', 'success');
        closeModal('addTeamModal');
        teamForm.reset();
        loadEventWorkspace(currentEventId);
      } catch (err) {
        handleApiError(err);
      }
    });
  }

  const taskForm = document.getElementById('addTaskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        taskName: document.getElementById('tskName').value,
        category: document.getElementById('tskCat').value,
        assignedMember: document.getElementById('tskMember').value,
        priority: document.getElementById('tskPriority').value,
        deadline: document.getElementById('tskDeadline').value
      };
      try {
        await apiRequest(`/events/${currentEventId}/tasks`, { method: 'POST', body: payload });
        showToast('Task added to checklist', 'success');
        closeModal('addTaskModal');
        taskForm.reset();
        loadEventWorkspace(currentEventId);
      } catch (err) {
        handleApiError(err);
      }
    });
  }

  const expenseForm = document.getElementById('addExpenseForm');
  if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        category: document.getElementById('expCat').value,
        description: document.getElementById('expDesc').value,
        plannedAmount: document.getElementById('expPlanned').value,
        actualAmount: document.getElementById('expActual').value,
        status: document.getElementById('expStatus').value
      };
      try {
        await apiRequest(`/events/${currentEventId}/budget`, { method: 'POST', body: payload });
        showToast('Budget expense recorded', 'success');
        closeModal('addExpenseModal');
        expenseForm.reset();
        loadEventWorkspace(currentEventId);
      } catch (err) {
        handleApiError(err);
      }
    });
  }

  const guestForm = document.getElementById('addGuestForm');
  if (guestForm) {
    guestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('gstName').value,
        designation: document.getElementById('gstDesignation').value,
        organization: document.getElementById('gstOrg').value,
        topic: document.getElementById('gstTopic').value,
        contact: document.getElementById('gstContact').value,
        confirmationStatus: document.getElementById('gstStatus').value
      };
      try {
        await apiRequest(`/events/${currentEventId}/guests`, { method: 'POST', body: payload });
        showToast('Guest/Speaker registered', 'success');
        closeModal('addGuestModal');
        guestForm.reset();
        loadEventWorkspace(currentEventId);
      } catch (err) {
        handleApiError(err);
      }
    });
  }

  const annForm = document.getElementById('addAnnouncementForm');
  if (annForm) {
    annForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('annTitle').value,
        message: document.getElementById('annMessage').value,
        priority: document.getElementById('annPriority').value
      };
      try {
        await apiRequest(`/events/${currentEventId}/announcements`, { method: 'POST', body: payload });
        showToast('Announcement published', 'success');
        closeModal('addAnnouncementModal');
        annForm.reset();
        loadEventWorkspace(currentEventId);
      } catch (err) {
        handleApiError(err);
      }
    });
  }
}

// Modal open helpers
function openAddSessionModal() { openModal('addSessionModal'); }
function openAddTeamModal() { openModal('addTeamModal'); }
function openAddTaskModal() { openModal('addTaskModal'); }
function openAddExpenseModal() { openModal('addExpenseModal'); }
function openAddGuestModal() { openModal('addGuestModal'); }
function openAddAnnouncementModal() { openModal('addAnnouncementModal'); }

// Actions
async function deleteSession(id) {
  if (!confirm('Delete this scheduled session?')) return;
  try {
    await apiRequest(`/schedule/${id}`, { method: 'DELETE' });
    showToast('Session removed', 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}

async function deleteTeamMember(id) {
  if (!confirm('Remove team member from this event?')) return;
  try {
    await apiRequest(`/team/${id}`, { method: 'DELETE' });
    showToast('Team member removed', 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    showToast('Task deleted', 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}

async function toggleTaskStatus(id, currentStatus) {
  const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
  try {
    await apiRequest(`/tasks/${id}`, { method: 'PATCH', body: { status: newStatus } });
    showToast(`Task marked as ${newStatus}`, 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  try {
    await apiRequest(`/budget/${id}`, { method: 'DELETE' });
    showToast('Expense removed', 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}

async function toggleGuestStatus(id, currentStatus) {
  const nextStatus = currentStatus === 'Confirmed' ? 'Pending' : (currentStatus === 'Pending' ? 'Declined' : 'Confirmed');
  try {
    await apiRequest(`/guests/${id}`, { method: 'PATCH', body: { confirmationStatus: nextStatus } });
    showToast(`Guest status updated to ${nextStatus}`, 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}

async function deleteGuest(id) {
  if (!confirm('Remove guest/speaker?')) return;
  try {
    await apiRequest(`/guests/${id}`, { method: 'DELETE' });
    showToast('Guest removed', 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete announcement?')) return;
  try {
    await apiRequest(`/announcements/${id}`, { method: 'DELETE' });
    showToast('Announcement deleted', 'info');
    loadEventWorkspace(currentEventId);
  } catch (err) { handleApiError(err); }
}
