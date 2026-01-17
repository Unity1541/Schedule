const adminPassword = '1541';

// Firebase Setup (Keep original config)
const firebaseConfig = {
  apiKey: "AIzaSyBtYsYuz5jkqrrShZkYnp92e2lslZxBE2o",
  authDomain: "scheduleapp-252e2.firebaseapp.com",
  projectId: "scheduleapp-252e2",
  storageBucket: "scheduleapp-252e2.appspot.com",
  messagingSenderId: "500191325380",
  appId: "1:500191325380:web:0d258cac4eaf8801a32d91"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Icons
const Icons = {
    add: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
};

let state = {
  tasks: [],
  posts: [], // Bulletin posts
  viewMode: 'client',
  isAuthenticated: false,
  showAddForm: false,
  editingTask: null,
  password: '',
  draggedTask: null,
  dragStart: null,
  editingPost: null // New state for editing posts
};

function setState(updates) {
  state = { ...state, ...updates };
  render();
}

// Logic Helpers
function getDateRange() {
  if (state.tasks.length === 0) {
      const now = new Date();
      return { minDate: new Date(now.setDate(now.getDate() - 7)), maxDate: new Date(now.setDate(now.getDate() + 21)) };
  }
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

function calculateTaskPosition(task, minDate) {
  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);
  const startDays = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
  const duration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return { startDays, duration };
}

function getStatusBadgeClass(status) {
  if (status === 'completed') return 'badge badge-success';
  if (status === 'in-progress') return 'badge badge-warning';
  return 'badge badge-pending';
}

function getStatusText(status) {
    const map = { 'completed': '已完成', 'in-progress': '進行中', 'pending': '待開始' };
    return map[status] || '未知';
}

// Render Functions
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Header
  const header = document.createElement('header');
  header.className = 'flex justify-between items-center mb-6 py-2';
  header.innerHTML = `
    <div class="flex items-center gap-3">
        <div style="background:var(--primary); width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
            <h1>藥師國考進度表</h1>
            <div class="flex items-center gap-2 mt-1">
                 <span class="${state.viewMode === 'client' ? 'badge badge-pending' : 'badge badge-success'}">
                    ${state.viewMode === 'client' ? '考生檢視模式' : '管理者模式'}
                 </span>
            </div>
        </div>
    </div>
    <div class="flex gap-2 items-center">
      ${!state.isAuthenticated ? `
        <input type="password" id="adminPwd" placeholder="管理密碼" value="${state.password || ''}" style="width:140px" />
        <button id="loginBtn" class="btn btn-primary">${Icons.lock} 登入</button>
      ` : `
        <button id="addBtn" class="btn btn-primary">${Icons.add} 新增任務</button>
        <button id="logoutBtn" class="btn btn-ghost">${Icons.logout} 登出</button>
      `}
    </div>
  `;
  app.appendChild(header);

  // Stats Grid
  const stats = document.createElement('div');
  stats.className = 'grid grid-cols-4 gap-4 mb-6';
  stats.innerHTML = `
    <div class="card stat-card">
        <div class="stat-value">${state.tasks.length}</div>
        <div class="stat-label">總任務數</div>
    </div>
    <div class="card stat-card">
        <div class="stat-value text-green">${state.tasks.filter(t=>t.status==='completed').length}</div>
        <div class="stat-label" style="color:var(--success)">已完成</div>
    </div>
    <div class="card stat-card">
        <div class="stat-value text-yellow">${state.tasks.filter(t=>t.status==='in-progress').length}</div>
        <div class="stat-label" style="color:var(--warning)">進行中</div>
    </div>
    <div class="card stat-card">
        <div class="stat-value text-gray">${state.tasks.filter(t=>t.status==='pending').length}</div>
        <div class="stat-label" style="color:var(--pending)">待開始</div>
    </div>
  `;
  app.appendChild(stats);

  // Main Layout
  const main = document.createElement('div');
  main.className = 'flex gap-4 flex-col-mobile';
  
  // Task List (Left)
  const listCol = document.createElement('div');
  listCol.className = 'sidebar';
  
  listCol.innerHTML = `
    <h3 class="flex items-center justify-between">
        科目清單 
        <span class="text-muted text-sm font-normal">${state.tasks.length} Items</span>
    </h3>
    <div class="card" style="max-height: 600px; overflow-y: auto;">
        ${state.tasks.length === 0 ? '<div class="p-4 text-center text-muted">目前沒有任務</div>' : ''}
        ${state.tasks.map(task => `
            <div class="task-item">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-bold text-main" style="font-size:1.05rem">${task.name}</div>
                        <div class="text-sm text-muted mt-1">${task.startDate} ~ ${task.endDate}</div>
                    </div>
                    ${state.viewMode === 'admin' ? `
                        <div class="flex gap-1">
                            <button class="btn btn-ghost" style="padding:4px;" onclick="editTask('${task.id}')" title="編輯">${Icons.edit}</button>
                            <button class="btn btn-ghost" style="padding:4px;color:var(--warning)" onclick="deleteTask('${task.id}')" title="刪除">${Icons.delete}</button>
                        </div>
                    ` : `
                        <span class="${getStatusBadgeClass(task.status)}">${getStatusText(task.status)}</span>
                    `}
                </div>
                
                <div class="text-sm text-main mb-2">
                    <span class="text-muted">進度:</span> ${task.assignee || '無章節'}
                </div>

                <div class="flex items-center gap-3">
                     <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${task.progress}%; background-color: ${task.progress >= 100 ? 'var(--success)' : 'var(--primary)'}"></div>
                     </div>
                     <span class="text-sm font-bold text-muted" style="min-width:32px; text-align:right">${task.progress}%</span>
                </div>
            </div>
        `).join('')}
    </div>
  `;
  main.appendChild(listCol);

  // Gantt Chart (Right)
  const ganttCol = document.createElement('div');
  ganttCol.className = 'flex-1 w-full-mobile';
  ganttCol.innerHTML = `
    <h3 class="flex items-center gap-2">
        時間軸檢視
        <span class="text-sm text-muted font-normal">(今天: ${new Date().toLocaleDateString()})</span>
    </h3>
    ${renderGantt()}
  `;
  main.appendChild(ganttCol);

  app.appendChild(main);

  // Bulletin Board Section
  const bulletin = document.createElement('div');
  bulletin.className = 'bulletin-container';
  bulletin.innerHTML = renderBulletin();
  app.appendChild(bulletin);

  // Modals & Events
  if (state.showAddForm) showTaskForm();
  if (state.editingTask) showTaskForm(state.editingTask);
  bindEvents();
}

function renderGantt() {
  const dates = generateDateGrid();
  const { minDate } = getDateRange();
  const today = new Date();
  
  // Container
  let html = `<div class="gantt-container">`;
  html += `<div style="min-width:${dates.length * 40}px">`; // Scroll container
  
  // Header Row
  html += `<div class="gantt-header">`;
  dates.forEach(date => {
    const isToday = date.toDateString() === today.toDateString();
    html += `<div class="gantt-date-col ${isToday ? 'today' : ''}">
        ${date.getDate()}<br>
        <span style="opacity:0.7">${date.toLocaleDateString('zh-TW', { weekday: 'short' })}</span>
    </div>`;
  });
  html += `</div>`; // End Header

  // Task Body
  state.tasks.forEach(task => {
    const { startDays, duration } = calculateTaskPosition(task, minDate);
    html += `<div class="gantt-body-row">`;
    // Grid Lines
    for (let i = 0; i < dates.length; i++) {
        html += `<div class="gantt-grid-cell"></div>`;
    }
    
    // Today Line inside row
    const todayIdx = dates.findIndex(d => d.toDateString() === today.toDateString());
    if (todayIdx >= 0) {
        html += `<div class="today-line" style="left:${todayIdx * 40 + 20}px"></div>`;
    }

    // Task Bar
    html += `<div class="gantt-bar ${task.status} ${state.viewMode === 'admin' ? 'draggable' : ''}"
        style="left:${startDays * 40}px; width:${duration * 40}px; top:10px;"
        onmousedown="startDrag(event, '${task.id}')"
        title="${task.name} (${task.progress}%)"
    >
        <span>${task.name}</span>
        ${task.status === 'completed' ? `<span style="margin-left:auto">${Icons.check}</span>` : ''}
    </div>`;

    html += `</div>`; // End Row
  });

  html += `</div></div>`; // End Scroll Container & Main Container
  return html;
}

function renderBulletin() {
    let html = `<h3>📢 公佈欄</h3>`;
    
    // Admin Creating Form
    if (state.viewMode === 'admin') {
        html += `
            <div class="post-form" id="postFormSection">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="m-0">${state.editingPost ? '編輯公告' : '新增公告'}</h4>
                    ${state.editingPost ? `<button class="btn btn-ghost btn-sm" onclick="cancelEditPost()">取消編輯</button>` : ''}
                </div>
                <input type="text" id="postTitle" placeholder="文章標題..." value="${state.editingPost ? state.editingPost.title : ''}" style="margin-bottom:12px; font-weight:bold;">
                <textarea id="postContent" placeholder="輸入公告內容...">${state.editingPost ? state.editingPost.content : ''}</textarea>
                <div class="flex justify-between items-center">
                    <div class="flex gap-3 items-center">
                        <input type="color" id="postColor" value="${state.editingPost ? state.editingPost.color : '#0f766e'}" title="選取文字顏色">
                        <label class="flex items-center gap-1 text-sm font-bold text-muted" style="cursor:pointer">
                            <input type="checkbox" id="postBold" ${state.editingPost && state.editingPost.isBold ? 'checked' : ''}> 粗體
                        </label>
                    </div>
                    <button class="btn btn-primary" onclick="submitPost()">${state.editingPost ? '更新文章' : '發佈文章'}</button>
                </div>
            </div>
        `;
    }

    // List Posts
    if (state.posts.length === 0) {
        html += `<div class="text-muted text-center p-4">目前沒有公告</div>`;
    } else {
        // Sort by date desc
        const sortedPosts = [...state.posts].sort((a,b) => b.createdAt.toDate() - a.createdAt.toDate());
        sortedPosts.forEach(post => {
            const dateStr = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now';
            html += `
                <div class="post-card">
                    <div class="post-header">
                        <div>
                            <div class="post-title">${post.title}</div>
                            <div class="post-date">${dateStr}</div>
                        </div>
                        ${state.viewMode === 'admin' ? `
                            <div class="flex gap-1">
                                <button class="btn btn-ghost" onclick="editPost('${post.id}')" title="編輯">${Icons.edit}</button>
                                <button class="btn btn-ghost" style="color:var(--warning)" onclick="deletePost('${post.id}')" title="刪除">${Icons.delete}</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="post-content" style="color:${post.color || 'var(--text-muted)'}; font-weight:${post.isBold ? '700' : '400'}">${post.content}</div>
                </div>
            `;
        });
    }
    return html;
}

// Drag & Drop
function startDrag(e, taskId) {
  if (state.viewMode !== 'admin') return;
  const task = state.tasks.find(t => t.id == taskId);
  if (!task) return;
  
  setState({ 
      draggedTask: task, 
      dragStart: { 
          x: e.clientX, 
          startDate: task.startDate, 
          endDate: task.endDate 
      } 
  });
  
  document.onmousemove = dragMove;
  document.onmouseup = dragEnd;
}

function dragMove(e) {
  if (!state.draggedTask || !state.dragStart) return;
  
  // 40px is column width calculation
  const deltaX = e.clientX - state.dragStart.x;
  const daysDelta = Math.round(deltaX / 40);
  
  if (daysDelta !== 0) {
    const newStart = new Date(state.dragStart.startDate);
    const newEnd = new Date(state.dragStart.endDate);
    newStart.setDate(newStart.getDate() + daysDelta);
    newEnd.setDate(newEnd.getDate() + daysDelta);
    
    // Optimistic Update
    const updatedTask = {
        ...state.draggedTask,
        startDate: newStart.toISOString().split('T')[0],
        endDate: newEnd.toISOString().split('T')[0]
    };
    
    const newTasks = state.tasks.map(t => t.id === state.draggedTask.id ? updatedTask : t);
    state.tasks = newTasks;
    render(); 
  }
}

function dragEnd(e) {
  if (state.draggedTask) {
      const task = state.tasks.find(t => t.id === state.draggedTask.id);
      if (task) {
          updateTaskInFirestore(task.id, {
              startDate: task.startDate,
              endDate: task.endDate
          });
      }
  }
  setState({ draggedTask: null, dragStart: null });
  document.onmousemove = null;
  document.onmouseup = null;
}

// Event Bindings
function bindEvents() {
    if (!state.isAuthenticated) {
        const loginBtn = document.getElementById('loginBtn');
        const pwdInput = document.getElementById('adminPwd');
        if (loginBtn) {
            loginBtn.onclick = () => {
                if (pwdInput.value === adminPassword) {
                    setState({ isAuthenticated: true, viewMode: 'admin', password: '' });
                } else {
                    alert('密碼錯誤！');
                }
            };
        }
        if (pwdInput) {
            pwdInput.oninput = e => setState({ password: e.target.value });
            pwdInput.onkeypress = e => { if (e.key === 'Enter') loginBtn.click(); };
        }
    } else {
        const logoutBtn = document.getElementById('logoutBtn');
        const addBtn = document.getElementById('addBtn');
        if (logoutBtn) logoutBtn.onclick = () => setState({ isAuthenticated: false, viewMode: 'client' });
        if (addBtn) addBtn.onclick = () => setState({ showAddForm: true });
    }
}

// Form Modal
function showTaskForm(task) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  setTimeout(() => modal.style.opacity = '1', 10);
  
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="mb-4 text-center">${task ? '編輯任務' : '新增任務'}</h3>
      
      <div class="mb-4">
        <label class="text-sm font-bold text-muted mb-1 block">任務名稱</label>
        <input type="text" id="taskName" value="${task?.name || ''}" placeholder="例如: 藥理學 Ch.1-3">
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="text-sm font-bold text-muted mb-1 block">開始日期</label>
          <input type="date" id="taskStart" value="${task?.startDate || new Date().toISOString().split('T')[0]}">
        </div>
        <div>
          <label class="text-sm font-bold text-muted mb-1 block">結束日期</label>
          <input type="date" id="taskEnd" value="${task?.endDate || new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      
      <div class="mb-4">
        <label class="text-sm font-bold text-muted mb-1 block">主題章節 / 備註</label>
        <input type="text" id="taskAssignee" value="${task?.assignee || ''}" placeholder="詳細進度內容...">
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div>
            <label class="text-sm font-bold text-muted mb-1 block">狀態</label>
            <select id="taskStatus">
              <option value="pending" ${!task||task.status==='pending'?'selected':''}>待開始</option>
              <option value="in-progress" ${task?.status==='in-progress'?'selected':''}>進行中</option>
              <option value="completed" ${task?.status==='completed'?'selected':''}>已完成</option>
            </select>
        </div>
        <div>
            <label class="text-sm font-bold text-muted mb-1 block">完成度: <span id="progressVal">${task?.progress||0}</span>%</label>
            <input type="range" class="w-full mt-2" min="0" max="100" id="taskProgress" value="${task?.progress||0}">
        </div>
      </div>
      
      <div class="flex gap-2 justify-end">
        <button id="cancelTask" class="btn btn-ghost">取消</button>
        <button id="submitTask" class="btn btn-primary px-6">${task ? '更新' : '新增'}</button>
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
    
    if (!data.name) return alert('請輸入科目名稱');
    
    if (task) {
      document.body.removeChild(modal);
      setState({ editingTask: null });
      updateTaskInFirestore(task.id, data);
    } else {
      addTaskToFirestore({ ...data, color: '#0f766e' });
      document.body.removeChild(modal);
      setState({ showAddForm: false });
    }
  };
}

// Global Exports
window.editTask = id => setState({ editingTask: state.tasks.find(t => t.id == id) });
window.deleteTask = id => {
    if(confirm('確定要刪除此任務?')) deleteTaskFromFirestore(id);
};
window.startDrag = startDrag;

// Firestore Operations - Tasks
async function loadTasksFromFirestore() {
  try {
    const snapshot = await db.collection('tasks').get();
    state.tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  } catch (error) {
    console.error("Error loading tasks:", error);
    alert("無法讀取任務列表，請檢查網路或權限。錯誤: " + error.message);
  }
}
async function addTaskToFirestore(task) {
  await db.collection('tasks').add(task);
  loadTasksFromFirestore();
}
async function updateTaskInFirestore(id, updates) {
  await db.collection('tasks').doc(id).update(updates);
  loadTasksFromFirestore();
}
async function deleteTaskFromFirestore(id) {
  await db.collection('tasks').doc(id).delete();
  loadTasksFromFirestore();
}

// Firestore Operations - Posts
async function loadPostsFromFirestore() {
    try {
        const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
        state.posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render();
    } catch (error) {
        console.error("Error loading posts:", error);
        alert("無法讀取公告欄，請檢查網路或是 Firebase 權限設定。錯誤: " + error.message);
    }
}
async function addPostToFirestore(post) {
    // Add server timestamp using the Firebase SDK client-side
    await db.collection('posts').add({
        ...post,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadPostsFromFirestore();
}
async function deletePostFromFirestore(id) {
    if(!confirm('確定要刪除這篇文章?')) return;
    await db.collection('posts').doc(id).delete();
    loadPostsFromFirestore();
}

async function updatePostInFirestore(id, updates) {
    await db.collection('posts').doc(id).update(updates);
    loadPostsFromFirestore();
}

window.submitPost = () => {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const color = document.getElementById('postColor').value;
    const isBold = document.getElementById('postBold').checked;
    
    if(!title || !content) return alert('請輸入標題和內容');
    
    if (state.editingPost) {
        updatePostInFirestore(state.editingPost.id, { title, content, color, isBold });
        state.editingPost = null; // Reset edit state
    } else {
        addPostToFirestore({ title, content, color, isBold });
    }
};

window.editPost = (id) => {
    const post = state.posts.find(p => p.id === id);
    if (post) {
        // Only set state, render will populate the form because we updated renderBulletin
        setState({ editingPost: post });
        // Scroll to form
        setTimeout(() => {
            const form = document.querySelector('.post-form');
            if(form) form.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
};

window.cancelEditPost = () => {
    setState({ editingPost: null });
};

window.deletePost = deletePostFromFirestore;

// Init
try {
  loadTasksFromFirestore();
  loadPostsFromFirestore();
} catch (error) {
  console.error(error);
  alert('Critical Error during initialization: ' + error.message);
}

// Global Render Safety
const originalRender = render;
render = function() {
    try {
        originalRender();
    } catch (e) {
        console.error(e);
        alert('Render Error: ' + e.message);
    }
}