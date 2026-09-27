/* ==========================================================================
   EMS - UNIFIED API CLIENT, NOTIFICATIONS & SHARED CONTROLS
   ========================================================================== */

const API_BASE = '/api';

/**
 * Reusable Fetch API Wrapper
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') || endpoint.startsWith('/api') 
    ? endpoint 
    : `${API_BASE}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || 'API request failed');
      err.status = response.status;
      err.errors = data.errors || null;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${config.method || 'GET'} ${url}:`, error);
    throw error;
  }
}

/**
 * High-Contrast Toast Notification System
 */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `
    <span style="font-weight: 800; font-size: 16px;">${icon}</span>
    <span style="flex: 1;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutToast 0.3s forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

function handleApiError(error, defaultMessage = 'An unexpected error occurred') {
  if (error.errors && Array.isArray(error.errors)) {
    showToast(error.errors.join(' | '), 'error');
  } else {
    showToast(error.message || defaultMessage, 'error');
  }
}

/**
 * Currency & Date Formatters
 */
function formatCurrency(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN');
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateString;
  } catch (e) {
    return dateString;
  }
}

/**
 * Visual Vector Donut/Pie Chart Generator (Zero External Libraries)
 */
function generateDonutChartSVG(segments, centerValue = '', centerLabel = '') {
  const total = segments.reduce((sum, s) => sum + Number(s.value || 0), 0);
  if (total === 0) {
    return `
      <div style="display: flex; align-items: center; justify-content: center; height: 160px; color: var(--text-muted); font-size: 13px;">
        No data available to chart
      </div>
    `;
  }

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const circles = segments.map((seg) => {
    const val = Number(seg.value || 0);
    if (val <= 0) return '';
    const fraction = val / total;
    const strokeDash = fraction * circumference;
    const offset = accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return `
      <circle cx="100" cy="100" r="${radius}" fill="transparent"
        stroke="${seg.color}" stroke-width="26"
        stroke-dasharray="${strokeDash} ${circumference}"
        stroke-dashoffset="-${offset}"
        stroke-linecap="round"
        transform="rotate(-90 100 100)"
        style="transition: stroke-dasharray 0.8s ease; cursor: pointer;">
        <title>${seg.label}: ${seg.valueFormatted || val} (${Math.round(fraction * 100)}%)</title>
      </circle>
    `;
  }).join('');

  const legendHtml = segments.map(seg => {
    const val = Number(seg.value || 0);
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return `
      <div class="legend-item">
        <span style="display: flex; align-items: center;">
          <span class="legend-color-dot" style="background: ${seg.color};"></span>
          <span>${seg.label}</span>
        </span>
        <span style="font-weight: 700;">${seg.valueFormatted || val} <span style="font-weight: 400; color: var(--text-muted); font-size: 11px;">(${pct}%)</span></span>
      </div>
    `;
  }).join('');

  return `
    <div class="chart-body-flex">
      <div class="donut-chart-container">
        <svg viewBox="0 0 200 200" width="180" height="180">
          <circle cx="100" cy="100" r="${radius}" fill="transparent" stroke="var(--border-color)" stroke-width="26" opacity="0.3" />
          ${circles}
        </svg>
        <div class="donut-center-text">
          <div class="donut-center-value">${centerValue}</div>
          <div class="donut-center-label">${centerLabel}</div>
        </div>
      </div>
      <div class="chart-legend">
        ${legendHtml}
      </div>
    </div>
  `;
}

/**
 * Visual Comparative Bar Chart Generator (Zero External Libraries)
 */
function generateDualBarChartHTML(items) {
  if (!items || items.length === 0) {
    return '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No expense records available to chart.</div>';
  }

  const maxVal = Math.max(...items.map(i => Math.max(Number(i.planned || 0), Number(i.actual || 0))), 1);

  return `
    <div class="bar-chart-container">
      ${items.map(item => {
        const actual = Number(item.actual || 0);
        const planned = Number(item.planned || 0);
        const actualPct = Math.min(100, Math.round((actual / maxVal) * 100));
        const plannedPct = Math.min(100, Math.round((planned / maxVal) * 100));
        const utilPct = planned > 0 ? Math.round((actual / planned) * 100) : 0;

        let utilClass = 'badge-planning';
        if (utilPct > 100) utilClass = 'badge-critical';
        else if (utilPct >= 80) utilClass = 'badge-high';
        else utilClass = 'badge-low';

        return `
          <div class="bar-row">
            <div class="bar-row-header">
              <span><strong>${item.label}</strong></span>
              <span>
                <strong style="color: var(--brand-primary);">${formatCurrency(actual)}</strong>
                <span style="color: var(--text-muted); font-size: 12px; margin-left: 4px;">/ Planned ${formatCurrency(planned)}</span>
                <span class="badge ${utilClass}" style="margin-left: 8px;">${utilPct}%</span>
              </span>
            </div>
            <div class="bar-track-dual" title="Spent: ${formatCurrency(actual)} of Planned: ${formatCurrency(planned)}">
              <div class="bar-fill-actual" style="width: ${actualPct}%;"></div>
              <div class="bar-fill-planned-marker" style="left: ${plannedPct}%;" title="Planned Target: ${formatCurrency(planned)}"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Modal Architecture Helpers
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    const anyOpen = document.querySelector('.modal-backdrop.active');
    if (!anyOpen) {
      document.body.classList.remove('modal-open');
    }
  }
}

// Global modal backdrop close & Esc key handling
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
    const anyOpen = document.querySelector('.modal-backdrop.active');
    if (!anyOpen) {
      document.body.classList.remove('modal-open');
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.modal-backdrop.active');
    openModals.forEach(m => m.classList.remove('active'));
    document.body.classList.remove('modal-open');
  }
  // Global search shortcut Ctrl+K
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearchModal();
  }
});

/**
 * Theme Engine (Light / Dark Mode with Persistence)
 */
function initTheme() {
  const savedTheme = localStorage.getItem('ems_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ems_theme', next);
  updateThemeIcon(next);
  showToast(`Switched to ${next} theme`, 'info');
}

function updateThemeIcon(theme) {
  const btn = document.querySelector('.theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    btn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
  }
}

/**
 * Global Search Modal Engine
 */
function openSearchModal() {
  let modal = document.getElementById('globalSearchModal');
  if (!modal) {
    createGlobalSearchModal();
    modal = document.getElementById('globalSearchModal');
  }
  openModal('globalSearchModal');
  const input = document.getElementById('globalSearchInput');
  if (input) {
    input.value = '';
    input.focus();
    document.getElementById('globalSearchResults').innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
        Type to search across events, tasks, schedules, team members, and speakers...
      </div>
    `;
  }
}

function createGlobalSearchModal() {
  const modalHtml = `
    <div id="globalSearchModal" class="modal-backdrop">
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
            <span style="font-size: 18px; color: var(--text-muted);">🔍</span>
            <input type="text" id="globalSearchInput" class="form-control" placeholder="Search events, tasks, team, schedules, speakers... (Press Esc to close)" style="border: none; background: transparent; font-size: 16px; box-shadow: none;">
          </div>
          <button class="modal-close-btn" onclick="closeModal('globalSearchModal')">&times;</button>
        </div>
        <div class="modal-body" id="globalSearchResults" style="max-height: 400px;">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const searchInput = document.getElementById('globalSearchInput');
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();
    if (!query) {
      document.getElementById('globalSearchResults').innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
          Type to search across events, tasks, schedules, team members, and speakers...
        </div>
      `;
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await apiRequest(`/search?q=${encodeURIComponent(query)}`);
        renderGlobalSearchResults(res.data);
      } catch (err) {
        document.getElementById('globalSearchResults').innerHTML = `
          <div style="text-align: center; color: var(--status-danger); padding: 30px 0;">
            ${err.message || 'Search failed'}
          </div>
        `;
      }
    }, 250);
  });
}

function renderGlobalSearchResults(data) {
  const container = document.getElementById('globalSearchResults');
  if (!data || data.totalMatches === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
        No results found for "<strong>${data.query}</strong>"
      </div>
    `;
    return;
  }

  let html = `<div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Found ${data.totalMatches} matches:</div>`;

  if (data.results.events.length > 0) {
    html += `<h4 style="font-size: 13px; color: var(--brand-primary); margin: 12px 0 6px;">📅 Events (${data.results.events.length})</h4>`;
    data.results.events.forEach(e => {
      html += `
        <a href="workspace.html?id=${e.id}" class="search-result-item" style="display: block; padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 6px; color: var(--text-primary);">
          <div style="font-weight: 700;">${e.name} <span class="badge badge-planning" style="margin-left: 8px;">${e.type}</span></div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">📍 ${e.venue} | 🗓️ ${e.date} | Status: ${e.status}</div>
        </a>
      `;
    });
  }

  if (data.results.tasks.length > 0) {
    html += `<h4 style="font-size: 13px; color: var(--brand-primary); margin: 16px 0 6px;">📋 Tasks (${data.results.tasks.length})</h4>`;
    data.results.tasks.forEach(t => {
      html += `
        <a href="tasks.html" class="search-result-item" style="display: block; padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 6px; color: var(--text-primary);">
          <div style="font-weight: 600;">${t.taskName}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">👤 ${t.assignedMember} | ⚡ Priority: ${t.priority} | Status: ${t.status}</div>
        </a>
      `;
    });
  }

  if (data.results.schedule.length > 0) {
    html += `<h4 style="font-size: 13px; color: var(--brand-primary); margin: 16px 0 6px;">⏰ Sessions (${data.results.schedule.length})</h4>`;
    data.results.schedule.forEach(s => {
      html += `
        <a href="schedule.html" class="search-result-item" style="display: block; padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 6px; color: var(--text-primary);">
          <div style="font-weight: 600;">${s.title}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">🎤 ${s.speaker} | 🕒 ${s.startTime} - ${s.endTime} | 📍 ${s.venue}</div>
        </a>
      `;
    });
  }

  if (data.results.team.length > 0) {
    html += `<h4 style="font-size: 13px; color: var(--brand-primary); margin: 16px 0 6px;">👥 Team Members (${data.results.team.length})</h4>`;
    data.results.team.forEach(m => {
      html += `
        <a href="team.html" class="search-result-item" style="display: block; padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 6px; color: var(--text-primary);">
          <div style="font-weight: 600;">${m.name} <span class="badge badge-ready" style="margin-left: 8px;">${m.role}</span></div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">🏢 ${m.department} | 📞 ${m.contact}</div>
        </a>
      `;
    });
  }

  if (data.results.guests.length > 0) {
    html += `<h4 style="font-size: 13px; color: var(--brand-primary); margin: 16px 0 6px;">🎙️ Guests & Speakers (${data.results.guests.length})</h4>`;
    data.results.guests.forEach(g => {
      html += `
        <a href="guests.html" class="search-result-item" style="display: block; padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 6px; color: var(--text-primary);">
          <div style="font-weight: 600;">${g.name} (${g.designation})</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">🏛️ ${g.organization} | 🎯 Topic: ${g.topic} | Status: ${g.confirmationStatus}</div>
        </a>
      `;
    });
  }

  container.innerHTML = html;
}



/**
 * Demo Data Controls (Clear & Restore Sample Data)
 */
async function clearApplicationData(callback) {
  if (!confirm('Are you sure you want to clear all application data? Dashboard counts will drop to 0 to demonstrate dynamic data binding.')) {
    return;
  }
  try {
    const res = await apiRequest('/data/clear', { method: 'POST' });
    showToast('All application data cleared (0 records)', 'info');
    if (typeof callback === 'function') {
      callback(res.data);
    } else {
      setTimeout(() => window.location.reload(), 600);
    }
  } catch (err) {
    handleApiError(err, 'Failed to clear application data');
  }
}

async function restoreSampleData(callback) {
  try {
    const res = await apiRequest('/data/restore', { method: 'POST' });
    showToast('Realistic sample data restored successfully', 'success');
    if (typeof callback === 'function') {
      callback(res.data);
    } else {
      setTimeout(() => window.location.reload(), 600);
    }
  } catch (err) {
    handleApiError(err, 'Failed to restore sample data');
  }
}

/**
 * Dedicated Standalone Print Engine (Event Summary Report)
 */
async function printEventSummaryReport(eventId) {
  try {
    showToast('Generating official event summary dossier...', 'info');
    const [eventRes, schedRes, teamRes, tasksRes, budgetRes, guestsRes] = await Promise.all([
      apiRequest(`/events/${eventId}`),
      apiRequest(`/events/${eventId}/schedule`),
      apiRequest(`/events/${eventId}/team`),
      apiRequest(`/events/${eventId}/tasks`),
      apiRequest(`/events/${eventId}/budget`),
      apiRequest(`/events/${eventId}/guests`)
    ]);

    const event = eventRes.data;
    const schedule = schedRes.data || [];
    const team = teamRes.data || [];
    const tasks = (tasksRes.data && tasksRes.data.tasks) || [];
    const budget = budgetRes.data || { items: [], summary: {} };
    const guests = guestsRes.data || [];
    const readiness = event.readiness || { readinessPercentage: 0, breakdown: {} };

    const printWin = window.open('', '_blank', 'width=900,height=950');
    if (!printWin) {
      showToast('Popup blocker prevented print window from opening. Please allow popups.', 'error');
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>EMS Event Dossier - ${event.name}</title>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 16mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand-title { font-size: 22px; font-weight: 800; color: #4f46e5; margin: 0; }
          .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e0e7ff; color: #3730a3; }
          .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 18px 0 10px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; }
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
          .info-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .info-val { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px; }
          td { padding: 6px 10px; border: 1px solid #e2e8f0; }
          .readiness-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
          .readiness-score { font-size: 26px; font-weight: 800; color: #15803d; }
          .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-title">EMS — EVENT OPERATIONS COMMAND DOSSIER</div>
            <div class="brand-sub">Comprehensive Event Planning & Execution Report</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">${event.status}</span>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">ID: ${event.id}</div>
          </div>
        </div>

        <div class="readiness-box">
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase;">Event Readiness Index</div>
            <div style="font-size: 11px; color: #15803d;">Calculated Preparation Metric across Tasks, Team, Sessions, Speakers & Budget</div>
          </div>
          <div class="readiness-score">${readiness.readinessPercentage}%</div>
        </div>

        <div class="section-title">1. Event Overview</div>
        <div class="grid-2">
          <div class="info-box"><div class="info-label">Event Name</div><div class="info-val">${event.name}</div></div>
          <div class="info-box"><div class="info-label">Event Category / Type</div><div class="info-val">${event.type}</div></div>
          <div class="info-box"><div class="info-label">Venue & Location</div><div class="info-val">${event.venue}</div></div>
          <div class="info-box"><div class="info-label">Date & Timing</div><div class="info-val">${formatDate(event.date)} (${event.startTime} - ${event.endTime})</div></div>
          <div class="info-box"><div class="info-label">Lead Organizer</div><div class="info-val">${event.organizer}</div></div>
          <div class="info-box"><div class="info-label">Expected Participants</div><div class="info-val">${event.expectedParticipants} Delegates</div></div>
        </div>

        <div class="section-title">2. Financial Budget Summary</div>
        <div class="grid-4">
          <div class="info-box"><div class="info-label">Planned Budget</div><div class="info-val">${formatCurrency(budget.summary.planned || event.plannedBudget)}</div></div>
          <div class="info-box"><div class="info-label">Total Spent</div><div class="info-val">${formatCurrency(budget.summary.spent || 0)}</div></div>
          <div class="info-box"><div class="info-label">Remaining Balance</div><div class="info-val">${formatCurrency(budget.summary.remaining || 0)}</div></div>
          <div class="info-box"><div class="info-label">Budget Utilization</div><div class="info-val">${budget.summary.utilization || 0}%</div></div>
        </div>

        <div class="section-title">3. Scheduled Sessions (${schedule.length})</div>
        <table>
          <thead><tr><th>Time</th><th>Session Title</th><th>Speaker</th><th>Venue/Room</th><th>Status</th></tr></thead>
          <tbody>
            ${schedule.map(s => `<tr><td>${s.startTime} - ${s.endTime}</td><td><strong>${s.title}</strong></td><td>${s.speaker}</td><td>${s.venue}</td><td>${s.status}</td></tr>`).join('')}
          </tbody>
        </table>

        <div class="section-title">4. Assigned Team & Coordinators (${team.length})</div>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Contact</th><th>Status</th></tr></thead>
          <tbody>
            ${team.map(t => `<tr><td><strong>${t.name}</strong></td><td>${t.role}</td><td>${t.department}</td><td>${t.contact}</td><td>${t.status}</td></tr>`).join('')}
          </tbody>
        </table>

        <div class="section-title">5. Critical Tasks & Checklists (${tasks.length})</div>
        <table>
          <thead><tr><th>Task Name</th><th>Assigned Member</th><th>Priority</th><th>Deadline</th><th>Status</th></tr></thead>
          <tbody>
            ${tasks.map(t => `<tr><td>${t.taskName}</td><td>${t.assignedMember}</td><td>${t.priority}</td><td>${t.deadline}</td><td><strong>${t.status}</strong></td></tr>`).join('')}
          </tbody>
        </table>

        <div class="section-title">6. Honored Guests & Keynote Speakers (${guests.length})</div>
        <table>
          <thead><tr><th>Speaker / Guest</th><th>Designation & Organization</th><th>Topic</th><th>Confirmation</th></tr></thead>
          <tbody>
            ${guests.map(g => `<tr><td><strong>${g.name}</strong></td><td>${g.designation} (${g.organization})</td><td>${g.topic}</td><td>${g.confirmationStatus}</td></tr>`).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Generated by EMS (Event Management System) — Cloud-Ready Micro-Project</div>
          <div>Report Timestamp: ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();

    printWin.onload = function() {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 350);
    };
  } catch (err) {
    handleApiError(err, 'Failed to generate event summary dossier');
  }
}

// Auto-initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});
