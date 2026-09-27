/* ==========================================================================
   EMS - TASKS & CHECKLIST CONTROLLER
   ========================================================================== */

let tasksData = [];
let eventsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEventsDropdown();
  loadTasks();
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
    handleApiError(err, 'Failed to load events for task dropdown');
  }
}

async function loadTasks() {
  const eventId = document.getElementById('filterEvent').value;
  const status = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;
  const sortBy = document.getElementById('sortTasks').value;
  const search = document.getElementById('searchTasks').value.trim();

  let query = `?sortBy=${sortBy}&`;
  if (eventId) query += `eventId=${encodeURIComponent(eventId)}&`;
  if (status) query += `status=${encodeURIComponent(status)}&`;
  if (priority) query += `priority=${encodeURIComponent(priority)}&`;
  if (search) query += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await apiRequest(`/tasks${query}`);
    const taskResponse = res.data;
    tasksData = taskResponse.tasks || [];
    renderTasksProgress(taskResponse);
    renderTasksTable(tasksData);
  } catch (err) {
    handleApiError(err, 'Failed to load operational tasks');
  }
}

function renderTasksProgress(data) {
  const progressFill = document.getElementById('tasksProgressFill');
  const progressText = document.getElementById('tasksProgressText');
  const countsText = document.getElementById('tasksCountsText');

  if (progressFill && progressText) {
    progressFill.style.width = `${data.progressPercentage}%`;
    progressText.innerText = `${data.progressPercentage}% Complete`;
  }
  if (countsText) {
    countsText.innerText = `${data.completed} of ${data.total} tasks completed (${data.pending} pending, ${data.inProgress} in progress)`;
  }
}

function renderTasksTable(tasks) {
  const tbody = document.getElementById('tasksTableBody');
  const countBadge = document.getElementById('tasksCountBadge');
  if (countBadge) countBadge.innerText = `${tasks.length} Tasks`;

  if (!tasks || tasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No Tasks Found</div>
            <div class="empty-description">Create a task to build your event execution checklist.</div>
            <button class="btn btn-primary" onclick="openNewTaskModal()">+ Add New Task</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = tasks.map(t => {
    const isDone = t.status === 'Completed';

    return `
      <tr>
        <td style="width: 100px;">
          <button class="btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}" onclick="toggleTaskStatus('${t.id}', '${t.status}')" style="min-width: 80px;">
            ${isDone ? '✓ Done' : 'Pending'}
          </button>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 14px; ${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.taskName}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            ${t.notes ? `📝 ${t.notes}` : ''}
          </div>
        </td>
        <td><span class="badge badge-planning">${t.category}</span></td>
        <td>👤 ${t.assignedMember}</td>
        <td><span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span></td>
        <td>🗓️ ${formatDate(t.deadline)}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="editTask('${t.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupEventListeners() {
  document.getElementById('filterEvent').addEventListener('change', loadTasks);
  document.getElementById('filterStatus').addEventListener('change', loadTasks);
  document.getElementById('filterPriority').addEventListener('change', loadTasks);
  document.getElementById('sortTasks').addEventListener('change', loadTasks);
  document.getElementById('searchTasks').addEventListener('input', () => {
    clearTimeout(window.taskDebounce);
    window.taskDebounce = setTimeout(loadTasks, 250);
  });

  const form = document.getElementById('taskForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const taskId = document.getElementById('taskId').value;
      const eventId = document.getElementById('modalEventId').value;

      const payload = {
        taskName: document.getElementById('taskName').value,
        category: document.getElementById('taskCategory').value,
        assignedMember: document.getElementById('taskMember').value,
        priority: document.getElementById('taskPriority').value,
        deadline: document.getElementById('taskDeadline').value,
        status: document.getElementById('taskStatus').value,
        notes: document.getElementById('taskNotes').value
      };

      try {
        if (taskId) {
          await apiRequest(`/tasks/${taskId}`, { method: 'PATCH', body: payload });
          showToast('Task updated successfully', 'success');
        } else {
          await apiRequest(`/events/${eventId}/tasks`, { method: 'POST', body: payload });
          showToast('Task added to checklist', 'success');
        }
        closeModal('addTaskModal');
        form.reset();
        document.getElementById('taskId').value = '';
        loadTasks();
      } catch (err) {
        handleApiError(err, 'Failed to save task');
      }
    });
  }
}

function editTask(id) {
  const task = tasksData.find(t => t.id === id);
  if (!task) return;

  document.getElementById('taskId').value = task.id;
  document.getElementById('modalEventId').value = task.eventId;
  document.getElementById('taskName').value = task.taskName;
  document.getElementById('taskCategory').value = task.category;
  document.getElementById('taskMember').value = task.assignedMember;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskDeadline').value = task.deadline;
  document.getElementById('taskStatus').value = task.status;
  document.getElementById('taskNotes').value = task.notes || '';
  document.getElementById('taskModalTitle').innerText = '✏️ Edit Operational Task';

  openModal('addTaskModal');
}

async function toggleTaskStatus(id, currentStatus) {
  const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
  try {
    await apiRequest(`/tasks/${id}`, { method: 'PATCH', body: { status: nextStatus } });
    showToast(`Task marked as ${nextStatus}`, 'info');
    loadTasks();
  } catch (err) {
    handleApiError(err, 'Failed to toggle task status');
  }
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    showToast('Task deleted from checklist', 'info');
    loadTasks();
  } catch (err) {
    handleApiError(err, 'Failed to delete task');
  }
}
