/* ==========================================================================
   EMS - ANNOUNCEMENTS CONTROLLER
   ========================================================================== */

let announcementsData = [];
let eventsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEventsDropdown();
  loadAnnouncements();
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
    handleApiError(err, 'Failed to load events for announcement dropdown');
  }
}

async function loadAnnouncements() {
  const eventId = document.getElementById('filterEvent').value;
  const priority = document.getElementById('filterPriority').value;
  const search = document.getElementById('searchAnnouncements').value.trim();

  let query = '?';
  if (eventId) query += `eventId=${encodeURIComponent(eventId)}&`;
  if (priority) query += `priority=${encodeURIComponent(priority)}&`;
  if (search) query += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await apiRequest(`/announcements${query}`);
    announcementsData = res.data;
    renderAnnouncements(announcementsData);
  } catch (err) {
    handleApiError(err, 'Failed to load broadcasts');
  }
}

function renderAnnouncements(items) {
  const container = document.getElementById('announcementsList');
  const countBadge = document.getElementById('announcementsCountBadge');
  if (countBadge) countBadge.innerText = `${items.length} Broadcasts`;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📢</div>
        <div class="empty-title">No Announcements Found</div>
        <div class="empty-description">Publish an operational update for crew and attendees.</div>
        <button class="btn btn-primary" onclick="openNewAnnouncementModal()">+ Publish Announcement</button>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(a => {
    let badgeClass = 'badge-normal';
    if (a.priority === 'Urgent') badgeClass = 'badge-urgent';
    if (a.priority === 'Important') badgeClass = 'badge-important';

    return `
      <div class="announcement-card priority-${a.priority.toLowerCase()}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge ${badgeClass}">${a.priority} Priority</span>
            <span class="badge badge-planning">${a.eventName}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; color: var(--text-muted);">🕒 ${new Date(a.timestamp).toLocaleString()}</span>
            <button class="btn btn-secondary btn-sm" onclick="editAnnouncement('${a.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAnnouncement('${a.id}')">🗑️</button>
          </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${a.title}</h3>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">${a.message}</p>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  document.getElementById('filterEvent').addEventListener('change', loadAnnouncements);
  document.getElementById('filterPriority').addEventListener('change', loadAnnouncements);
  document.getElementById('searchAnnouncements').addEventListener('input', () => {
    clearTimeout(window.annDebounce);
    window.annDebounce = setTimeout(loadAnnouncements, 250);
  });

  const form = document.getElementById('announcementForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const announcementId = document.getElementById('announcementId').value;
      const eventId = document.getElementById('modalEventId').value;

      const payload = {
        title: document.getElementById('annTitle').value,
        message: document.getElementById('annMessage').value,
        priority: document.getElementById('annPriority').value
      };

      try {
        if (announcementId) {
          await apiRequest(`/announcements/${announcementId}`, { method: 'PATCH', body: payload });
          showToast('Announcement updated', 'success');
        } else {
          await apiRequest(`/events/${eventId}/announcements`, { method: 'POST', body: payload });
          showToast('Announcement published', 'success');
        }
        closeModal('addAnnouncementModal');
        form.reset();
        document.getElementById('announcementId').value = '';
        loadAnnouncements();
      } catch (err) {
        handleApiError(err, 'Failed to save announcement');
      }
    });
  }
}

function editAnnouncement(id) {
  const item = announcementsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('announcementId').value = item.id;
  document.getElementById('modalEventId').value = item.eventId;
  document.getElementById('annTitle').value = item.title;
  document.getElementById('annMessage').value = item.message;
  document.getElementById('annPriority').value = item.priority;
  document.getElementById('annModalTitle').innerText = '✏️ Edit Announcement';

  openModal('addAnnouncementModal');
}

async function deleteAnnouncement(id) {
  if (!confirm('Are you sure you want to delete this announcement?')) return;
  try {
    await apiRequest(`/announcements/${id}`, { method: 'DELETE' });
    showToast('Announcement deleted', 'info');
    loadAnnouncements();
  } catch (err) {
    handleApiError(err, 'Failed to delete announcement');
  }
}
