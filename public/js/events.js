/* ==========================================================================
   EMS - EVENTS CONTROLLER
   ========================================================================== */

let eventsData = [];

document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  setupEventListeners();
});

async function loadEvents() {
  const status = document.getElementById('filterStatus').value;
  const type = document.getElementById('filterType').value;
  const sortBy = document.getElementById('sortEvents').value;
  const search = document.getElementById('searchEvents').value.trim();

  let query = `?sortBy=${sortBy}`;
  if (status) query += `&status=${encodeURIComponent(status)}`;
  if (type) query += `&type=${encodeURIComponent(type)}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;

  try {
    const res = await apiRequest(`/events${query}`);
    eventsData = res.data;
    renderEvents(eventsData);
  } catch (err) {
    handleApiError(err, 'Failed to load events');
  }
}

function renderEvents(events) {
  const container = document.getElementById('eventsGrid');
  const countBadge = document.getElementById('eventsCountBadge');
  if (countBadge) {
    countBadge.innerText = `${events.length} Events`;
  }

  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📅</div>
        <div class="empty-title">No Events Found</div>
        <div class="empty-description">Try adjusting your filters or create a new event.</div>
        <button class="btn btn-primary" onclick="openModal('addEventModal')">+ Create Event</button>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(e => {
    let badgeClass = 'badge-planning';
    if (e.status === 'Ready') badgeClass = 'badge-ready';
    if (e.status === 'In Progress') badgeClass = 'badge-progress';
    if (e.status === 'Completed') badgeClass = 'badge-completed';
    if (e.status === 'Cancelled') badgeClass = 'badge-cancelled';

    return `
      <div class="metric-card" style="flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div>
            <span class="badge ${badgeClass}">${e.status}</span>
            <span class="badge badge-planning" style="margin-left: 6px;">${e.type}</span>
          </div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${e.id}</div>
        </div>

        <div>
          <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 6px;">
            <a href="workspace.html?id=${e.id}" style="color: inherit;">${e.name}</a>
          </h3>
          <p style="font-size: 13px; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${e.description || 'No description provided.'}
          </p>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border-color); padding-top: 12px;">
          <div>📍 <strong>Venue:</strong> ${e.venue}</div>
          <div>🗓️ <strong>Date:</strong> ${formatDate(e.date)} (${e.startTime} - ${e.endTime})</div>
          <div>👤 <strong>Organizer:</strong> ${e.organizer}</div>
          <div>👥 <strong>Expected:</strong> ${e.expectedParticipants} Delegates · 💰 <strong>Budget:</strong> ${formatCurrency(e.plannedBudget)}</div>
        </div>

        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Readiness Index</span>
          <span style="font-size: 15px; font-weight: 800; color: var(--brand-primary);">${e.readinessScore || 0}%</span>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px; border-top: 1px solid var(--border-color); padding-top: 12px;">
          <a href="workspace.html?id=${e.id}" class="btn btn-primary btn-sm" style="flex: 1;">🚀 Workspace</a>
          <button class="btn btn-secondary btn-sm" onclick="openEditEventModal('${e.id}')" title="Edit Event">✏️</button>
          <button class="btn btn-secondary btn-sm" onclick="printEventSummaryReport('${e.id}')" title="Print Event Dossier PDF">🖨️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}', '${e.name.replace(/'/g, "\\'")}')" title="Delete Event">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function openEditEventModal(id) {
  const event = eventsData.find(e => e.id === id);
  if (!event) return;

  document.getElementById('editEvtId').value = event.id;
  document.getElementById('editEvtName').value = event.name;
  document.getElementById('editEvtType').value = event.type;
  document.getElementById('editEvtVenue').value = event.venue;
  document.getElementById('editEvtDate').value = event.date;
  document.getElementById('editEvtStartTime').value = event.startTime;
  document.getElementById('editEvtEndTime').value = event.endTime;
  document.getElementById('editEvtOrganizer').value = event.organizer;
  document.getElementById('editEvtParticipants').value = event.expectedParticipants;
  document.getElementById('editEvtBudget').value = event.plannedBudget;
  document.getElementById('editEvtDescription').value = event.description || '';
  document.getElementById('editEvtStatus').value = event.status;

  openModal('editEventModal');
}

async function deleteEvent(id, name) {
  if (!confirm(`Are you sure you want to delete event '${name}'? This will also remove all associated schedules, tasks, and budgets.`)) {
    return;
  }

  try {
    await apiRequest(`/events/${id}`, { method: 'DELETE' });
    showToast(`Event '${name}' deleted successfully`, 'info');
    loadEvents();
  } catch (err) {
    handleApiError(err, 'Failed to delete event');
  }
}

function setupEventListeners() {
  document.getElementById('filterStatus').addEventListener('change', loadEvents);
  document.getElementById('filterType').addEventListener('change', loadEvents);
  document.getElementById('sortEvents').addEventListener('change', loadEvents);
  document.getElementById('searchEvents').addEventListener('input', () => {
    clearTimeout(window.searchDebounce);
    window.searchDebounce = setTimeout(loadEvents, 250);
  });

  // Create Form
  const createForm = document.getElementById('createEventForm');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
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
        const res = await apiRequest('/events', { method: 'POST', body: payload });
        showToast(`Event '${res.data.name}' created successfully`, 'success');
        closeModal('addEventModal');
        createForm.reset();
        loadEvents();
      } catch (err) {
        handleApiError(err, 'Failed to create event');
      }
    });
  }

  // Edit Form
  const editForm = document.getElementById('editEventForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editEvtId').value;
      const payload = {
        name: document.getElementById('editEvtName').value,
        type: document.getElementById('editEvtType').value,
        venue: document.getElementById('editEvtVenue').value,
        date: document.getElementById('editEvtDate').value,
        startTime: document.getElementById('editEvtStartTime').value,
        endTime: document.getElementById('editEvtEndTime').value,
        organizer: document.getElementById('editEvtOrganizer').value,
        expectedParticipants: document.getElementById('editEvtParticipants').value,
        plannedBudget: document.getElementById('editEvtBudget').value,
        description: document.getElementById('editEvtDescription').value,
        status: document.getElementById('editEvtStatus').value
      };

      try {
        const res = await apiRequest(`/events/${id}`, { method: 'PATCH', body: payload });
        showToast(`Event '${res.data.name}' updated successfully`, 'success');
        closeModal('editEventModal');
        loadEvents();
      } catch (err) {
        handleApiError(err, 'Failed to update event');
      }
    });
  }
}
