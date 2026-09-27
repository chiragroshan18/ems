/* ==========================================================================
   EMS - DASHBOARD CONTROLLER (COMMAND CENTER)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setupEventListeners();
});

async function loadDashboardData() {
  try {
    const res = await apiRequest('/dashboard');
    renderDashboard(res.data);
  } catch (err) {
    handleApiError(err, 'Failed to load dashboard data');
  }
}

function renderDashboard(data) {
  const { statistics, primaryEventReadiness, upcomingSchedule, recentAnnouncements } = data;

  // 1. Metric Cards
  document.getElementById('metricTotalEvents').innerText = statistics.events.total;
  document.getElementById('metricEventsSub').innerText = `${statistics.events.upcoming} Upcoming · ${statistics.events.active} Active · ${statistics.events.completed} Done`;

  document.getElementById('metricTotalTasks').innerText = statistics.operations.totalTasks;
  document.getElementById('metricTasksSub').innerText = `${statistics.operations.completedTasks} Done (${statistics.operations.taskCompletionRate}%) · ${statistics.operations.pendingTasks} Pending`;

  document.getElementById('metricTeamGuests').innerText = `${statistics.operations.teamMembers} / ${statistics.operations.totalGuests}`;
  document.getElementById('metricTeamSub').innerText = `${statistics.operations.teamMembers} Team · ${statistics.operations.confirmedGuests} Confirmed Speakers`;

  document.getElementById('metricBudgetSpent').innerText = formatCurrency(statistics.finance.totalSpent);
  document.getElementById('metricBudgetSub').innerText = `Planned: ${formatCurrency(statistics.finance.totalPlannedBudget)} · Rem: ${formatCurrency(statistics.finance.remainingBudget)}`;

  // 2. Event Readiness Banner
  const readinessContainer = document.getElementById('dashboardReadinessSection');
  if (primaryEventReadiness) {
    const r = primaryEventReadiness;
    readinessContainer.innerHTML = `
      <div class="readiness-banner">
        <div class="readiness-header">
          <div class="readiness-title-group">
            <h3>⚡ Flagship Readiness: <a href="workspace.html?id=${r.eventId}" style="color: inherit; text-decoration: underline;">${r.eventName}</a></h3>
            <span class="badge badge-ready" style="margin-top: 4px;">Status: ${r.status}</span>
          </div>
          <div class="readiness-percent-badge">
            ${r.readinessPercentage}<span>%</span>
          </div>
        </div>

        <div class="readiness-progress-track">
          <div class="readiness-progress-fill" style="width: ${r.readinessPercentage}%;"></div>
        </div>

        <div class="readiness-factors-grid">
          <div class="factor-item">
            <span class="factor-name">Tasks Completion</span>
            <span class="factor-value">${r.breakdown.tasks.completed} / ${r.breakdown.tasks.total}</span>
            <span class="factor-weight">${r.breakdown.tasks.percentage}% (Weight ${r.breakdown.tasks.weight})</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">Team Roles Assigned</span>
            <span class="factor-value">${r.breakdown.team.assigned} / ${r.breakdown.team.total}</span>
            <span class="factor-weight">${r.breakdown.team.percentage}% (Weight ${r.breakdown.team.weight})</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">Sessions Scheduled</span>
            <span class="factor-value">${r.breakdown.schedule.scheduled} / ${r.breakdown.schedule.total}</span>
            <span class="factor-weight">${r.breakdown.schedule.percentage}% (Weight ${r.breakdown.schedule.weight})</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">Speakers Confirmed</span>
            <span class="factor-value">${r.breakdown.speakers.confirmed} / ${r.breakdown.speakers.total}</span>
            <span class="factor-weight">${r.breakdown.speakers.percentage}% (Weight ${r.breakdown.speakers.weight})</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">Budget Preparation</span>
            <span class="factor-value">${r.breakdown.budget.isPrepared ? 'Prepared' : 'In Review'}</span>
            <span class="factor-weight">${formatCurrency(r.breakdown.budget.spent)} spent (Weight ${r.breakdown.budget.weight})</span>
          </div>
        </div>
      </div>
    `;
  } else {
    readinessContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">No Active Event Selected for Readiness</div>
        <div class="empty-description">Create or activate an event to see dynamic real-time readiness scoring.</div>
        <button class="btn btn-primary" onclick="openModal('addEventModal')">+ Create Event</button>
      </div>
    `;
  }

  // 3. Upcoming Schedule Feed
  const scheduleContainer = document.getElementById('dashboardScheduleFeed');
  if (upcomingSchedule && upcomingSchedule.length > 0) {
    scheduleContainer.innerHTML = upcomingSchedule.map(s => `
      <div class="timeline-node">
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="timeline-meta">
            <span style="font-weight: 700; color: var(--brand-primary);">🕒 ${s.startTime} - ${s.endTime}</span>
            <span>🗓️ ${formatDate(s.date)}</span>
            <span class="badge badge-planning">${s.eventName}</span>
          </div>
          <h4 style="font-size: 15px; margin-bottom: 4px;">${s.title}</h4>
          <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">
            🎤 <strong>${s.speaker}</strong> · 📍 ${s.venue}
          </div>
          <p style="font-size: 12px; color: var(--text-muted);">${s.description || ''}</p>
        </div>
      </div>
    `).join('');
  } else {
    scheduleContainer.innerHTML = `
      <div class="empty-state" style="padding: 30px;">
        <div class="empty-icon">⏰</div>
        <div class="empty-title">No Upcoming Sessions</div>
        <div class="empty-description">All sessions have concluded or none are scheduled yet.</div>
      </div>
    `;
  }

  // 4. Recent Announcements Feed
  const announcementsContainer = document.getElementById('dashboardAnnouncementsFeed');
  if (recentAnnouncements && recentAnnouncements.length > 0) {
    announcementsContainer.innerHTML = recentAnnouncements.map(a => {
      let badgeClass = 'badge-normal';
      if (a.priority === 'Urgent') badgeClass = 'badge-urgent';
      if (a.priority === 'Important') badgeClass = 'badge-important';

      return `
        <div class="broadcast-card priority-${a.priority.toLowerCase()}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="badge ${badgeClass}">${a.priority}</span>
            <span style="font-size: 11px; color: var(--text-muted);">🕒 ${new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <h4 style="font-size: 14px; margin-bottom: 4px;">${a.title}</h4>
          <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${a.message}</p>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">📢 <strong>${a.eventName}</strong></div>
        </div>
      `;
    }).join('');
  } else {
    announcementsContainer.innerHTML = `
      <div class="empty-state" style="padding: 30px;">
        <div class="empty-icon">📢</div>
        <div class="empty-title">No Active Announcements</div>
        <div class="empty-description">Broadcasts published by organizers will appear here.</div>
      </div>
    `;
  }
}

function setupEventListeners() {
  // Create Event Form Submission
  const eventForm = document.getElementById('createEventForm');
  if (eventForm) {
    eventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = eventForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerText = 'Creating Event...';

      const payload = {
        name: document.getElementById('evtName').value,
        type: document.getElementById('evtType').value,
        venue: document.getElementById('evtVenue').value,
        date: document.getElementById('evtDate').value,
        startTime: document.getElementById('evtStartTime').value,
        endTime: document.getElementById('evtEndTime').value,
        organizer: document.getElementById('evtOrganizer').value,
        expectedParticipants: document.getElementById('evtParticipants').value,
        plannedBudget: document.getElementById('evtBudget').value,
        description: document.getElementById('evtDescription').value,
        status: document.getElementById('evtStatus').value
      };

      try {
        const res = await apiRequest('/events', {
          method: 'POST',
          body: payload
        });
        showToast(`Event '${res.data.name}' created successfully!`, 'success');
        closeModal('addEventModal');
        eventForm.reset();
        loadDashboardData();
      } catch (err) {
        handleApiError(err, 'Failed to create event');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Create Event';
      }
    });
  }
}
