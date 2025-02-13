const { shell, ipcRenderer } = require('electron');
const confetti = require('canvas-confetti');

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
const closeModalBtn = document.getElementById('closeModalBtn');
const closeGroupModalBtn = document.getElementById('closeGroupModalBtn');
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
let currentEditingTodo = null;

// Link detection regex
const urlRegex = /(https?:\/\/[^\s]+)/g;

// Initialize application
async function initializeApp() {
  try {
    todos = await store.get('todos') || [];
    groups = await store.get('groups') || [];

    // Initialize event listeners
    initializeEventListeners();
    initializeSearchableDropdowns();

    // Render initial state
    renderTodos();
    renderGroups();
    updateTitleSuggestions();
    updateDropdowns();
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
  closeModalBtn.addEventListener('click', closeModal);
  saveTodoBtn.addEventListener('click', saveTodo);
  cancelGroupBtn.addEventListener('click', closeGroupModal);
  closeGroupModalBtn.addEventListener('click', closeGroupModal);
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

function updateDropdowns() {
  const dropdowns = ['todoGroupDropdown', 'editTodoGroupDropdown'];
  dropdowns.forEach(dropdownId => {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      updateDropdownItems(dropdown, '');
    }
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
  updateDropdowns();
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
  updateDropdowns();
}

function updateTitleSuggestions() {
  // Get unique titles from existing todos
  const existingTitles = [...new Set(todos.map(todo => todo.title))];

  // Update both datalists
  const datalists = ['titleSuggestions', 'editTitleSuggestions'];
  datalists.forEach(listId => {
    const datalist = document.getElementById(listId);
    datalist.innerHTML = existingTitles
      .map(title => `<option value="${title}">`)
      .join('');
  });
}

function initializeSearchableDropdowns() {
  // New Todo Form Dropdown
  const todoGroupSearch = document.getElementById('todoGroupSearch');
  const todoGroupDropdown = document.getElementById('todoGroupDropdown');

  todoGroupSearch.addEventListener('click', () => {
    todoGroupDropdown.classList.add('show');
    updateDropdownItems(todoGroupDropdown, todoGroupSearch.value);
  });

  todoGroupSearch.addEventListener('focus', () => {
    todoGroupDropdown.classList.add('show');
    updateDropdownItems(todoGroupDropdown, todoGroupSearch.value);
  });

  todoGroupSearch.addEventListener('input', (e) => {
    updateDropdownItems(todoGroupDropdown, e.target.value);
  });

  // Edit Form Dropdown
  const editTodoGroupSearch = document.getElementById('editTodoGroupSearch');
  const editTodoGroupDropdown = document.getElementById('editTodoGroupDropdown');

  editTodoGroupSearch.addEventListener('click', () => {
    editTodoGroupDropdown.classList.add('show');
    updateDropdownItems(editTodoGroupDropdown, editTodoGroupSearch.value);
  });

  editTodoGroupSearch.addEventListener('focus', () => {
    editTodoGroupDropdown.classList.add('show');
    updateDropdownItems(editTodoGroupDropdown, editTodoGroupSearch.value);
  });

  editTodoGroupSearch.addEventListener('input', (e) => {
    updateDropdownItems(editTodoGroupDropdown, e.target.value);
  });

  // Handle dropdown item selection
  todoGroupDropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (item) {
      selectedGroup = item.dataset.value;
      todoGroupSearch.value = item.textContent;
      todoGroupDropdown.classList.remove('show');
    }
  });

  editTodoGroupDropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (item) {
      selectedEditGroup = item.dataset.value;
      editTodoGroupSearch.value = item.textContent;
      editTodoGroupDropdown.classList.remove('show');
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-select')) {
      todoGroupDropdown.classList.remove('show');
      editTodoGroupDropdown.classList.remove('show');
    }
  });
}

function updateDropdownItems(dropdown, searchText) {
  // Reset dropdown content
  dropdown.innerHTML = '<div class="dropdown-item" data-value="">No Group</div>';

  // Filter and add groups
  const filteredGroups = groups.filter(group =>
    !searchText || group.toLowerCase().includes(searchText.toLowerCase())
  );

  filteredGroups.forEach(group => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.dataset.value = group;
    item.textContent = group;
    dropdown.appendChild(item);
  });

  // Show dropdown
  dropdown.classList.add('show');
}

async function saveTodo() {
  const title = document.getElementById('todoTitle').value.trim();
  const description = document.getElementById('todoDescription').value.trim();
  const group = document.getElementById('todoGroupSearch').value.trim();

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
  updateTitleSuggestions();
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    const wasCompleted = todo.completed;
    todo.completed = !todo.completed;
    await store.set('todos', todos);
    renderTodos();

    // If todo was just completed (not uncompleted), trigger confetti
    if (!wasCompleted && todo.completed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

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
  updateTitleSuggestions(); // Update suggestions after deleting todo
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
          <div class="todo-content-bottom ${todo.group ? 'has-group' : ''} ${todo.images.length ? 'has-images' : ''}">
            ${todo.group ? `<span class="group-tag">${todo.group}</span>` : ''}
            <div class="todo-images">
              ${todo.images.length ? `${todo.images.length} images` : ''}
            </div>
          </div>
        </div>
      </div>
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
  document.getElementById('todoGroupSearch').value = '';
  previewImage.innerHTML = '';
  currentImages = [];
  updateDropdowns();
}

function showEditForm(todo) {
  currentEditingTodo = todo;
  const detailView = document.querySelector('.detail-view');
  const editView = document.querySelector('.detail-edit');

  // Populate edit form
  document.getElementById('editTodoTitle').value = todo.title;
  document.getElementById('editTodoDescription').value = todo.description || '';
  document.getElementById('editTodoGroupSearch').value = todo.group || '';

  // Show images in edit form
  const editPreviewImage = document.getElementById('editPreviewImage');
  editPreviewImage.innerHTML = '';
  if (todo.images && todo.images.length > 0) {
    todo.images.forEach(image => {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'image-preview-item';

      const img = document.createElement('img');
      img.src = image;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-image';
      removeBtn.innerHTML = '<span class="iconify" data-icon="pixelarticons:close"></span>';
      removeBtn.onclick = () => {
        imgContainer.remove();
      };

      imgContainer.appendChild(img);
      imgContainer.appendChild(removeBtn);
      editPreviewImage.appendChild(imgContainer);
    });
  }

  // Switch views
  detailView.style.display = 'none';
  editView.style.display = 'block';
}

function hideEditForm() {
  const detailView = document.querySelector('.detail-view');
  const editView = document.querySelector('.detail-edit');

  detailView.style.display = 'block';
  editView.style.display = 'none';
  currentEditingTodo = null;
}

// Add event listeners for edit functionality
document.getElementById('detailEditBtn').addEventListener('click', async () => {
  if (currentDetailTodo) {
    showEditForm(currentDetailTodo);
  }
});

document.getElementById('editCancelBtn').addEventListener('click', hideEditForm);
document.getElementById('editSaveBtn').addEventListener('click', async () => {
  await saveEditedTodo();
});

// Add image upload functionality to edit form
const editImageUploadArea = document.getElementById('editImageUploadArea');
editImageUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  editImageUploadArea.style.borderColor = '#007AFF';
});

editImageUploadArea.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  editImageUploadArea.style.borderColor = '#e0e0e0';
});

editImageUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  editImageUploadArea.style.borderColor = '#e0e0e0';

  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
  files.forEach(handleEditImage);
});

editImageUploadArea.addEventListener('paste', (e) => {
  const items = e.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      handleEditImage(file);
      break;
    }
  }
});

function handleEditImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageData = e.target.result;
    const editPreviewImage = document.getElementById('editPreviewImage');

    const imgContainer = document.createElement('div');
    imgContainer.className = 'image-preview-item';

    const img = document.createElement('img');
    img.src = imageData;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image';
    removeBtn.innerHTML = '<span class="iconify" data-icon="pixelarticons:close"></span>';
    removeBtn.onclick = () => {
      imgContainer.remove();
    };

    imgContainer.appendChild(img);
    imgContainer.appendChild(removeBtn);
    editPreviewImage.appendChild(imgContainer);
  };
  reader.readAsDataURL(file);
}

async function saveEditedTodo() {
  if (!currentEditingTodo) return;

  const storedTodos = await store.get('todos') || [];
  const todoIndex = storedTodos.findIndex(t => t.id === currentEditingTodo.id);

  if (todoIndex === -1) return;

  // Get edited values
  const editedTodo = {
    ...currentEditingTodo,
    title: document.getElementById('editTodoTitle').value,
    description: document.getElementById('editTodoDescription').value,
    group: document.getElementById('editTodoGroupSearch').value.trim(),
    images: Array.from(document.getElementById('editPreviewImage').querySelectorAll('img')).map(img => img.src)
  };

  // Update stored todos
  storedTodos[todoIndex] = editedTodo;
  await store.set('todos', storedTodos);

  // Update global todos state
  todos = storedTodos;

  // Update detail view
  currentDetailTodo = editedTodo;
  updateDetailView();
  hideEditForm();
  renderTodos();
  updateTitleSuggestions();
} 