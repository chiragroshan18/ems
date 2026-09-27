/* ==========================================================================
   EMS - SCHEDULE TIMELINE CONTROLLER
   ========================================================================== */

let scheduleData = [];
let eventsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEventsDropdown();
  loadSchedule();
  setupEventListeners();
});

async function loadEventsDropdown() {
  try {
    const res = await apiRequest('/events');
    eventsList = res.data;
    const filterSelect = document.getElementById('filterEvent');
    const modalSelect = document.getElementById('modalEventId');

    const options = eventsList.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    if (filterSelect) {
      filterSelect.innerHTML = `<option value="">All Events</option>${options}`;
    }
    if (modalSelect) {
      modalSelect.innerHTML = options;
    }
  } catch (err) {
    handleApiError(err, 'Failed to load events for schedule filter');
  }
}

async function loadSchedule() {
  const eventId = document.getElementById('filterEvent').value;
  const status = document.getElementById('filterStatus').value;
  const search = document.getElementById('searchSchedule').value.trim();

  let query = '?';
  if (eventId) query += `eventId=${encodeURIComponent(eventId)}&`;
  if (status) query += `status=${encodeURIComponent(status)}&`;
  if (search) query += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await apiRequest(`/schedule${query}`);
    scheduleData = res.data;
    renderSchedule(scheduleData);
  } catch (err) {
    handleApiError(err, 'Failed to load schedule sessions');
  }
}

function renderSchedule(sessions) {
  const container = document.getElementById('scheduleTimeline');
  const countBadge = document.getElementById('scheduleCountBadge');
  if (countBadge) countBadge.innerText = `${sessions.length} Sessions`;

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏰</div>
        <div class="empty-title">No Sessions Found</div>
        <div class="empty-description">Try adjusting your filters or schedule a new session.</div>
        <button class="btn btn-primary" onclick="openModal('addSessionModal')">+ Schedule Session</button>
      </div>
    `;
    return;
  }

  container.innerHTML = sessions.map(s => `
    <div class="timeline-node">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div class="timeline-meta">
            <span style="font-weight: 700; color: var(--brand-primary);">🕒 ${s.startTime} - ${s.endTime}</span>
            <span>🗓️ ${formatDate(s.date)}</span>
            <span class="badge badge-planning">${s.eventName}</span>
            <span class="badge badge-ready">${s.status}</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="editSession('${s.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')">🗑️</button>
          </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; margin: 4px 0 6px;">${s.title}</h3>
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">
          🎤 <strong>Speaker:</strong> ${s.speaker} · 📍 <strong>Venue:</strong> ${s.venue}
        </div>
        <p style="font-size: 13px; color: var(--text-muted);">${s.description || 'No description provided.'}</p>
      </div>
    </div>
  `).join('');
}

function setupEventListeners() {
  document.getElementById('filterEvent').addEventListener('change', loadSchedule);
  document.getElementById('filterStatus').addEventListener('change', loadSchedule);
  document.getElementById('searchSchedule').addEventListener('input', () => {
    clearTimeout(window.schedDebounce);
    window.schedDebounce = setTimeout(loadSchedule, 250);
  });

  const form = document.getElementById('sessionForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById('sessionId').value;
      const eventId = document.getElementById('modalEventId').value;

      const payload = {
        title: document.getElementById('sessionTitle').value,
        startTime: document.getElementById('sessionStart').value,
        endTime: document.getElementById('sessionEnd').value,
        venue: document.getElementById('sessionVenue').value,
        speaker: document.getElementById('sessionSpeaker').value,
        description: document.getElementById('sessionDesc').value,
        status: document.getElementById('sessionStatus').value
      };

      try {
        if (sessionId) {
          await apiRequest(`/schedule/${sessionId}`, { method: 'PATCH', body: payload });
          showToast('Session updated successfully', 'success');
        } else {
          await apiRequest(`/events/${eventId}/schedule`, { method: 'POST', body: payload });
          showToast('Session scheduled successfully', 'success');
        }
        closeModal('addSessionModal');
        form.reset();
        document.getElementById('sessionId').value = '';
        loadSchedule();
      } catch (err) {
        handleApiError(err, 'Failed to save session');
      }
    });
  }
}

function editSession(id) {
  const session = scheduleData.find(s => s.id === id);
  if (!session) return;

  document.getElementById('sessionId').value = session.id;
  document.getElementById('modalEventId').value = session.eventId;
  document.getElementById('sessionTitle').value = session.title;
  document.getElementById('sessionStart').value = session.startTime;
  document.getElementById('sessionEnd').value = session.endTime;
  document.getElementById('sessionVenue').value = session.venue;
  document.getElementById('sessionSpeaker').value = session.speaker;
  document.getElementById('sessionDesc').value = session.description || '';
  document.getElementById('sessionStatus').value = session.status;
  document.getElementById('sessionModalTitle').innerText = '✏️ Edit Scheduled Session';

  openModal('addSessionModal');
}

async function deleteSession(id) {
  if (!confirm('Are you sure you want to delete this session?')) return;
  try {
    await apiRequest(`/schedule/${id}`, { method: 'DELETE' });
    showToast('Session deleted', 'info');
    loadSchedule();
  } catch (err) {
    handleApiError(err, 'Failed to delete session');
  }
}
