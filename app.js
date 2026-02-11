const adminPassword = '1541';

// Firebase Setup
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
    add: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    delete: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    subject: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    print: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'
};

let state = {
  tasks: [],
  posts: [],
  viewMode: 'client',
  isAuthenticated: false,
  showAddForm: false,
  editingTask: null,
  password: '',
  draggedTask: null,
  dragStart: null,
  editingPost: null,
  tempChapters: [] // For adding chapters in form
};

function setState(updates) {
  state = { ...state, ...updates };
  // Clean up any lingering modals if we're not showing them
  if (!state.showAddForm && !state.editingTask) {
      const modals = document.querySelectorAll('.modal-backdrop');
      modals.forEach(m => m.remove());
  }
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
  minDate.setDate(minDate.getDate() - 5);
  maxDate.setDate(maxDate.getDate() + 10);
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

function updateProgress(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !task.chapters || task.chapters.length === 0) return;
    
    const completedCount = task.chapters.filter(c => c.completed).length;
    const progress = Math.round((completedCount / task.chapters.length) * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';
    
    updateTaskInFirestore(taskId, { progress, status });
}

// Render Functions
function render() {
  let focusedId = null;
  let selectionStart = null;
  try {
      if (document.activeElement && document.activeElement.id) {
          focusedId = document.activeElement.id;
          if (['text', 'search', 'tel', 'url', 'textarea'].includes(document.activeElement.type) || document.activeElement.tagName === 'TEXTAREA') {
              selectionStart = document.activeElement.selectionStart;
          }
      }
  } catch (e) { console.warn("Focus capture error:", e); }

  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';

  // Print-only Header
  const printHeader = document.createElement('div');
  printHeader.className = 'print-only-header';
  printHeader.innerHTML = `
    <h1>藥師國考進度檢核表</h1>
    <p>列印日期：${new Date().toLocaleDateString('zh-TW')} | 考生自查用</p>
  `;
  app.appendChild(printHeader);



  // Header
  const header = document.createElement('header');
  header.className = 'flex justify-between items-center mb-6';
  header.style.position = 'relative';
  header.style.zIndex = '101'; 
  header.innerHTML = `
    <div class="flex items-center gap-4">
        <div class="glass" style="width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--primary);">
            ${Icons.subject}
        </div>
        <div>
            <h1>Study Plan Pro</h1>
            <div class="flex items-center gap-2 mt-1">
                 <span class="badge ${state.viewMode === 'client' ? 'badge-pending' : 'badge-success'}">
                    ${state.viewMode === 'client' ? '考生檢視模式' : '管理者模式'}
                 </span>
            </div>
        </div>
    </div>
    <div class="flex gap-2 items-center">
      <button id="printBtn" class="btn btn-ghost" style="border:1px solid var(--border)">${Icons.print} 列印檢核表</button>
      ${!state.isAuthenticated ? `
        <button id="loginBtn" class="btn btn-ghost" style="border:1px solid var(--border)">${Icons.lock} 管理登入</button>
      ` : `
        <button id="addBtn" class="btn btn-primary">${Icons.add} 新增科目</button>
        <button id="logoutBtn" class="btn btn-ghost">${Icons.logout} 登出</button>
      `}
    </div>
  `;
  app.appendChild(header);

  // Stats Grid
  const stats = document.createElement('div');
  stats.className = 'grid grid-cols-4 gap-4 mb-8';
  stats.innerHTML = `
    <div class="card stat-card glass">
        <div class="stat-value">${state.tasks.length}</div>
        <div class="stat-label">總科目</div>
    </div>
    <div class="card stat-card glass">
        <div class="stat-value" style="color:var(--success)">${state.tasks.filter(t=>t.status==='completed').length}</div>
        <div class="stat-label">已達標</div>
    </div>
    <div class="card stat-card glass">
        <div class="stat-value" style="color:var(--warning)">${state.tasks.filter(t=>t.status==='in-progress').length}</div>
        <div class="stat-label">衝刺中</div>
    </div>
    <div class="card stat-card glass">
        <div class="stat-value" style="color:var(--pending)">${state.tasks.filter(t=>t.status==='pending').length}</div>
        <div class="stat-label">待解鎖</div>
    </div>
  `;
  app.appendChild(stats);

  // Main Layout
  const main = document.createElement('div');
  main.className = 'flex gap-8';
  
  // Subject List (Left)
  const listCol = document.createElement('div');
  listCol.className = 'sidebar';
  listCol.innerHTML = `
    <h3 class="flex items-center justify-between">
        進度追蹤
        <span class="text-sm font-normal text-muted">${state.tasks.length} 科目</span>
    </h3>
    <div class="card glass" style="max-height: 700px; overflow-y: auto;">
        ${state.tasks.length === 0 ? '<div class="p-8 text-center text-muted">尚未新增任何學習計畫</div>' : ''}
        ${state.tasks.map(task => `
            <div class="task-item">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-bold text-main" style="font-size:1.15rem">${task.name}</div>
                        <div class="text-sm text-light mt-1">${task.startDate} ~ ${task.endDate}</div>
                    </div>
                    ${state.viewMode === 'admin' ? `
                        <div class="flex gap-1">
                            <button class="btn btn-ghost" style="padding:6px;" onclick="editTask('${task.id}')">${Icons.edit}</button>
                            <button class="btn btn-ghost" style="padding:6px;color:#ef4444" onclick="deleteTask('${task.id}')">${Icons.delete}</button>
                        </div>
                    ` : `
                        <span class="badge ${task.status === 'completed' ? 'badge-success' : task.status === 'in-progress' ? 'badge-warning' : 'badge-pending'}">
                            ${task.status === 'completed' ? '已完成' : task.status === 'in-progress' ? '進行中' : '未開始'}
                        </span>
                    `}
                </div>
                
                ${task.chapters && task.chapters.length > 0 ? `
                    <div class="chapter-list">
                        ${task.chapters.map((chap, idx) => `
                            <div class="chapter-item ${chap.completed ? 'completed' : ''}" onclick="toggleChapter('${task.id}', ${idx})">
                                <div class="chapter-checkbox ${chap.completed ? 'checked' : ''}">
                                    ${chap.completed ? Icons.check : ''}
                                </div>
                                <span class="chapter-name">${chap.name}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="text-sm text-light mt-2 italic">尚無明細章節</div>'}

                <div class="progress-container">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${task.progress || 0}%"></div>
                    </div>
                    <span class="text-sm font-bold text-muted" style="min-width:40px; text-align:right">${task.progress || 0}%</span>
                </div>
            </div>
        `).join('')}
    </div>
  `;
  main.appendChild(listCol);

  // Time Chart
  const ganttCol = document.createElement('div');
  ganttCol.className = 'flex-1';
  ganttCol.innerHTML = `
    <h3>學期時間軸</h3>
    ${renderGantt()}
  `;
  main.appendChild(ganttCol);

  app.appendChild(main);

  // Bulletin
  const bulletin = document.createElement('div');
  bulletin.className = 'bulletin-container';
  bulletin.innerHTML = renderBulletin();
  app.appendChild(bulletin);

  if (state.showAddForm) showTaskForm();
  if (state.editingTask) showTaskForm(state.editingTask);
  bindEvents();

  // Restore focus
  if (focusedId) {
      const el = document.getElementById(focusedId);
      if (el) {
          el.focus();
          if (selectionStart !== null) {
              try { el.setSelectionRange(selectionStart, selectionStart); } catch (e) {}
          }
      }
  }
}

function renderGantt() {
  const dates = generateDateGrid();
  const { minDate } = getDateRange();
  const today = new Date();
  let html = `<div class="gantt-container glass">`;
  html += `<div style="min-width:${dates.length * 44}px">`;
  
  html += `<div class="gantt-header">`;
  dates.forEach(date => {
    const isToday = date.toDateString() === today.toDateString();
    html += `<div class="gantt-date-col ${isToday ? 'today' : ''}">
        ${date.getDate()}<br>
        <span style="opacity:0.6">${date.toLocaleDateString('zh-TW', { weekday: 'short' })}</span>
    </div>`;
  });
  html += `</div>`;

  state.tasks.forEach((task, idx) => {
    const { startDays, duration } = calculateTaskPosition(task, minDate);
    html += `<div class="gantt-body-row">`;
    for (let i = 0; i < dates.length; i++) html += `<div class="gantt-grid-cell"></div>`;
    
    html += `<div class="gantt-bar ${task.status}"
        style="left:${startDays * 44}px; width:${duration * 44}px;"
        title="${task.name}: ${task.progress}%"
    >
        ${task.name}
    </div>`;
    html += `</div>`;
  });

  html += `</div></div>`;
  return html;
}

function renderBulletin() {
    let html = `<h3>${Icons.subject} 學習公告</h3>`;
    if (state.viewMode === 'admin') {
        html += `
            <div class="post-form glass" id="postFormSection">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="m-0">${state.editingPost ? '編輯公告' : '發佈新公告'}</h4>
                    ${state.editingPost ? `<button class="btn btn-ghost" onclick="cancelEditPost()">取消</button>` : ''}
                </div>
                <input type="text" id="postTitle" placeholder="文章標題..." value="${state.editingPost ? state.editingPost.title : ''}" style="margin-bottom:1rem; font-weight:bold;">
                <textarea id="postContent" placeholder="說點什麼來鼓勵大家..." rows="4">${state.editingPost ? state.editingPost.content : ''}</textarea>
                <div class="flex justify-between items-center mt-4">
                    <div class="flex gap-4">
                        <input type="color" id="postColor" value="${state.editingPost ? state.editingPost.color : '#0d9488'}" style="width:40px; height:40px; padding:2px; cursor:pointer;">
                        <label class="flex items-center gap-2 text-sm font-bold cursor-pointer">
                            <input type="checkbox" id="postBold" ${state.editingPost && state.editingPost.isBold ? 'checked' : ''}> 強調顯示
                        </label>
                    </div>
                    <button class="btn btn-primary" onclick="submitPost()">${state.editingPost ? '確認更正' : '立即發佈'}</button>
                </div>
            </div>
        `;
    }
    if (state.posts.length === 0) {
        html += `<div class="card glass p-8 text-center text-muted">目前暫無重要公告</div>`;
    } else {
        state.posts.forEach(post => {
            const dateStr = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : '剛剛';
            html += `
                <div class="post-card glass">
                    <div class="flex justify-between">
                        <div>
                            <div class="post-title">${post.title}</div>
                            <div class="post-date">${dateStr}</div>
                        </div>
                        ${state.viewMode === 'admin' ? `
                            <div class="flex gap-2">
                                <button class="btn btn-ghost" onclick="editPost('${post.id}')">${Icons.edit}</button>
                                <button class="btn btn-ghost" style="color:#ef4444" onclick="deletePost('${post.id}')">${Icons.delete}</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="post-content mt-4" style="color:${post.color || 'inherit'}; font-weight:${post.isBold ? '800' : '400'}">${post.content}</div>
                </div>
            `;
        });
    }
    return html;
}

// Global Actions
window.toggleChapter = async (taskId, chapIdx) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const chapters = [...task.chapters];
    chapters[chapIdx].completed = !chapters[chapIdx].completed;
    
    // Auto Update Task
    const completedCount = chapters.filter(c => c.completed).length;
    const progress = Math.round((completedCount / chapters.length) * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';
    
    await db.collection('tasks').doc(taskId).update({ chapters, progress, status });
    loadTasksFromFirestore();
};

window.addChapterInForm = () => {
    const name = document.getElementById('newChapName').value.trim();
    if (!name) return;
    state.tempChapters.push({ name, completed: false });
    document.getElementById('newChapName').value = '';
    renderChapterManager();
};

window.removeChapterInForm = (idx) => {
    state.tempChapters.splice(idx, 1);
    renderChapterManager();
};

function renderChapterManager() {
    const container = document.getElementById('chapterManager');
    container.innerHTML = state.tempChapters.map((c, idx) => `
        <div class="manager-item">
            <span class="text-sm font-medium">${c.name}</span>
            <button class="btn btn-ghost" style="padding:4px;color:#ef4444" onclick="removeChapterInForm(${idx})">${Icons.delete}</button>
        </div>
    `).join('') || '<div class="text-center p-2 text-muted text-sm">尚未新增章節</div>';
}

function showTaskForm(task) {
  state.tempChapters = task ? (task.chapters || []) : [];
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content glass">
      <h3 class="mb-6">${task ? '修改科目資訊' : '建立新科目'}</h3>
      
      <div class="mb-4">
        <label class="text-sm font-bold text-muted mb-2 block">科目名稱</label>
        <input type="text" id="taskName" value="${task?.name || ''}" placeholder="例如: 藥理學 (下)">
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="text-sm font-bold text-muted mb-2 block">啟始日</label>
          <input type="date" id="taskStart" value="${task?.startDate || new Date().toISOString().split('T')[0]}">
        </div>
        <div>
          <label class="text-sm font-bold text-muted mb-2 block">目標截止日</label>
          <input type="date" id="taskEnd" value="${task?.endDate || new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      
      <div class="mb-6">
        <label class="text-sm font-bold text-muted mb-2 block">章節明細 (子目錄)</label>
        <div class="flex gap-2">
            <input type="text" id="newChapName" placeholder="輸入章節名稱...">
            <button class="btn btn-primary" onclick="addChapterInForm()">${Icons.add}</button>
        </div>
        <div id="chapterManager" class="chapter-manager"></div>
      </div>
      
      <div class="flex gap-4 justify-end">
        <button id="cancelTask" class="btn btn-ghost">放棄變更</button>
        <button id="submitTask" class="btn btn-primary px-8">${task ? '完成更新' : '確認新增'}</button>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(modal);
  renderChapterManager();

  document.getElementById('cancelTask').onclick = () => {
    const parent = document.getElementById('app');
    if (parent.contains(modal)) parent.removeChild(modal);
    setState({ showAddForm: false, editingTask: null });
  };
  
  document.getElementById('submitTask').onclick = () => {
    const data = {
      name: document.getElementById('taskName').value.trim(),
      startDate: document.getElementById('taskStart').value,
      endDate: document.getElementById('taskEnd').value,
      chapters: state.tempChapters,
    };
    
    if (!data.name) return alert('請填寫科目名稱');
    
    // Auto Calc Progress
    if (data.chapters && data.chapters.length > 0) {
        const completedCount = data.chapters.filter(c => c.completed).length;
        data.progress = Math.round((completedCount / data.chapters.length) * 100);
        data.status = data.progress === 100 ? 'completed' : data.progress > 0 ? 'in-progress' : 'pending';
    } else {
        data.progress = 0;
        data.status = 'pending';
    }
    
    if (task) {
      updateTaskInFirestore(task.id, data);
      setState({ editingTask: null });
    } else {
      addTaskToFirestore(data);
      setState({ showAddForm: false });
    }
    const parent = document.getElementById('app');
    if (parent && parent.contains(modal)) parent.removeChild(modal);
  };
}

// Firestore Ops
async function loadTasksFromFirestore() {
  const snapshot = await db.collection('tasks').get();
  state.tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  render();
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
  if(!confirm('刪除後無法恢復，確定要移除此科目?')) return;
  await db.collection('tasks').doc(id).delete();
  loadTasksFromFirestore();
}

async function loadPostsFromFirestore() {
    const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
    state.posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
}
async function addPostToFirestore(post) {
    await db.collection('posts').add({ ...post, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    loadPostsFromFirestore();
}

// Global Bindings
window.editTask = id => setState({ editingTask: state.tasks.find(t => t.id == id) });
window.deleteTask = deleteTaskFromFirestore;
window.submitPost = () => {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const color = document.getElementById('postColor').value;
    const isBold = document.getElementById('postBold').checked;
    if(!title || !content) return alert('請完整填寫公告內容');
    if (state.editingPost) {
        db.collection('posts').doc(state.editingPost.id).update({ title, content, color, isBold });
        setState({ editingPost: null });
        loadPostsFromFirestore();
    } else {
        addPostToFirestore({ title, content, color, isBold });
    }
};
window.editPost = id => setState({ editingPost: state.posts.find(p => p.id === id) });
window.deletePost = async id => {
    if(!confirm('確定移除公告?')) return;
    await db.collection('posts').doc(id).delete();
    loadPostsFromFirestore();
};
window.cancelEditPost = () => setState({ editingPost: null });

function bindEvents() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && !state.isAuthenticated) {
        loginBtn.onclick = () => {
            const val = window.prompt('請輸入管理密碼:');
            if (val === adminPassword) setState({ isAuthenticated: true, viewMode: 'admin' });
            else if (val !== null) alert('認證失敗');
        };
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    const addBtn = document.getElementById('addBtn');
    if (logoutBtn) logoutBtn.onclick = () => setState({ isAuthenticated: false, viewMode: 'client' });
    if (addBtn) addBtn.onclick = () => setState({ showAddForm: true });

    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.onclick = () => window.print();
}

// Start
loadTasksFromFirestore();
loadPostsFromFirestore();
