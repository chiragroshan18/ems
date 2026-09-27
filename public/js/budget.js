/* ==========================================================================
   EMS - BUDGET & EXPENSES CONTROLLER
   ========================================================================== */

let budgetData = [];
let eventsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEventsDropdown();
  loadBudget();
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
    handleApiError(err, 'Failed to load events for budget dropdown');
  }
}

async function loadBudget() {
  const eventId = document.getElementById('filterEvent').value;
  const category = document.getElementById('filterCategory').value;
  const status = document.getElementById('filterStatus').value;
  const search = document.getElementById('searchBudget').value.trim();

  let query = '?';
  if (eventId) query += `eventId=${encodeURIComponent(eventId)}&`;
  if (category) query += `category=${encodeURIComponent(category)}&`;
  if (status) query += `status=${encodeURIComponent(status)}&`;
  if (search) query += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await apiRequest(`/budget${query}`);
    const { items, summary, categoryBreakdown } = res.data;
    budgetData = items || [];
    renderBudgetMetrics(summary);
    renderCategoryBreakdown(categoryBreakdown, summary.spent);
    renderBudgetTable(budgetData);
  } catch (err) {
    handleApiError(err, 'Failed to load budget records');
  }
}

function renderBudgetMetrics(summary) {
  document.getElementById('bMetricPlanned').innerText = formatCurrency(summary.planned || 0);
  document.getElementById('bMetricSpent').innerText = formatCurrency(summary.spent || 0);
  document.getElementById('bMetricRemaining').innerText = formatCurrency(summary.remaining || 0);
  document.getElementById('bMetricUtil').innerText = `${summary.utilization || 0}%`;
}

function renderCategoryBreakdown(breakdown, totalSpent) {
  const pieContainer = document.getElementById('budgetPieChartContainer');
  const barContainer = document.getElementById('budgetBarChartContainer');
  if (!breakdown || Object.keys(breakdown).length === 0) {
    if (pieContainer) pieContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No expense category data.</div>';
    if (barContainer) barContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No expense records available to chart.</div>';
    return;
  }

  const categoryPalette = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#64748b'];

  // 1. Donut / Pie Chart Data
  const segments = Object.keys(breakdown).map((cat, idx) => ({
    label: cat,
    value: breakdown[cat].actual,
    color: categoryPalette[idx % categoryPalette.length],
    valueFormatted: formatCurrency(breakdown[cat].actual)
  }));

  if (pieContainer) {
    pieContainer.innerHTML = generateDonutChartSVG(segments, formatCurrency(totalSpent), 'Total Spent');
  }

  // 2. Comparative Dual Bar Chart Data
  const barItems = Object.keys(breakdown).map(cat => ({
    label: cat,
    planned: breakdown[cat].planned,
    actual: breakdown[cat].actual
  }));

  if (barContainer) {
    barContainer.innerHTML = generateDualBarChartHTML(barItems);
  }
}


function renderBudgetTable(items) {
  const tbody = document.getElementById('budgetTableBody');
  const countBadge = document.getElementById('budgetCountBadge');
  if (countBadge) countBadge.innerText = `${items.length} Records`;

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-icon">💰</div>
            <div class="empty-title">No Expenses Found</div>
            <div class="empty-description">Record an expense item to track event spending.</div>
            <button class="btn btn-primary" onclick="openNewExpenseModal()">+ Record Expense</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(b => `
    <tr>
      <td><span class="badge badge-planning">${b.category}</span></td>
      <td>
        <div style="font-weight: 600;">${b.description}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${b.id}</div>
      </td>
      <td><span class="badge badge-ready">${b.eventName}</span></td>
      <td>${formatCurrency(b.plannedAmount)}</td>
      <td style="font-weight: 700; color: var(--brand-primary);">${formatCurrency(b.actualAmount)}</td>
      <td>🗓️ ${formatDate(b.date)}</td>
      <td><span class="badge ${b.status === 'Paid' ? 'badge-completed' : (b.status === 'Committed' ? 'badge-progress' : 'badge-planning')}">${b.status}</span></td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="editExpense('${b.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteExpense('${b.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupEventListeners() {
  document.getElementById('filterEvent').addEventListener('change', loadBudget);
  document.getElementById('filterCategory').addEventListener('change', loadBudget);
  document.getElementById('filterStatus').addEventListener('change', loadBudget);
  document.getElementById('searchBudget').addEventListener('input', () => {
    clearTimeout(window.budgetDebounce);
    window.budgetDebounce = setTimeout(loadBudget, 250);
  });

  const form = document.getElementById('budgetForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const expenseId = document.getElementById('expenseId').value;
      const eventId = document.getElementById('modalEventId').value;

      const payload = {
        category: document.getElementById('expCategory').value,
        description: document.getElementById('expDescription').value,
        plannedAmount: document.getElementById('expPlanned').value,
        actualAmount: document.getElementById('expActual').value,
        date: document.getElementById('expDate').value,
        status: document.getElementById('expStatus').value
      };

      try {
        if (expenseId) {
          await apiRequest(`/budget/${expenseId}`, { method: 'PATCH', body: payload });
          showToast('Expense updated successfully', 'success');
        } else {
          await apiRequest(`/events/${eventId}/budget`, { method: 'POST', body: payload });
          showToast('Expense recorded successfully', 'success');
        }
        closeModal('addExpenseModal');
        form.reset();
        document.getElementById('expenseId').value = '';
        loadBudget();
      } catch (err) {
        handleApiError(err, 'Failed to save expense');
      }
    });
  }
}

function editExpense(id) {
  const item = budgetData.find(b => b.id === id);
  if (!item) return;

  document.getElementById('expenseId').value = item.id;
  document.getElementById('modalEventId').value = item.eventId;
  document.getElementById('expCategory').value = item.category;
  document.getElementById('expDescription').value = item.description;
  document.getElementById('expPlanned').value = item.plannedAmount;
  document.getElementById('expActual').value = item.actualAmount;
  document.getElementById('expDate').value = item.date;
  document.getElementById('expStatus').value = item.status;
  document.getElementById('expenseModalTitle').innerText = '✏️ Edit Budget Expense';

  openModal('addExpenseModal');
}

async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense record?')) return;
  try {
    await apiRequest(`/budget/${id}`, { method: 'DELETE' });
    showToast('Expense record deleted', 'info');
    loadBudget();
  } catch (err) {
    handleApiError(err, 'Failed to delete expense');
  }
}
