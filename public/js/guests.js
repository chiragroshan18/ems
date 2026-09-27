/* ==========================================================================
   EMS - GUESTS & SPEAKERS CONTROLLER
   ========================================================================== */

let guestsData = [];
let eventsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEventsDropdown();
  loadGuests();
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
    handleApiError(err, 'Failed to load events for guest dropdown');
  }
}

async function loadGuests() {
  const eventId = document.getElementById('filterEvent').value;
  const status = document.getElementById('filterStatus').value;
  const search = document.getElementById('searchGuests').value.trim();

  let query = '?';
  if (eventId) query += `eventId=${encodeURIComponent(eventId)}&`;
  if (status) query += `status=${encodeURIComponent(status)}&`;
  if (search) query += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await apiRequest(`/guests${query}`);
    guestsData = res.data;
    renderGuests(guestsData);
  } catch (err) {
    handleApiError(err, 'Failed to load guests and speakers');
  }
}

function renderGuests(guests) {
  const container = document.getElementById('guestsGrid');
  const countBadge = document.getElementById('guestsCountBadge');
  if (countBadge) countBadge.innerText = `${guests.length} Speakers`;

  if (!guests || guests.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎙️</div>
        <div class="empty-title">No Guests or Speakers Found</div>
        <div class="empty-description">Try adjusting your filters or register a new keynote speaker.</div>
        <button class="btn btn-primary" onclick="openNewGuestModal()">+ Register Speaker</button>
      </div>
    `;
    return;
  }

  container.innerHTML = guests.map(g => {
    let badgeClass = 'badge-planning';
    if (g.confirmationStatus === 'Confirmed') badgeClass = 'badge-completed';
    if (g.confirmationStatus === 'Declined') badgeClass = 'badge-cancelled';

    return `
      <div class="metric-card" style="flex-direction: column; align-items: stretch; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge ${badgeClass}">${g.confirmationStatus}</span>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${g.id}</span>
        </div>

        <div>
          <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 2px;">${g.name}</h3>
          <div style="font-size: 13px; font-weight: 600; color: var(--brand-primary);">${g.designation} · ${g.organization}</div>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px; background: var(--bg-subtle); padding: 10px 12px; border-radius: var(--radius-sm);">
          <div>🎯 <strong>Topic:</strong> ${g.topic}</div>
          <div>⏰ <strong>Session:</strong> ${g.sessionTitle || g.session}</div>
          <div>📅 <strong>Event:</strong> ${g.eventName}</div>
          <div>📞 <strong>Contact:</strong> ${g.contact || 'No contact provided'}</div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px; border-top: 1px solid var(--border-color); padding-top: 10px; justify-content: space-between; align-items: center;">
          <button class="btn btn-secondary btn-sm" onclick="toggleConfirmationStatus('${g.id}', '${g.confirmationStatus}')">Toggle Status</button>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="editGuest('${g.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteGuest('${g.id}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  document.getElementById('filterEvent').addEventListener('change', loadGuests);
  document.getElementById('filterStatus').addEventListener('change', loadGuests);
  document.getElementById('searchGuests').addEventListener('input', () => {
    clearTimeout(window.guestDebounce);
    window.guestDebounce = setTimeout(loadGuests, 250);
  });

  const form = document.getElementById('guestForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const guestId = document.getElementById('guestId').value;
      const eventId = document.getElementById('modalEventId').value;

      const payload = {
        name: document.getElementById('gstName').value,
        designation: document.getElementById('gstDesignation').value,
        organization: document.getElementById('gstOrg').value,
        topic: document.getElementById('gstTopic').value,
        session: document.getElementById('gstSession').value,
        contact: document.getElementById('gstContact').value,
        confirmationStatus: document.getElementById('gstStatus').value
      };

      try {
        if (guestId) {
          await apiRequest(`/guests/${guestId}`, { method: 'PATCH', body: payload });
          showToast('Guest/Speaker updated', 'success');
        } else {
          await apiRequest(`/events/${eventId}/guests`, { method: 'POST', body: payload });
          showToast('Guest/Speaker registered', 'success');
        }
        closeModal('addGuestModal');
        form.reset();
        document.getElementById('guestId').value = '';
        loadGuests();
      } catch (err) {
        handleApiError(err, 'Failed to save guest');
      }
    });
  }
}

function editGuest(id) {
  const guest = guestsData.find(g => g.id === id);
  if (!guest) return;

  document.getElementById('guestId').value = guest.id;
  document.getElementById('modalEventId').value = guest.eventId;
  document.getElementById('gstName').value = guest.name;
  document.getElementById('gstDesignation').value = guest.designation;
  document.getElementById('gstOrg').value = guest.organization;
  document.getElementById('gstTopic').value = guest.topic;
  document.getElementById('gstSession').value = guest.session;
  document.getElementById('gstContact').value = guest.contact || '';
  document.getElementById('gstStatus').value = guest.confirmationStatus;
  document.getElementById('guestModalTitle').innerText = '✏️ Edit Guest / Speaker';

  openModal('addGuestModal');
}

async function toggleConfirmationStatus(id, currentStatus) {
  const nextStatus = currentStatus === 'Confirmed' ? 'Pending' : (currentStatus === 'Pending' ? 'Declined' : 'Confirmed');
  try {
    await apiRequest(`/guests/${id}`, { method: 'PATCH', body: { confirmationStatus: nextStatus } });
    showToast(`Status updated to ${nextStatus}`, 'info');
    loadGuests();
  } catch (err) {
    handleApiError(err, 'Failed to toggle status');
  }
}

async function deleteGuest(id) {
  if (!confirm('Remove this speaker/guest?')) return;
  try {
    await apiRequest(`/guests/${id}`, { method: 'DELETE' });
    showToast('Guest removed', 'info');
    loadGuests();
  } catch (err) {
    handleApiError(err, 'Failed to delete guest');
  }
}
