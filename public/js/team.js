/* ==========================================================================
   EMS - TEAM & VOLUNTEERS CONTROLLER
   ========================================================================== */

let teamData = [];
let eventsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEventsDropdown();
  loadTeam();
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
    handleApiError(err, 'Failed to load events for team dropdown');
  }
}

async function loadTeam() {
  const eventId = document.getElementById('filterEvent').value;
  const role = document.getElementById('filterRole').value;
  const status = document.getElementById('filterStatus').value;
  const search = document.getElementById('searchTeam').value.trim();

  let query = '?';
  if (eventId) query += `eventId=${encodeURIComponent(eventId)}&`;
  if (role) query += `role=${encodeURIComponent(role)}&`;
  if (status) query += `status=${encodeURIComponent(status)}&`;
  if (search) query += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await apiRequest(`/team${query}`);
    teamData = res.data;
    renderTeam(teamData);
  } catch (err) {
    handleApiError(err, 'Failed to load team members');
  }
}

function renderTeam(members) {
  const container = document.getElementById('teamGrid');
  const countBadge = document.getElementById('teamCountBadge');
  if (countBadge) countBadge.innerText = `${members.length} Members`;

  if (!members || members.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">👥</div>
        <div class="empty-title">No Team Members Found</div>
        <div class="empty-description">Try adjusting your filters or assign a new crew member.</div>
        <button class="btn btn-primary" onclick="openNewTeamModal()">+ Assign Team Member</button>
      </div>
    `;
    return;
  }

  container.innerHTML = members.map(m => {
    let statusClass = 'badge-planning';
    if (m.status === 'Assigned') statusClass = 'badge-ready';
    if (m.status === 'Available') statusClass = 'badge-completed';
    if (m.status === 'Busy') statusClass = 'badge-progress';

    return `
      <div class="metric-card" style="flex-direction: column; align-items: stretch; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge ${statusClass}">${m.status}</span>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${m.id}</span>
        </div>

        <div>
          <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 2px;">${m.name}</h3>
          <div style="font-size: 13px; font-weight: 600; color: var(--brand-primary);">${m.role}</div>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; background: var(--bg-subtle); padding: 10px 12px; border-radius: var(--radius-sm);">
          <div>🏢 <strong>Dept:</strong> ${m.department || 'Operations'}</div>
          <div>📞 <strong>Contact:</strong> ${m.contact || 'N/A'}</div>
          <div>📅 <strong>Assigned Event:</strong> ${m.eventName}</div>
          <div>📋 <strong>Assigned Tasks:</strong> ${m.tasksCount || 0} tasks</div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px; border-top: 1px solid var(--border-color); padding-top: 10px; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="editTeamMember('${m.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTeamMember('${m.id}')">🗑️ Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  document.getElementById('filterEvent').addEventListener('change', loadTeam);
  document.getElementById('filterRole').addEventListener('change', loadTeam);
  document.getElementById('filterStatus').addEventListener('change', loadTeam);
  document.getElementById('searchTeam').addEventListener('input', () => {
    clearTimeout(window.teamDebounce);
    window.teamDebounce = setTimeout(loadTeam, 250);
  });

  const form = document.getElementById('teamForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const memberId = document.getElementById('teamMemberId').value;
      const eventId = document.getElementById('modalEventId').value;

      const payload = {
        name: document.getElementById('tmName').value,
        role: document.getElementById('tmRole').value,
        department: document.getElementById('tmDept').value,
        contact: document.getElementById('tmContact').value,
        status: document.getElementById('tmStatus').value
      };

      try {
        if (memberId) {
          await apiRequest(`/team/${memberId}`, { method: 'PATCH', body: payload });
          showToast('Team member updated', 'success');
        } else {
          await apiRequest(`/events/${eventId}/team`, { method: 'POST', body: payload });
          showToast('Team member assigned', 'success');
        }
        closeModal('addTeamModal');
        form.reset();
        document.getElementById('teamMemberId').value = '';
        loadTeam();
      } catch (err) {
        handleApiError(err, 'Failed to save team member');
      }
    });
  }
}

function editTeamMember(id) {
  const member = teamData.find(m => m.id === id);
  if (!member) return;

  document.getElementById('teamMemberId').value = member.id;
  document.getElementById('modalEventId').value = member.eventId;
  document.getElementById('tmName').value = member.name;
  document.getElementById('tmRole').value = member.role;
  document.getElementById('tmDept').value = member.department || '';
  document.getElementById('tmContact').value = member.contact || '';
  document.getElementById('tmStatus').value = member.status;
  document.getElementById('teamModalTitle').innerText = '✏️ Edit Team Member';

  openModal('addTeamModal');
}

async function deleteTeamMember(id) {
  if (!confirm('Remove this team member from the event?')) return;
  try {
    await apiRequest(`/team/${id}`, { method: 'DELETE' });
    showToast('Team member removed', 'info');
    loadTeam();
  } catch (err) {
    handleApiError(err, 'Failed to delete team member');
  }
}
