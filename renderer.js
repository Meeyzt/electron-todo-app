const { shell, ipcRenderer } = require('electron');

// Store wrapper for IPC communication
const store = {
  async get(key) {
    return await ipcRenderer.invoke('store-get', key);
  },
  async set(key, value) {
    return await ipcRenderer.invoke('store-set', key, value);
  }
};

// DOM Elements
const addTodoBtn = document.getElementById('addTodoBtn');
const addGroupBtn = document.getElementById('addGroupBtn');
const desktopAddTodoBtn = document.getElementById('desktopAddTodoBtn');
const desktopAddGroupBtn = document.getElementById('desktopAddGroupBtn');
const todoModal = document.getElementById('todoModal');
const groupModal = document.getElementById('groupModal');
const todoDetailModal = document.getElementById('todoDetailModal');
const cancelTodoBtn = document.getElementById('cancelTodo');
const saveTodoBtn = document.getElementById('saveTodo');
const cancelGroupBtn = document.getElementById('cancelGroup');
const saveGroupBtn = document.getElementById('saveGroup');
const todoList = document.getElementById('todoList');
const groupsList = document.getElementById('groupsList');
const todoGroupSelect = document.getElementById('todoGroup');
const imageUploadArea = document.getElementById('imageUploadArea');
const previewImage = document.getElementById('previewImage');
const filterBtns = document.querySelectorAll('.filter-btn');
const closeDetailBtn = document.querySelector('.close-detail-btn');
const detailTitle = document.getElementById('detailTitle');
const detailGroup = document.getElementById('detailGroup');
const detailDescription = document.getElementById('detailDescription');
const detailImages = document.getElementById('detailImages');
const detailCompleteBtn = document.getElementById('detailCompleteBtn');
const detailDeleteBtn = document.getElementById('detailDeleteBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.sidebar');

// Initialize state variables
let todos = [];
let groups = [];
let currentFilter = 'active';
let currentGroup = 'all';
let currentImages = [];
let currentDetailTodo = null;

// Link detection regex
const urlRegex = /(https?:\/\/[^\s]+)/g;

// Initialize application
async function initializeApp() {
  try {
    todos = await store.get('todos') || [];
    groups = await store.get('groups') || [];

    // Initialize event listeners
    initializeEventListeners();

    // Render initial state
    renderTodos();
    renderGroups();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Start initialization
initializeApp();

function initializeEventListeners() {
  // Event Listeners for mobile buttons
  addTodoBtn.addEventListener('click', openTodoModal);
  addGroupBtn.addEventListener('click', openGroupModal);

  // Event Listeners for desktop buttons
  desktopAddTodoBtn.addEventListener('click', openTodoModal);
  desktopAddGroupBtn.addEventListener('click', openGroupModal);

  cancelTodoBtn.addEventListener('click', closeModal);
  saveTodoBtn.addEventListener('click', saveTodo);
  cancelGroupBtn.addEventListener('click', closeGroupModal);
  saveGroupBtn.addEventListener('click', saveGroup);
  closeDetailBtn.addEventListener('click', closeDetailModal);

  detailCompleteBtn.addEventListener('click', () => {
    if (currentDetailTodo) {
      toggleTodo(currentDetailTodo.id);
      updateDetailView();
    }
  });

  detailDeleteBtn.addEventListener('click', () => {
    if (currentDetailTodo) {
      deleteTodo(currentDetailTodo.id);
      closeDetailModal();
    }
  });

  // Handle keyboard events
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && currentDetailTodo) {
      deleteTodo(currentDetailTodo.id);
      closeDetailModal();
    }
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      if (!filter) return;

      currentFilter = filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderTodos();
    });
  });

  // Image handling
  document.addEventListener('paste', (e) => {
    if (!todoModal.style.display || todoModal.style.display === 'none') return;

    const items = e.clipboardData.items;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        handleImage(file);
        break;
      }
    }
  });

  imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUploadArea.style.borderColor = '#007AFF';
  });

  imageUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUploadArea.style.borderColor = '#e0e0e0';
  });

  imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUploadArea.style.borderColor = '#e0e0e0';

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    files.forEach(handleImage);
  });

  // Add link click handlers
  todoList.addEventListener('click', handleLinkClick);
  detailDescription.addEventListener('click', handleLinkClick);

  // Sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      const isClickInsideSidebar = sidebar.contains(e.target);
      const isClickOnToggle = sidebarToggle.contains(e.target);

      if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    }
  });

  // Close sidebar when resizing above mobile breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  });
}

function makeLinksClickable(text) {
  if (!text) return '';
  return text.replace(urlRegex, url => `<a href="${url}" class="clickable-link">${url}</a>`);
}

function handleLinkClick(event) {
  const link = event.target;
  if (link.classList.contains('clickable-link')) {
    event.preventDefault();
    event.stopPropagation();
    shell.openExternal(link.href);
  }
}

function handleImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageData = e.target.result;
    currentImages.push(imageData);
    updateImagePreview();
  };
  reader.readAsDataURL(file);
}

function updateImagePreview() {
  previewImage.innerHTML = currentImages.map((img, index) => `
    <div class="image-preview-item">
      <img src="${img}" alt="Preview">
      <button class="remove-image" onclick="removeImage(${index})">×</button>
    </div>
  `).join('');
}

function removeImage(index) {
  currentImages.splice(index, 1);
  updateImagePreview();
}

function openGroupModal() {
  groupModal.style.display = 'block';
  document.getElementById('groupName').value = '';
}

function closeGroupModal() {
  groupModal.style.display = 'none';
}

function openDetailModal(todo) {
  currentDetailTodo = todo;
  todoDetailModal.style.display = 'block';
  updateDetailView();
}

function closeDetailModal() {
  todoDetailModal.style.display = 'none';
  currentDetailTodo = null;
}

function updateDetailView() {
  if (!currentDetailTodo) return;

  detailTitle.innerHTML = makeLinksClickable(currentDetailTodo.title);
  detailGroup.textContent = currentDetailTodo.group || 'No Group';
  detailDescription.innerHTML = makeLinksClickable(currentDetailTodo.description || '');
  detailImages.innerHTML = (currentDetailTodo.images || []).map(img => `
    <img src="${img}" alt="Todo image">
  `).join('');

  detailCompleteBtn.textContent = currentDetailTodo.completed ? 'Undo' : 'Complete';
}

function updateGroupSelect() {
  todoGroupSelect.innerHTML = '<option value="">No Group</option>';
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    todoGroupSelect.appendChild(option);
  });
}

async function saveGroup() {
  const groupName = document.getElementById('groupName').value.trim();
  if (!groupName) {
    alert('Please enter a group name');
    return;
  }

  if (groups.includes(groupName)) {
    alert('Group already exists');
    return;
  }

  groups.push(groupName);
  await store.set('groups', groups);
  groupModal.style.display = 'none';
  renderGroups();
  updateGroupSelect();
}

function renderGroups() {
  groupsList.innerHTML = `
    <div class="group ${currentGroup === 'all' ? 'active' : ''}" data-group="all">
      <span>All Todos</span>
    </div>
    <div class="group ${currentGroup === 'ungrouped' ? 'active' : ''}" data-group="ungrouped">
      <span>Ungrouped</span>
    </div>
  `;

  if (groups.length > 0) {
    const groupsHtml = groups.map(group => `
      <div class="group ${currentGroup === group ? 'active' : ''}" data-group="${group}">
        <span>${group}</span>
        <button class="group-delete" onclick="event.stopPropagation(); deleteGroup('${group}')">
          <span class="iconify" data-icon="pixelarticons:close"></span>
        </button>
      </div>
    `).join('');
    groupsList.insertAdjacentHTML('beforeend', groupsHtml);
  }

  document.querySelectorAll('.group').forEach(groupEl => {
    groupEl.addEventListener('click', () => {
      currentGroup = groupEl.dataset.group;
      document.querySelectorAll('.group').forEach(g => g.classList.remove('active'));
      groupEl.classList.add('active');
      renderTodos();
    });
  });
}

async function deleteGroup(groupName) {
  const confirmDelete = confirm(`Are you sure you want to delete "${groupName}" group?`);
  if (!confirmDelete) return;

  // Remove group from groups array
  groups = groups.filter(g => g !== groupName);
  await store.set('groups', groups);

  // Update todos that were in this group to have no group
  todos = todos.map(todo => {
    if (todo.group === groupName) {
      return { ...todo, group: '' };
    }
    return todo;
  });
  await store.set('todos', todos);

  // If the deleted group was selected, switch to 'all'
  if (currentGroup === groupName) {
    currentGroup = 'all';
  }

  // Re-render everything
  renderGroups();
  renderTodos();
  updateGroupSelect();
}

async function saveTodo() {
  const title = document.getElementById('todoTitle').value.trim();
  const description = document.getElementById('todoDescription').value.trim();
  const group = todoGroupSelect.value;

  if (!title) {
    alert('Please enter a title');
    return;
  }

  const todo = {
    id: Date.now(),
    title,
    description,
    group,
    completed: false,
    images: [...currentImages]
  };

  todos.push(todo);
  await store.set('todos', todos);
  todoModal.style.display = 'none';
  currentImages = [];
  renderTodos();
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    await store.set('todos', todos);
    renderTodos();
    if (currentDetailTodo && currentDetailTodo.id === id) {
      updateDetailView();
    }
  }
}

async function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  await store.set('todos', todos);
  renderTodos();
  closeDetailModal();
}

function renderTodos() {
  let filteredTodos = [...todos];

  filteredTodos = filteredTodos.filter(todo =>
    currentFilter === 'active' ? !todo.completed : todo.completed
  );

  if (currentGroup !== 'all') {
    filteredTodos = filteredTodos.filter(todo => {
      if (currentGroup === 'ungrouped') {
        return !todo.group || todo.group === '';
      }
      return todo.group === currentGroup;
    });
  }

  todoList.innerHTML = filteredTodos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" onclick="openDetailModal(${todo.id})">
      <div class="todo-header">
        <div class="todo-checkbox" onclick="event.stopPropagation(); toggleTodo(${todo.id});">
          ${todo.completed ? '<span class="iconify" data-icon="pixelarticons:check"></span>' : ''}
        </div>
        <div class="todo-content">
          <h3>${makeLinksClickable(todo.title)}</h3>
          ${todo.group ? `<span class="group-tag">${todo.group}</span>` : ''}
        </div>
      </div>
      ${todo.images ? `${todo.images.length} images` : ''}
    </div>
  `).join('');
}

// Make functions available globally
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.removeImage = removeImage;
window.openDetailModal = (id) => {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  currentDetailTodo = todo;
  todoDetailModal.style.display = 'block';
  updateDetailView();
};

function closeModal() {
  todoModal.style.display = 'none';
  currentImages = [];
}

// Add to global scope
window.deleteGroup = deleteGroup;

function openTodoModal() {
  todoModal.style.display = 'block';
  document.getElementById('todoTitle').value = '';
  document.getElementById('todoDescription').value = '';
  todoGroupSelect.value = '';
  previewImage.innerHTML = '';
  currentImages = [];
  updateGroupSelect();
} 