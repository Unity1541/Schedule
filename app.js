const adminPassword = 'admin123';

let state = {
  tasks: [
    { id: 1, name: '專案規劃', startDate: '2025-01-01', endDate: '2025-01-10', progress: 100, color: '#3b82f6', assignee: '張三', status: 'completed' },
    { id: 2, name: '設計階段', startDate: '2025-01-08', endDate: '2025-01-20', progress: 75, color: '#10b981', assignee: '李四', status: 'in-progress' },
    { id: 3, name: '開發階段', startDate: '2025-01-15', endDate: '2025-02-10', progress: 30, color: '#f59e0b', assignee: '王五', status: 'in-progress' },
    { id: 4, name: '測試階段', startDate: '2025-02-05', endDate: '2025-02-20', progress: 0, color: '#ef4444', assignee: '趙六', status: 'pending' }
  ],
  viewMode: 'client',
  isAuthenticated: false,
  showAddForm: false,
  editingTask: null,
  password: '',
  draggedTask: null,
  dragStart: null
};

function setState(updates) {
  state = { ...state, ...updates };
  render();
}

function getDateRange() {
  const allDates = state.tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
  let minDate = new Date(Math.min(...allDates));
  let maxDate = new Date(Math.max(...allDates));
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 14);
  return { minDate, maxDate };
}

function generateDateGrid() {
  const { minDate, maxDate } = getDateRange();
  const dates = [];
  let current = new Date(minDate);
  while (current <= maxDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function calculateTaskPosition(task) {
  const { minDate } = getDateRange();
  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);
  const startDays = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
  const duration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return { startDays, duration };
}

function getStatusText(status) {
  if (status === 'completed') return '已完成';
  if (status === 'in-progress') return '進行中';
  if (status === 'pending') return '待開始';
  return '未知';
}

function getStatusClass(status) {
  if (status === 'completed') return 'badge completed';
  if (status === 'in-progress') return 'badge in-progress';
  if (status === 'pending') return 'badge pending';
  return 'badge';
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Top bar
  const topBar = document.createElement('div');
  topBar.className = 'flex justify-between items-center mb-6';
  topBar.innerHTML = `
    <div class="flex items-center gap-3">
      <h1>專案甘特圖</h1>
      <span class="badge ${state.viewMode === 'client' ? 'in-progress' : 'completed'}">
        ${state.viewMode === 'client' ? '客戶檢視模式' : '管理員模式'}
      </span>
    </div>
    <div class="flex gap-2 items-center">
      ${!state.isAuthenticated ? `
        <input type="password" id="adminPwd" placeholder="輸入管理員密碼" value="${state.password || ''}" style="width:140px" />
        <button id="loginBtn">管理員登入</button>
      ` : `
        <button id="logoutBtn" class="danger">登出</button>
        <button id="addBtn">新增任務</button>
      `}
    </div>
  `;
  app.appendChild(topBar);

  // 說明
  const desc = document.createElement('div');
  desc.className = 'mb-6 p-3 bg-light rounded';
  desc.innerHTML = `
    <div class="flex gap-4 items-center">
      <div class="flex-1">
        <strong>使用說明：</strong>
        ${state.viewMode === 'client'
          ? '您目前處於<strong>客戶檢視模式</strong>，可以查看專案進度但無法修改任務。'
          : '您目前處於<strong>管理員模式</strong>，可以完整管理所有任務：新增、編輯、刪除、拖拽調整時間。'}
      </div>
      <div class="flex gap-2 text-xs">
        <span class="badge completed">已完成</span>
        <span class="badge in-progress">進行中</span>
        <span class="badge pending">待開始</span>
      </div>
    </div>
  `;
  app.appendChild(desc);

  // 統計
  const stat = document.createElement('div');
  stat.className = 'flex gap-4 mb-6';
  stat.innerHTML = `
    <div class="bg-white p-3 rounded w-full">
      <div class="text-lg font-bold">${state.tasks.length}</div>
      <div class="text-xs text-gray">總任務數</div>
    </div>
    <div class="bg-white p-3 rounded w-full">
      <div class="text-lg font-bold text-green">${state.tasks.filter(t=>t.status==='completed').length}</div>
      <div class="text-xs text-gray">已完成</div>
    </div>
    <div class="bg-white p-3 rounded w-full">
      <div class="text-lg font-bold text-blue">${state.tasks.filter(t=>t.status==='in-progress').length}</div>
      <div class="text-xs text-gray">進行中</div>
    </div>
    <div class="bg-white p-3 rounded w-full">
      <div class="text-lg font-bold text-gray">${state.tasks.filter(t=>t.status==='pending').length}</div>
      <div class="text-xs text-gray">待開始</div>
    </div>
  `;
  app.appendChild(stat);

  // 主體
  const main = document.createElement('div');
  main.className = 'flex gap-4';
  // 左側任務列表
  const left = document.createElement('div');
  left.style.width = '320px';
  left.innerHTML = `
    <div class="bg-light p-2 rounded mb-2 font-bold">任務清單</div>
    <div>
      ${state.tasks.map(task => `
        <div class="bg-white rounded p-3 mb-2 flex items-center justify-between" style="border:1px solid #f3f4f6;">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium">${task.name}</span>
              <span class="${getStatusClass(task.status)}">${getStatusText(task.status)}</span>
            </div>
            <div class="text-xs text-gray mt-1">${task.startDate} ~ ${task.endDate}</div>
            <div class="text-xs text-gray mt-1">負責人：${task.assignee}</div>
            <div class="flex items-center gap-2 mt-1">
              <div style="background:#e5e7eb;width:80px;height:6px;border-radius:3px;overflow:hidden;">
                <div style="background:#3b82f6;height:6px;width:${task.progress}%;"></div>
              </div>
              <span class="text-xs">${task.progress}%</span>
            </div>
          </div>
          ${state.viewMode === 'admin' ? `
            <div class="flex flex-col gap-2 ml-2">
              <button class="gray" style="padding:2px 8px;font-size:0.9rem;" onclick="editTask(${task.id})">編輯</button>
              <button class="danger" style="padding:2px 8px;font-size:0.9rem;" onclick="deleteTask(${task.id})">刪除</button>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
  main.appendChild(left);

  // 右側甘特圖
  const right = document.createElement('div');
  right.style.overflowX = 'auto';
  right.style.flex = '1';
  right.innerHTML = renderGantt();
  main.appendChild(right);

  app.appendChild(main);

  // 彈窗
  if (state.showAddForm) showTaskForm();
  if (state.editingTask) showTaskForm(state.editingTask);

  // 事件綁定
  if (!state.isAuthenticated) {
    document.getElementById('loginBtn').onclick = () => {
      const pwd = document.getElementById('adminPwd').value;
      if (pwd === adminPassword) {
        setState({ isAuthenticated: true, viewMode: 'admin', password: '' });
      } else {
        alert('密碼錯誤！');
      }
    };
    document.getElementById('adminPwd').oninput = e => setState({ password: e.target.value });
    document.getElementById('adminPwd').onkeypress = e => {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    };
  } else {
    document.getElementById('logoutBtn').onclick = () => setState({ isAuthenticated: false, viewMode: 'client' });
    document.getElementById('addBtn').onclick = () => setState({ showAddForm: true });
  }
}

function renderGantt() {
  const dates = generateDateGrid();
  const today = new Date();
  let html = `<div style="min-width:${dates.length*30}px">`;
  // 日期列
  html += `<div class="gantt-grid">`;
  dates.forEach(date => {
    const isToday = date.toDateString() === today.toDateString();
    html += `<div class="gantt-date${isToday ? ' text-red font-bold' : ''}">
      ${date.getDate()}<br><span class="text-xs">${date.toLocaleDateString('zh-TW', { weekday: 'short' })}</span>
    </div>`;
  });
  html += `</div>`;
  // 任務條
  state.tasks.forEach((task, idx) => {
    const { startDays, duration } = calculateTaskPosition(task);
    html += `<div class="gantt-row" style="height:40px;position:relative;">`;
    // 網格
    for (let i = 0; i < dates.length; i++) {
      html += `<div style="min-width:30px;height:40px;border-right:1px solid #f3f4f6;display:inline-block;"></div>`;
    }
    // 今天線
    const todayIdx = dates.findIndex(d => d.toDateString() === today.toDateString());
    if (todayIdx >= 0) {
      html += `<div class="gantt-today" style="left:${todayIdx*30+14}px"></div>`;
    }
    // 任務條
    html += `<div class="gantt-bar ${task.status}" 
      style="left:${startDays*30}px;width:${duration*30}px;top:8px;"
      draggable="${state.viewMode === 'admin'}"
      onmousedown="startDrag(event,${task.id})"
      >
      <span style="flex:1">${task.name}</span>
      <span class="text-xs" style="margin-left:8px;">${task.progress}%</span>
    </div>`;
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

// 拖拽
function startDrag(e, taskId) {
  if (state.viewMode !== 'admin') return;
  const task = state.tasks.find(t => t.id === taskId);
  setState({ draggedTask: task, dragStart: { x: e.clientX, startDate: task.startDate, endDate: task.endDate } });
  document.onmousemove = dragMove;
  document.onmouseup = dragEnd;
}
function dragMove(e) {
  if (!state.draggedTask || !state.dragStart) return;
  const deltaX = e.clientX - state.dragStart.x;
  const daysDelta = Math.round(deltaX / 30);
  if (daysDelta !== 0) {
    const newStart = new Date(state.dragStart.startDate);
    const newEnd = new Date(state.dragStart.endDate);
    newStart.setDate(newStart.getDate() + daysDelta);
    newEnd.setDate(newEnd.getDate() + daysDelta);
    updateTask(state.draggedTask.id, {
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    });
    setState({ dragStart: { ...state.dragStart, x: e.clientX, startDate: newStart.toISOString().split('T')[0], endDate: newEnd.toISOString().split('T')[0] } });
  }
}
function dragEnd() {
  setState({ draggedTask: null, dragStart: null });
  document.onmousemove = null;
  document.onmouseup = null;
}

// CRUD
function addTask(task) {
  state.tasks.push({ ...task, id: Date.now(), color: '#6366f1' });
  setState({ tasks: state.tasks, showAddForm: false });
}
function updateTask(id, updates) {
  state.tasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
  setState({ tasks: state.tasks });
}
function deleteTask(id) {
  if (!confirm('確定要刪除這個任務嗎？')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  setState({ tasks: state.tasks });
}
function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  setState({ editingTask: task });
}

// 表單
function showTaskForm(task) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.innerHTML = `
    <div class="modal">
      <h3 class="font-bold mb-4">${task ? '編輯任務' : '新增任務'}</h3>
      <div class="mb-2">
        <label>任務名稱</label>
        <input id="taskName" value="${task?.name || ''}" />
      </div>
      <div class="flex gap-2 mb-2">
        <div style="flex:1">
          <label>開始日期</label>
          <input type="date" id="taskStart" value="${task?.startDate || new Date().toISOString().split('T')[0]}" />
        </div>
        <div style="flex:1">
          <label>結束日期</label>
          <input type="date" id="taskEnd" value="${task?.endDate || new Date().toISOString().split('T')[0]}" />
        </div>
      </div>
      <div class="mb-2">
        <label>負責人</label>
        <input id="taskAssignee" value="${task?.assignee || ''}" />
      </div>
      <div class="mb-2">
        <label>任務狀態</label>
        <select id="taskStatus">
          <option value="pending" ${!task||task.status==='pending'?'selected':''}>待開始</option>
          <option value="in-progress" ${task?.status==='in-progress'?'selected':''}>進行中</option>
          <option value="completed" ${task?.status==='completed'?'selected':''}>已完成</option>
        </select>
      </div>
      <div class="mb-2">
        <label>進度 (<span id="progressVal">${task?.progress||0}</span>%)</label>
        <input type="range" min="0" max="100" id="taskProgress" value="${task?.progress||0}" />
      </div>
      <div class="flex gap-2 mt-4">
        <button id="submitTask">${task ? '更新' : '新增'}</button>
        <button id="cancelTask" class="gray">取消</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('taskProgress').oninput = e => {
    document.getElementById('progressVal').textContent = e.target.value;
  };
  document.getElementById('cancelTask').onclick = () => {
    document.body.removeChild(modal);
    setState({ showAddForm: false, editingTask: null });
  };
  document.getElementById('submitTask').onclick = () => {
    const data = {
      name: document.getElementById('taskName').value.trim(),
      startDate: document.getElementById('taskStart').value,
      endDate: document.getElementById('taskEnd').value,
      assignee: document.getElementById('taskAssignee').value.trim(),
      status: document.getElementById('taskStatus').value,
      progress: parseInt(document.getElementById('taskProgress').value)
    };
    if (!data.name) return alert('請輸入任務名稱');
    if (task) {
      // 先關閉 modal 與 editingTask
      document.body.removeChild(modal);
      setState({ editingTask: null });
      updateTask(task.id, data);
    } else {
      addTask(data);
      document.body.removeChild(modal);
    }
  };
}

window.editTask = editTask;
window.deleteTask = deleteTask;
window.startDrag = startDrag;

render();