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
    print: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
    folder: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
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
  tempChapters: [],          // 直屬章節（表單暫存）
  tempSubCategories: [],     // 子類別（表單暫存）
  collapsedTasks: new Set(), // 已收合的科目 key=taskId
  collapsedSubCats: new Set() // 已收合的子類別 key="taskId::subCatIdx"
};

function setState(updates) {
  state = { ...state, ...updates };
  if (!state.showAddForm && !state.editingTask) {
      const modals = document.querySelectorAll('.modal-backdrop');
      modals.forEach(m => m.remove());
  }
  render();
}

// ── Logic Helpers ──────────────────────────────────────
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

// 收集一個 task 內所有章節（直屬 + 子類別）
function getAllChapters(task) {
    const direct = task.chapters || [];
    const fromSubs = (task.subCategories || []).flatMap(sc => sc.chapters || []);
    return [...direct, ...fromSubs];
}

// 由全部章節重新計算 progress/status
function calcProgressStatus(task) {
    const all = getAllChapters(task);
    if (all.length === 0) return { progress: 0, status: 'pending' };
    const completedCount = all.filter(c => c.completed).length;
    const progress = Math.round((completedCount / all.length) * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';
    return { progress, status };
}

// ── Render ──────────────────────────────────────────────
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
        <div class="glass" style="width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--primary);">
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

  // 產生單一 task 的章節區塊 HTML
  function renderTaskBody(task) {
      const isCollapsed = state.collapsedTasks.has(task.id);
      const allChaps = getAllChapters(task);
      const hasAnyChapters = allChaps.length > 0;
      const directChapters = task.chapters || [];
      const subCategories = task.subCategories || [];

      if (!hasAnyChapters) return '<div class="text-sm text-light mt-2 italic">尚無明細章節</div>';
      if (isCollapsed) return '';

      const completedAll = allChaps.filter(c => c.completed).length;
      let html = `<div style="font-size:0.75rem;color:var(--text-muted);margin:6px 0 4px;font-weight:600;">${completedAll} / ${allChaps.length} 章節完成</div>`;

      // 建立 parentChapter → index 的對照表
      const subCatByParent = {};
      subCategories.forEach((sc, idx) => { if (sc.parentChapter) subCatByParent[sc.parentChapter] = idx; });
      const renderedSubCats = new Set();

      // 直屬章節：若有子類別以此為父節點則展開，否則獨立顯示
      directChapters.forEach((chap, idx) => {
          const matchedScIdx = subCatByParent[chap.name];

          if (matchedScIdx !== undefined) {
              // 有對應子類別 → 作為可展開父節點
              const sc = subCategories[matchedScIdx];
              const scKey = `${task.id}::${matchedScIdx}`;
              const scCollapsed = state.collapsedSubCats.has(scKey);
              const scChaps = sc.chapters || [];
              const scDone = scChaps.filter(c => c.completed).length;
              renderedSubCats.add(matchedScIdx);

              html += `
              <div class="direct-chapter-parent">
                  <div class="chapter-item ${chap.completed ? 'completed' : ''}"
                       onclick="toggleChapter('${task.id}',${idx},null)"
                       style="display:flex;align-items:center;gap:6px;">
                      <div class="chapter-checkbox ${chap.completed ? 'checked' : ''}">${chap.completed ? Icons.check : ''}</div>
                      <span class="chapter-name" style="flex:1">${chap.name}</span>
                      <span style="font-size:0.7rem;color:var(--text-muted);margin-right:2px;">${scDone}/${scChaps.length}</span>
                      <button class="btn btn-ghost" style="padding:2px;color:var(--text-muted);"
                              onclick="event.stopPropagation();toggleSubCatCollapse('${task.id}',${matchedScIdx})"
                              title="${scCollapsed ? '展開' : '收合'}">
                          <span style="display:inline-block;transform:rotate(${scCollapsed ? '-90' : '0'}deg);transition:transform 0.2s;">${Icons.chevronDown}</span>
                      </button>
                  </div>
                  ${!scCollapsed ? `<div class="chapter-list" style="padding-left:20px;margin-top:2px;border-left:2px solid var(--border);margin-left:7px;">` +
                      scChaps.map((c, ci) => `
                      <div class="chapter-item ${c.completed ? 'completed' : ''}" onclick="toggleChapter('${task.id}',${ci},${matchedScIdx})" style="font-size:0.85rem;">
                          <div class="chapter-checkbox ${c.completed ? 'checked' : ''}">${c.completed ? Icons.check : ''}</div>
                          <span class="chapter-name">${c.name}</span>
                      </div>`).join('') +
                  `</div>` : ''}
              </div>`;
          } else {
              // 無對應子類別 → 獨立 checkbox
              html += `
              <div class="chapter-item ${chap.completed ? 'completed' : ''}" onclick="toggleChapter('${task.id}',${idx},null)">
                  <div class="chapter-checkbox ${chap.completed ? 'checked' : ''}">${chap.completed ? Icons.check : ''}</div>
                  <span class="chapter-name">${chap.name}</span>
              </div>`;
          }
      });

      // 沒有對應直屬章節的孤立子類別 → 獨立顯示
      subCategories.forEach((sc, scIdx) => {
          if (renderedSubCats.has(scIdx)) return;
          const scKey = `${task.id}::${scIdx}`;
          const scCollapsed = state.collapsedSubCats.has(scKey);
          const scChaps = sc.chapters || [];
          const scDone = scChaps.filter(c => c.completed).length;
          html += `
          <div class="sub-category">
              <div class="sub-cat-header" onclick="toggleSubCatCollapse('${task.id}',${scIdx})">
                  <span style="display:inline-block;transform:rotate(${scCollapsed ? '-90' : '0'}deg);transition:transform 0.2s;opacity:0.6">${Icons.chevronDown}</span>
                  <span style="margin-right:2px;opacity:0.5">${Icons.folder}</span>
                  <span class="sub-cat-name">${sc.name}</span>
                  <span class="sub-cat-count">${scDone}/${scChaps.length}</span>
              </div>
              ${!scCollapsed ? '<div class="chapter-list" style="padding-left:12px;margin-top:2px;">' +
                  scChaps.map((chap, idx) => `
                  <div class="chapter-item ${chap.completed ? 'completed' : ''}" onclick="toggleChapter('${task.id}',${idx},${scIdx})">
                      <div class="chapter-checkbox ${chap.completed ? 'checked' : ''}">${chap.completed ? Icons.check : ''}</div>
                      <span class="chapter-name">${chap.name}</span>
                  </div>`).join('') +
              '</div>' : ''}
          </div>`;
      });

      return html;
  }

  listCol.innerHTML = `
    <h3 class="flex items-center justify-between">
        進度追蹤
        <span class="text-sm font-normal text-muted">${state.tasks.length} 科目</span>
    </h3>
    <div class="card glass" style="max-height:700px;overflow-y:auto;">
        ${state.tasks.length === 0 ? '<div class="p-8 text-center text-muted">尚未新增任何學習計畫</div>' : ''}
        ${state.tasks.map(task => {
            const isCollapsed = state.collapsedTasks.has(task.id);
            const allChaps = getAllChapters(task);
            const hasAnyChapters = allChaps.length > 0;
            return `
            <div class="task-item">
                <div class="flex justify-between items-start">
                    <div style="flex:1;min-width:0;">
                        <div class="font-bold text-main" style="font-size:1.15rem">${task.name}</div>
                        <div class="text-sm text-light mt-1">${task.startDate} ~ ${task.endDate}</div>
                    </div>
                    <div class="flex gap-1 items-center">
                        ${state.viewMode === 'admin' ? `
                            <button class="btn btn-ghost" style="padding:6px;" onclick="editTask('${task.id}')">${Icons.edit}</button>
                            <button class="btn btn-ghost" style="padding:6px;color:#ef4444" onclick="deleteTask('${task.id}')">${Icons.delete}</button>
                        ` : `
                            <span class="badge ${task.status==='completed'?'badge-success':task.status==='in-progress'?'badge-warning':'badge-pending'}">
                                ${task.status==='completed'?'已完成':task.status==='in-progress'?'進行中':'未開始'}
                            </span>
                        `}
                        ${hasAnyChapters ? `
                            <button class="btn btn-ghost" style="padding:4px;color:var(--text-muted);" onclick="toggleCollapse('${task.id}')" title="${isCollapsed?'展開':'收合'}">
                                <span style="display:inline-block;transform:rotate(${isCollapsed?'-90':'0'}deg);transition:transform 0.2s;">${Icons.chevronDown}</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${renderTaskBody(task)}
                <div class="progress-container">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${task.progress||0}%"></div>
                    </div>
                    <span class="text-sm font-bold text-muted" style="min-width:40px;text-align:right">${task.progress||0}%</span>
                </div>
            </div>`;
        }).join('')}
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

  state.tasks.forEach(task => {
    const { startDays, duration } = calculateTaskPosition(task, minDate);
    html += `<div class="gantt-body-row">`;
    for (let i = 0; i < dates.length; i++) html += `<div class="gantt-grid-cell"></div>`;
    html += `<div class="gantt-bar ${task.status}"
        style="left:${startDays * 44}px;width:${duration * 44}px;"
        title="${task.name}: ${task.progress}%">
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
                <input type="text" id="postTitle" placeholder="文章標題..." value="${state.editingPost ? state.editingPost.title : ''}" style="margin-bottom:1rem;font-weight:bold;">
                <textarea id="postContent" placeholder="說點什麼來鼓勵大家..." rows="4">${state.editingPost ? state.editingPost.content : ''}</textarea>
                <div class="flex justify-between items-center mt-4">
                    <div class="flex gap-4">
                        <input type="color" id="postColor" value="${state.editingPost ? state.editingPost.color : '#0d9488'}" style="width:40px;height:40px;padding:2px;cursor:pointer;">
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
                    <div class="post-content mt-4" style="color:${post.color||'inherit'};font-weight:${post.isBold?'800':'400'}">${post.content}</div>
                </div>
            `;
        });
    }
    return html;
}

// ── Scroll 保留 helper ──────────────────────────────────
function withScrollPreserved(fn) {
    const el = document.querySelector('.sidebar .card');
    const saved = el ? el.scrollTop : 0;
    fn();
    const nel = document.querySelector('.sidebar .card');
    if (nel) nel.scrollTop = saved;
}

// ── Global Actions ──────────────────────────────────────

// toggleChapter: subCatIdx=null 表示直屬章節，數字表示子類別
window.toggleChapter = (taskId, chapIdx, subCatIdx) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    let updatedTask;
    if (subCatIdx === null || subCatIdx === undefined || subCatIdx === 'null') {
        // 直屬章節
        const chapters = (task.chapters || []).map((c, i) =>
            i === chapIdx ? { ...c, completed: !c.completed } : c
        );
        const toggledChap = chapters[chapIdx];
        const newCompleted = toggledChap.completed;

        // 連動：若有以此為父節點的子類別，把其下所有章節設為相同狀態
        const subCategories = (task.subCategories || []).map(sc => {
            if (sc.parentChapter === toggledChap.name) {
                return {
                    ...sc,
                    chapters: (sc.chapters || []).map(c => ({ ...c, completed: newCompleted }))
                };
            }
            return sc;
        });

        updatedTask = { ...task, chapters, subCategories };
    } else {
        // 子類別章節
        const si = Number(subCatIdx);
        const subCategories = (task.subCategories || []).map((sc, sIdx) => {
            if (sIdx !== si) return sc;
            return {
                ...sc,
                chapters: (sc.chapters || []).map((c, ci) =>
                    ci === chapIdx ? { ...c, completed: !c.completed } : c
                )
            };
        });
        updatedTask = { ...task, subCategories };
    }

    const { progress, status } = calcProgressStatus(updatedTask);
    updatedTask = { ...updatedTask, progress, status };

    // 樂觀更新
    state.tasks = state.tasks.map(t => t.id === taskId ? updatedTask : t);
    withScrollPreserved(() => render());

    // 背景寫 Firestore
    const payload = {
        chapters: updatedTask.chapters || [],
        subCategories: updatedTask.subCategories || [],
        progress,
        status
    };
    db.collection('tasks').doc(taskId).update(payload)
        .catch(err => {
            console.error('章節更新失敗，正在重新同步...', err);
            loadTasksFromFirestore();
        });
};

// 收合/展開科目章節
window.toggleCollapse = (taskId) => {
    withScrollPreserved(() => {
        if (state.collapsedTasks.has(taskId)) {
            state.collapsedTasks.delete(taskId);
        } else {
            state.collapsedTasks.add(taskId);
        }
        render();
    });
};

// 收合/展開子類別
window.toggleSubCatCollapse = (taskId, scIdx) => {
    const key = `${taskId}::${scIdx}`;
    withScrollPreserved(() => {
        if (state.collapsedSubCats.has(key)) {
            state.collapsedSubCats.delete(key);
        } else {
            state.collapsedSubCats.add(key);
        }
        render();
    });
};

// ── Form ───────────────────────────────────────────────

// 在表單中新增直屬章節
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
    if (!container) return;
    container.innerHTML = state.tempChapters.map((c, idx) => `
        <div class="manager-item">
            <span class="text-sm font-medium">${c.name}</span>
            <button class="btn btn-ghost" style="padding:4px;color:#ef4444" onclick="removeChapterInForm(${idx})">${Icons.delete}</button>
        </div>
    `).join('') || '<div class="text-center p-2 text-muted text-sm">尚未新增章節</div>';
}

// 新增子類別
window.addSubCatInForm = () => {
    const name = document.getElementById('newSubCatName').value.trim();
    if (!name) return;
    state.tempSubCategories.push({ name, chapters: [], parentChapter: '' });
    document.getElementById('newSubCatName').value = '';
    renderSubCatManager();
};

// 設定子類別的歸屬直屬章節
window.setSubCatParent = (scIdx, val) => {
    state.tempSubCategories[scIdx].parentChapter = val;
};

window.removeSubCatInForm = (scIdx) => {
    state.tempSubCategories.splice(scIdx, 1);
    renderSubCatManager();
};

// 在某子類別下新增章節
window.addChapterToSubCat = (scIdx) => {
    const input = document.getElementById(`subChapName_${scIdx}`);
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;
    state.tempSubCategories[scIdx].chapters.push({ name, completed: false });
    input.value = '';
    renderSubCatManager();
};

window.removeChapterFromSubCat = (scIdx, chapIdx) => {
    state.tempSubCategories[scIdx].chapters.splice(chapIdx, 1);
    renderSubCatManager();
};

function renderSubCatManager() {
    const container = document.getElementById('subCatManager');
    if (!container) return;
    if (state.tempSubCategories.length === 0) {
        container.innerHTML = '<div class="text-center p-2 text-muted text-sm">尚未新增子類別</div>';
        return;
    }
    container.innerHTML = state.tempSubCategories.map((sc, scIdx) => {
        const parentOptions = [
            `<option value="">── 不歸屬（獨立顯示）</option>`,
            ...state.tempChapters.map(ch =>
                `<option value="${ch.name}" ${sc.parentChapter === ch.name ? 'selected' : ''}}>${ch.name}</option>`
            )
        ].join('');
        const chapList = sc.chapters.map((c, ci) => `
            <div class="manager-item" style="padding:4px 8px;">
                <span class="text-sm">${c.name}</span>
                <button class="btn btn-ghost" style="padding:3px;color:#ef4444" onclick="removeChapterFromSubCat(${scIdx},${ci})">${Icons.delete}</button>
            </div>
        `).join('') || '<div class="text-muted text-sm" style="padding:4px 0;">尚無章節</div>';
        return `
        <div class="sub-cat-form-block">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <span style="opacity:0.5">${Icons.folder}</span>
                    <span class="font-bold text-sm">${sc.name}</span>
                    <span class="text-sm text-muted">(${sc.chapters.length} 章節)</span>
                </div>
                <button class="btn btn-ghost" style="padding:4px;color:#ef4444" onclick="removeSubCatInForm(${scIdx})">${Icons.delete}</button>
            </div>
            <div class="mb-2">
                <label class="text-sm text-muted" style="font-weight:600;display:block;margin-bottom:4px;">歸屬直屬章節：</label>
                <select style="font-size:0.85rem;padding:6px 10px;" onchange="setSubCatParent(${scIdx}, this.value)">${parentOptions}</select>
            </div>
            <div class="flex gap-2 mb-2">
                <input type="text" id="subChapName_${scIdx}" placeholder="新增章節..." style="font-size:0.875rem;">
                <button class="btn btn-primary" style="padding:6px 10px;" onclick="addChapterToSubCat(${scIdx})">${Icons.add}</button>
            </div>
            <div class="sub-chap-list">${chapList}</div>
        </div>`;
    }).join('');
}

function showTaskForm(task) {
  state.tempChapters = task ? JSON.parse(JSON.stringify(task.chapters || [])) : [];
  state.tempSubCategories = task ? JSON.parse(JSON.stringify(task.subCategories || [])) : [];

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content glass" style="max-width:560px;">
      <h3 class="mb-6">${task ? '修改科目資訊' : '建立新科目'}</h3>

      <div class="mb-4">
        <label class="text-sm font-bold text-muted mb-2 block">科目名稱</label>
        <input type="text" id="taskName" value="${task ? task.name : ''}" placeholder="例如: 心血管藥理">
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="text-sm font-bold text-muted mb-2 block">啟始日</label>
          <input type="date" id="taskStart" value="${task ? task.startDate : new Date().toISOString().split('T')[0]}">
        </div>
        <div>
          <label class="text-sm font-bold text-muted mb-2 block">目標截止日</label>
          <input type="date" id="taskEnd" value="${task ? task.endDate : new Date().toISOString().split('T')[0]}">
        </div>
      </div>

      <!-- 直屬章節 -->
      <div class="mb-4">
        <label class="text-sm font-bold text-muted mb-2 block">直屬章節（無子類別）</label>
        <div class="flex gap-2">
            <input type="text" id="newChapName" placeholder="輸入章節名稱...">
            <button class="btn btn-primary" onclick="addChapterInForm()">${Icons.add}</button>
        </div>
        <div id="chapterManager" class="chapter-manager mt-2"></div>
      </div>

      <!-- 子類別 -->
      <div class="mb-6">
        <label class="text-sm font-bold text-muted mb-2 block">子類別（可展開管理）</label>
        <div class="flex gap-2 mb-2">
            <input type="text" id="newSubCatName" placeholder="子類別名稱，例如：心絞痛">
            <button class="btn btn-primary" style="white-space:nowrap;" onclick="addSubCatInForm()">${Icons.add} 新增子類別</button>
        </div>
        <div id="subCatManager" class="sub-cat-manager"></div>
      </div>

      <div class="flex gap-4 justify-end">
        <button id="cancelTask" class="btn btn-ghost">放棄變更</button>
        <button id="submitTask" class="btn btn-primary px-8">${task ? '完成更新' : '確認新增'}</button>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(modal);
  renderChapterManager();
  renderSubCatManager();

  document.getElementById('cancelTask').onclick = () => {
    const parent = document.getElementById('app');
    if (parent.contains(modal)) parent.removeChild(modal);
    setState({ showAddForm: false, editingTask: null });
  };

  document.getElementById('submitTask').onclick = () => {
    const name = document.getElementById('taskName').value.trim();
    if (!name) return alert('請填寫科目名稱');

    const data = {
      name,
      startDate: document.getElementById('taskStart').value,
      endDate: document.getElementById('taskEnd').value,
      chapters: state.tempChapters,
      subCategories: state.tempSubCategories
    };

    // 計算 progress
    const allChaps = [
        ...data.chapters,
        ...data.subCategories.flatMap(sc => sc.chapters || [])
    ];
    if (allChaps.length > 0) {
        const done = allChaps.filter(c => c.completed).length;
        data.progress = Math.round((done / allChaps.length) * 100);
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

// ── Firestore Ops ───────────────────────────────────────
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
  if (!confirm('刪除後無法恢復，確定要移除此科目?')) return;
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

// ── Global Bindings ─────────────────────────────────────
window.editTask = id => setState({ editingTask: state.tasks.find(t => t.id == id) });
window.deleteTask = deleteTaskFromFirestore;
window.submitPost = () => {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const color = document.getElementById('postColor').value;
    const isBold = document.getElementById('postBold').checked;
    if (!title || !content) return alert('請完整填寫公告內容');
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
    if (!confirm('確定移除公告?')) return;
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
