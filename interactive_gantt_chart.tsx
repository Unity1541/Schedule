import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, Users, Eye, Settings, Lock, Unlock } from 'lucide-react';

const GanttChartSystem = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      name: '專案規劃',
      startDate: '2025-01-01',
      endDate: '2025-01-10',
      progress: 100,
      color: '#3b82f6',
      assignee: '張三',
      status: 'completed'
    },
    {
      id: 2,
      name: '設計階段',
      startDate: '2025-01-08',
      endDate: '2025-01-20',
      progress: 75,
      color: '#10b981',
      assignee: '李四',
      status: 'in-progress'
    },
    {
      id: 3,
      name: '開發階段',
      startDate: '2025-01-15',
      endDate: '2025-02-10',
      progress: 30,
      color: '#f59e0b',
      assignee: '王五',
      status: 'in-progress'
    },
    {
      id: 4,
      name: '測試階段',
      startDate: '2025-02-05',
      endDate: '2025-02-20',
      progress: 0,
      color: '#ef4444',
      assignee: '趙六',
      status: 'pending'
    }
  ]);

  const [viewMode, setViewMode] = useState('client'); // 'client' or 'admin'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [password, setPassword] = useState('');

  // 簡單的認證系統
  const adminPassword = 'admin123';
  
  const handleLogin = () => {
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setViewMode('admin');
      setPassword('');
    } else {
      alert('密碼錯誤！');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setViewMode('client');
    setPassword('');
  };

  // 計算日期範圍
  const getDateRange = () => {
    const allDates = tasks.flatMap(task => [new Date(task.startDate), new Date(task.endDate)]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);
    
    return { minDate, maxDate };
  };

  // 生成日期網格
  const generateDateGrid = () => {
    const { minDate, maxDate } = getDateRange();
    const dates = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // 計算任務在網格中的位置
  const calculateTaskPosition = (task) => {
    const { minDate } = getDateRange();
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    
    const startDays = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
    const duration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    return { startDays, duration };
  };

  // 任務管理功能（僅管理員模式）
  const addTask = (taskData) => {
    if (viewMode !== 'admin') return;
    
    const newTask = {
      id: Date.now(),
      ...taskData,
      progress: 0,
      color: '#6366f1',
      status: 'pending'
    };
    setTasks([...tasks, newTask]);
    setShowAddForm(false);
  };

  const updateTask = (id, updates) => {
    if (viewMode !== 'admin') return;
    
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (id) => {
    if (viewMode !== 'admin') return;
    
    setTasks(tasks.filter(task => task.id !== id));
  };

  // 拖拽功能（僅管理員模式）
  const handleMouseDown = (e, task) => {
    if (viewMode !== 'admin') return;
    
    setDraggedTask(task);
    setDragStart({ x: e.clientX, startDate: task.startDate, endDate: task.endDate });
  };

  const handleMouseMove = (e) => {
    if (!draggedTask || !dragStart || viewMode !== 'admin') return;
    
    const deltaX = e.clientX - dragStart.x;
    const daysDelta = Math.round(deltaX / 30);
    
    if (daysDelta !== 0) {
      const newStartDate = new Date(dragStart.startDate);
      const newEndDate = new Date(dragStart.endDate);
      newStartDate.setDate(newStartDate.getDate() + daysDelta);
      newEndDate.setDate(newEndDate.getDate() + daysDelta);
      
      updateTask(draggedTask.id, {
        startDate: newStartDate.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0]
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedTask(null);
    setDragStart(null);
  };

  useEffect(() => {
    if (draggedTask && viewMode === 'admin') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedTask, dragStart, viewMode]);

  const dates = generateDateGrid();
  const today = new Date();

  // 狀態顏色映射
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in-progress': return '進行中';
      case 'pending': return '待開始';
      default: return '未知';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white">
      {/* 頂部控制欄 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">專案甘特圖</h1>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              viewMode === 'client' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {viewMode === 'client' ? '客戶檢視模式' : '管理員模式'}
            </div>
            {viewMode === 'client' && (
              <Eye className="w-4 h-4 text-blue-600" />
            )}
            {viewMode === 'admin' && (
              <Settings className="w-4 h-4 text-green-600" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 模式切換 */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="輸入管理員密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Lock size={16} />
                管理員登入
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Unlock size={16} />
              登出
            </button>
          )}

          {/* 新增任務按鈕（僅管理員模式） */}
          {viewMode === 'admin' && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              新增任務
            </button>
          )}
        </div>
      </div>

      {/* 功能說明 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">使用說明</h3>
            {viewMode === 'client' ? (
              <p className="text-sm text-gray-600">
                您目前處於<strong>客戶檢視模式</strong>，可以查看專案進度但無法修改任務。
                此模式適合展示給客戶、團隊成員或利害關係人查看。
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                您目前處於<strong>管理員模式</strong>，可以完整管理所有任務：新增、編輯、刪除、拖拽調整時間。
                此模式適合專案管理者使用。
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>已完成</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>進行中</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>待開始</span>
            </div>
          </div>
        </div>
      </div>

      {/* 任務統計 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
          <div className="text-sm text-gray-500">總任務數</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {tasks.filter(t => t.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500">已完成</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {tasks.filter(t => t.status === 'in-progress').length}
          </div>
          <div className="text-sm text-gray-500">進行中</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">
            {tasks.filter(t => t.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-500">待開始</div>
        </div>
      </div>

      {/* 甘特圖主體 */}
      <div className="bg-gray-50 rounded-lg overflow-hidden shadow-lg">
        <div className="grid grid-cols-12 gap-0">
          {/* 左側任務列表 */}
          <div className="col-span-4 bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">任務清單</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {tasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{task.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {task.startDate} - {task.endDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {task.assignee}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{task.progress}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按鈕（僅管理員模式顯示） */}
                    {viewMode === 'admin' && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側甘特圖 */}
          <div className="col-span-8 overflow-x-auto">
            <div className="min-w-full">
              {/* 日期標題 */}
              <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                {dates.map((date, index) => (
                  <div
                    key={index}
                    className={`min-w-[30px] p-2 text-xs text-center border-r border-gray-200 ${
                      date.toDateString() === today.toDateString()
                        ? 'bg-blue-100 text-blue-800 font-semibold'
                        : 'text-gray-600'
                    }`}
                  >
                    <div>{date.getDate()}</div>
                    <div className="mt-1">{date.toLocaleDateString('zh-TW', { weekday: 'short' })}</div>
                  </div>
                ))}
              </div>

              {/* 任務條 */}
              <div className="relative">
                {/* 今天的垂直線 */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{
                    left: `${dates.findIndex(date => 
                      date.toDateString() === today.toDateString()
                    ) * 30 + 15}px`
                  }}
                />

                {tasks.map((task, taskIndex) => {
                  const { startDays, duration } = calculateTaskPosition(task);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center h-16 border-b border-gray-100 relative"
                    >
                      {/* 網格背景 */}
                      {dates.map((_, dateIndex) => (
                        <div
                          key={dateIndex}
                          className="min-w-[30px] h-full border-r border-gray-100"
                        />
                      ))}

                      {/* 任務條 */}
                      <div
                        className={`absolute h-8 rounded-md shadow-sm hover:shadow-md transition-shadow flex items-center px-2 text-white text-sm font-medium ${
                          viewMode === 'admin' ? 'cursor-move' : 'cursor-default'
                        }`}
                        style={{
                          left: `${startDays * 30}px`,
                          width: `${duration * 30}px`,
                          backgroundColor: task.color,
                          top: '50%',
                          transform: 'translateY(-50%)'
                        }}
                        onMouseDown={(e) => handleMouseDown(e, task)}
                      >
                        <div className="flex-1 truncate">{task.name}</div>
                        <div className="text-xs opacity-75">{task.progress}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 表單彈窗（僅管理員模式） */}
      {viewMode === 'admin' && showAddForm && (
        <TaskForm
          onSubmit={addTask}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {viewMode === 'admin' && editingTask && (
        <TaskForm
          task={editingTask}
          onSubmit={(data) => {
            updateTask(editingTask.id, data);
            setEditingTask(null);
          }}
          onCancel={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};

// 任務表單組件
const TaskForm = ({ task, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    startDate: task?.startDate || new Date().toISOString().split('T')[0],
    endDate: task?.endDate || new Date().toISOString().split('T')[0],
    assignee: task?.assignee || '',
    progress: task?.progress || 0,
    status: task?.status || 'pending'
  });

  const handleSubmit = () => {
    if (formData.name.trim() === '') return;
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {task ? '編輯任務' : '新增任務'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任務名稱
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日期
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                結束日期
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              負責人
            </label>
            <input
              type="text"
              value={formData.assignee}
              onChange={(e) => setFormData({...formData, assignee: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任務狀態
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">待開始</option>
              <option value="in-progress">進行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              進度 ({formData.progress}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({...formData, progress: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              {task ? '更新' : '新增'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChartSystem;