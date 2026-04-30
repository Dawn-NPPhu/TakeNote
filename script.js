const STORAGE_KEY = 'notestudio_users_v1';
const SESSION_KEY = 'notestudio_current_user_v1';
const CODE_KEY = 'notestudio_codes_v1';
const NOTES_KEY = 'notestudio_notes_v1';

let notes = loadJSON(NOTES_KEY, []);
let activeNoteId = null;
let notesLayout = 'grid';
let noteKeyword = '';
let noteFilter = 'all';
let selectedLabel = '';
let autosaveTimer = null;

const featureList = [
  { id: 1, title: 'Đăng ký người dùng', detail: 'Tạo tài khoản mới với họ tên, email, mật khẩu và kiểm tra nhập lại mật khẩu.', icon: '🧾', gradient: 'linear-gradient(135deg, #f06292, #e74c99)' },
  { id: 2, title: 'Kích hoạt tài khoản', detail: 'Mô phỏng mã kích hoạt email trước khi cho phép đăng nhập.', icon: '✅', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  { id: 3, title: 'Đăng nhập và đăng xuất', detail: 'Kiểm tra email, mật khẩu, trạng thái kích hoạt và cho phép thoát phiên.', icon: '🔑', gradient: 'linear-gradient(135deg, #2196f3, #3f51b5)' },
  { id: 4, title: 'Đặt lại mật khẩu', detail: 'Tạo mã reset, xác thực mã và cập nhật mật khẩu mới.', icon: '♻️', gradient: 'linear-gradient(135deg, #ff9800, #f44336)' },
  { id: 5, title: 'Xem hồ sơ và ảnh đại diện', detail: 'Hiển thị tên, email, ngày tạo, trạng thái và avatar.', icon: '👤', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { id: 6, title: 'Chỉnh sửa hồ sơ và ảnh đại diện', detail: 'Cho phép đổi họ tên, giới thiệu ngắn, số điện thoại và tải ảnh đại diện.', icon: '🖼️', gradient: 'linear-gradient(135deg, #06b6d4, #0284c7)' },
  { id: 7, title: 'Thay đổi mật khẩu', detail: 'Người dùng đăng nhập nhập mật khẩu cũ và đặt mật khẩu mới.', icon: '🔐', gradient: 'linear-gradient(135deg, #64748b, #334155)' },
  { id: 8, title: 'Tùy chọn của người dùng', detail: 'Lưu chủ đề, màu nhấn, chế độ gọn, thông báo và tự động lưu.', icon: '⚙️', gradient: 'linear-gradient(135deg, #4caf50, #009688)' }
];

let users = loadJSON(STORAGE_KEY, []);
let codes = loadJSON(CODE_KEY, {});
let currentEmail = null;
localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY); // Luôn yêu cầu đăng nhập khi mở lại trang
let activeFeature = 1;
let activeView = 'notes';

const authOverlay = document.getElementById('authOverlay');
const authMessage = document.getElementById('authMessage');
const featureCards = document.getElementById('featureCards');
const contentArea = document.getElementById('contentArea');
const breadcrumb = document.getElementById('breadcrumb');
const currentViewTitle = document.getElementById('currentViewTitle');
const doneCounter = document.getElementById('doneCounter');
const miniName = document.getElementById('miniName');
const miniStatus = document.getElementById('miniStatus');
const miniAvatar = document.getElementById('miniAvatar');

seedDemoUser();
bindEvents();
renderFeatureCards();
renderApp();

function bindEvents() {
  document.querySelectorAll('[data-auth-tab]').forEach(button => {
    button.addEventListener('click', () => switchAuthTab(button.dataset.authTab));
  });

  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('activateForm').addEventListener('submit', handleActivate);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('resetForm').addEventListener('submit', handleResetPassword);
  document.getElementById('createResetCode').addEventListener('click', createResetCode);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('openProfileBtn').addEventListener('click', () => openView('profile'));
  document.getElementById('quickNewNote').addEventListener('click', () => {
    activeView = 'notes';
    createNewNote();
  });
  const globalNoteSearch = document.getElementById('globalNoteSearch');
  if (globalNoteSearch) {
    globalNoteSearch.addEventListener('input', event => {
      noteKeyword = event.target.value;
      activeView = 'notes';
      renderApp();
    });
  }

  document.getElementById('sideGridBtn')?.addEventListener('click', () => {
    notesLayout = 'grid';
    activeView = 'notes';
    renderApp();
  });

  document.getElementById('sideListBtn')?.addEventListener('click', () => {
    notesLayout = 'list';
    activeView = 'notes';
    renderApp();
  });

  document.querySelectorAll('[data-note-filter]').forEach(button => {
    button.addEventListener('click', () => {
      noteFilter = button.dataset.noteFilter;
      selectedLabel = '';
      activeView = 'notes';
      renderApp();
    });
  });

  document.getElementById('addLabelBtn')?.addEventListener('click', addLabelToCurrentNote);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => openView(item.dataset.view));
  });
}

function seedDemoUser() {
  const exists = users.some(user => user.email === 'demo@notestudio.vn');
  if (!exists) {
    users.push({
      name: 'Phong Phú',
      email: 'demo@notestudio.vn',
      password: '123456',
      active: true,
      phone: '0900000000',
      bio: 'Tài khoản demo dùng để thầy kiểm tra nhanh các chức năng người dùng.',
      avatar: '',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      settings: {
        theme: 'light',
        accent: '#e74c99',
        autosave: true,
        emailNotify: true,
        compact: false
      },
      completed: [1, 2, 3, 4, 5, 6, 7, 8]
    });
    saveUsers();
  }
}

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveUsers() {
  saveJSON(STORAGE_KEY, users);
}

function saveCodes() {
  saveJSON(CODE_KEY, codes);
}

function getCurrentUser() {
  return users.find(user => user.email === currentEmail) || null;
}

function updateCurrentUser(patch) {
  const index = users.findIndex(user => user.email === currentEmail);
  if (index === -1) return null;
  users[index] = { ...users[index], ...patch };
  saveUsers();
  return users[index];
}

function markDone(id) {
  const user = getCurrentUser();
  if (!user) return;
  const completed = new Set(user.completed || []);
  completed.add(id);
  updateCurrentUser({ completed: [...completed].sort((a, b) => a - b) });
  renderFeatureCards();
  updateMiniProfile();
}

function switchAuthTab(tabName) {
  document.querySelectorAll('[data-auth-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.authTab === tabName);
  });
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.getElementById(`${tabName}Form`).classList.add('active');
  setAuthMessage('');
}

function setAuthMessage(text, type = '') {
  authMessage.textContent = text;
  authMessage.className = `message ${type}`;
}

function generateCode(prefix = 'NS') {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim().toLowerCase();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;

  if (users.some(user => user.email === email)) {
    setAuthMessage('Email này đã được đăng ký.', 'error');
    return;
  }

  if (password !== confirm) {
    setAuthMessage('Mật khẩu nhập lại không khớp.', 'error');
    return;
  }

  const activationCode = generateCode('ACT');
  users.push({
    name,
    email,
    password,
    active: false,
    phone: '',
    bio: '',
    avatar: '',
    createdAt: new Date().toLocaleDateString('vi-VN'),
    settings: {
      theme: 'light',
      accent: '#e74c99',
      autosave: true,
      emailNotify: true,
      compact: false
    },
    completed: [1]
  });

  codes[email] = { ...codes[email], activation: activationCode };
  saveUsers();
  saveCodes();

  document.getElementById('activateEmail').value = email;
  document.getElementById('activateCode').value = activationCode;
  document.getElementById('activationHint').innerHTML = `Mã kích hoạt mới: <b>${activationCode}</b>`;
  setAuthMessage(`Đăng ký thành công. Mã kích hoạt: ${activationCode}`, 'success');
  switchAuthTab('activate');
}

function handleActivate(event) {
  event.preventDefault();
  const email = document.getElementById('activateEmail').value.trim().toLowerCase();
  const code = document.getElementById('activateCode').value.trim();
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    setAuthMessage('Không tìm thấy tài khoản cần kích hoạt.', 'error');
    return;
  }

  if (users[userIndex].active) {
    setAuthMessage('Tài khoản này đã được kích hoạt trước đó.', 'success');
    switchAuthTab('login');
    return;
  }

  if (!codes[email] || codes[email].activation !== code) {
    setAuthMessage('Mã kích hoạt không đúng.', 'error');
    return;
  }

  users[userIndex].active = true;
  users[userIndex].completed = uniqueNumbers([...(users[userIndex].completed || []), 2]);
  delete codes[email].activation;
  saveUsers();
  saveCodes();
  document.getElementById('loginEmail').value = email;
  setAuthMessage('Kích hoạt thành công. Bây giờ có thể đăng nhập.', 'success');
  switchAuthTab('login');
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const user = users.find(item => item.email === email);

  if (!user || user.password !== password) {
    setAuthMessage('Email hoặc mật khẩu không đúng.', 'error');
    return;
  }

  if (!user.active) {
    setAuthMessage('Tài khoản chưa kích hoạt. Vui lòng sang tab Kích hoạt.', 'error');
    document.getElementById('activateEmail').value = email;
    switchAuthTab('activate');
    return;
  }

  currentEmail = email;
  sessionStorage.setItem(SESSION_KEY, email);
  markDone(3);
  authOverlay.classList.add('hidden');
  applyUserSettings();
  renderApp();
  showToast('Đăng nhập thành công.');
}

function createResetCode() {
  const email = document.getElementById('resetEmail').value.trim().toLowerCase();
  const user = users.find(item => item.email === email);

  if (!user) {
    setAuthMessage('Không tìm thấy email để đặt lại mật khẩu.', 'error');
    return;
  }

  const resetCode = generateCode('RST');
  codes[email] = { ...codes[email], reset: resetCode };
  saveCodes();
  document.getElementById('resetCode').value = resetCode;
  document.getElementById('resetHint').innerHTML = `Mã đặt lại mới: <b>${resetCode}</b>`;
  setAuthMessage(`Đã tạo mã reset: ${resetCode}`, 'success');
}

function handleResetPassword(event) {
  event.preventDefault();
  const email = document.getElementById('resetEmail').value.trim().toLowerCase();
  const code = document.getElementById('resetCode').value.trim();
  const newPassword = document.getElementById('resetPassword').value;
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    setAuthMessage('Không tìm thấy tài khoản.', 'error');
    return;
  }

  if (!codes[email] || codes[email].reset !== code) {
    setAuthMessage('Mã đặt lại không hợp lệ.', 'error');
    return;
  }

  if (newPassword.length < 6) {
    setAuthMessage('Mật khẩu mới cần tối thiểu 6 ký tự.', 'error');
    return;
  }

  users[userIndex].password = newPassword;
  users[userIndex].completed = uniqueNumbers([...(users[userIndex].completed || []), 4]);
  delete codes[email].reset;
  saveUsers();
  saveCodes();
  setAuthMessage('Đặt lại mật khẩu thành công. Hãy đăng nhập lại.', 'success');
  switchAuthTab('login');
}

function logout() {
  currentEmail = null;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  authOverlay.classList.remove('hidden');
  switchAuthTab('login');
  updateMiniProfile();
  showToast('Đã đăng xuất.');
}

function uniqueNumbers(values) {
  return [...new Set(values)].filter(Number.isFinite).sort((a, b) => a - b);
}

function renderApp() {
  const user = getCurrentUser();
  if (!user) {
    authOverlay.classList.remove('hidden');
    updateMiniProfile();
    return;
  }
  authOverlay.classList.add('hidden');
  applyUserSettings();
  updateMiniProfile();
  setActiveNav(activeView);
  renderFeatureCards();

  if (activeView === 'dashboard') { activeView = 'notes'; renderNotes(); }
  if (activeView === 'profile') renderProfile();
  if (activeView === 'password') renderPasswordChange();
  if (activeView === 'settings') renderSettings();
  if (activeView === 'notes') renderNotes();
}

function openView(view) {
  activeView = view;
  if (view === 'profile') markDone(5);
  renderApp();
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
}

function updateHeader(path, title) {
  breadcrumb.textContent = path;
  currentViewTitle.textContent = title;
}

function updateMiniProfile() {
  const user = getCurrentUser();
  if (!user) {
    miniName.textContent = 'Khách';
    miniStatus.textContent = 'Chưa đăng nhập';
    renderAvatar(miniAvatar, { name: 'NS', avatar: '' });
    doneCounter.textContent = '0/8';
    return;
  }

  miniName.textContent = user.name;
  miniStatus.textContent = user.active ? 'Đã kích hoạt' : 'Chưa kích hoạt';
  renderAvatar(miniAvatar, user);
  doneCounter.textContent = `${(user.completed || []).length}/8`;
}

function renderAvatar(target, user) {
  if (user.avatar) {
    target.innerHTML = `<img src="${user.avatar}" alt="Ảnh đại diện" />`;
  } else {
    target.textContent = getInitials(user.name || 'NS');
  }
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function renderFeatureCards() {
  renderSidePanel();
}

function getBaseUserNotes() {
  const user = getCurrentUser();
  if (!user) return [];

  return notes
    .filter(note => note.ownerEmail === user.email)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getUserLabels() {
  const labelSet = new Set();

  getBaseUserNotes().forEach(note => {
    (note.labels || []).forEach(label => {
      if (label) labelSet.add(label);
    });
  });

  return [...labelSet].sort((a, b) => a.localeCompare(b, 'vi'));
}

function renderSidePanel() {
  const baseNotes = getBaseUserNotes();
  const labels = getUserLabels();
  const currentUser = getCurrentUser();

  const globalNoteSearch = document.getElementById('globalNoteSearch');
  if (globalNoteSearch && globalNoteSearch.value !== noteKeyword) {
    globalNoteSearch.value = noteKeyword;
  }

  const totalEl = document.getElementById('sideTotalNotes');
  const pinnedEl = document.getElementById('sidePinnedNotes');
  const lockedEl = document.getElementById('sideLockedNotes');
  const sharedEl = document.getElementById('sideSharedNotes');
  const updatedText = document.getElementById('sideUpdatedText');
  const filterStatus = document.getElementById('sideFilterStatus');
  const recentCount = document.getElementById('sideRecentCount');

  if (totalEl) totalEl.textContent = baseNotes.length;
  if (pinnedEl) pinnedEl.textContent = baseNotes.filter(note => note.isPinned).length;
  if (lockedEl) lockedEl.textContent = baseNotes.filter(note => note.isLocked).length;
  if (sharedEl) sharedEl.textContent = baseNotes.filter(note => note.isShared).length;
  if (updatedText) updatedText.textContent = baseNotes[0] ? formatShortDate(baseNotes[0].updatedAt) : 'Chưa có dữ liệu';
  if (recentCount) recentCount.textContent = `${Math.min(baseNotes.length, 5)} note`;

  const filterLabelMap = {
    all: 'Tất cả',
    pinned: 'Đã ghim',
    locked: 'Có mật khẩu',
    shared: 'Được chia sẻ'
  };

  if (filterStatus) {
    filterStatus.textContent = selectedLabel ? `Nhãn: ${selectedLabel}` : (filterLabelMap[noteFilter] || 'Tất cả');
  }

  document.querySelectorAll('[data-note-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.noteFilter === noteFilter && !selectedLabel);
  });

  document.getElementById('sideGridBtn')?.classList.toggle('active', notesLayout === 'grid');
  document.getElementById('sideListBtn')?.classList.toggle('active', notesLayout === 'list');

  const labelsList = document.getElementById('sideLabelsList');
  if (labelsList) {
    labelsList.innerHTML = labels.length
      ? labels.map(label => `
          <button class="label-chip ${selectedLabel === label ? 'active' : ''}" data-label-name="${escapeHTML(label)}" type="button">
            <span>🏷️ ${escapeHTML(label)}</span>
            <small>${baseNotes.filter(note => (note.labels || []).includes(label)).length}</small>
          </button>
        `).join('')
      : '<span class="empty-mini-text">Chưa có nhãn. Mở một ghi chú rồi bấm “+ Thêm”.</span>';

    labelsList.querySelectorAll('[data-label-name]').forEach(button => {
      button.addEventListener('click', () => {
        selectedLabel = button.dataset.labelName;
        noteFilter = 'all';
        activeView = 'notes';
        renderApp();
      });
    });
  }

  const recentList = document.getElementById('sideRecentNotesList');
  if (recentList) {
    const recentNotes = baseNotes.slice(0, 5);

    recentList.innerHTML = recentNotes.length
      ? recentNotes.map(note => `
          <button class="recent-note ${note.id === activeNoteId ? 'active' : ''}" data-recent-note-id="${note.id}" type="button">
            <span>${note.isPinned ? '📌 ' : ''}${escapeHTML(note.title || 'Không có tiêu đề')}</span>
            <small>${formatShortDate(note.updatedAt)}</small>
          </button>
        `).join('')
      : '<span class="empty-mini-text">Chưa có ghi chú gần đây</span>';

    recentList.querySelectorAll('[data-recent-note-id]').forEach(button => {
      button.addEventListener('click', () => {
        activeNoteId = button.dataset.recentNoteId;
        activeView = 'notes';
        renderApp();
      });
    });
  }

  if (!currentUser) {
    document.getElementById('doneCounter') && (document.getElementById('doneCounter').textContent = '0/8');
  }
}

function addLabelToCurrentNote() {
  const user = getCurrentUser();

  if (!user) {
    showToast('Vui lòng đăng nhập trước.');
    return;
  }

  const baseNotes = getBaseUserNotes();

  if (!activeNoteId && baseNotes.length > 0) {
    activeNoteId = baseNotes[0].id;
  }

  if (!activeNoteId) {
    showToast('Hãy tạo hoặc chọn một ghi chú trước khi thêm nhãn.');
    activeView = 'notes';
    renderApp();
    return;
  }

  const labelName = prompt('Nhập tên nhãn mới cho ghi chú hiện tại:');

  if (!labelName || !labelName.trim()) return;

  const cleanLabel = labelName.trim();
  const index = notes.findIndex(note => note.id === activeNoteId && note.ownerEmail === user.email);

  if (index === -1) return;

  const currentLabels = new Set(notes[index].labels || []);
  currentLabels.add(cleanLabel);

  notes[index].labels = [...currentLabels];
  notes[index].updatedAt = new Date().toISOString();

  saveNotes();
  selectedLabel = cleanLabel;
  noteFilter = 'all';
  activeView = 'notes';
  renderApp();
  showToast(`Đã thêm nhãn “${cleanLabel}”.`);
}

function viewByFeature(id) {
  if ([5, 6].includes(id)) return 'profile';
  if (id === 7) return 'password';
  if (id === 8) return 'settings';
  return 'dashboard';
}

function renderDashboard() {
  const user = getCurrentUser();
  const completed = new Set(user.completed || []);
  updateHeader('Tài khoản người dùng > Tổng quan', 'Hoàn thiện yêu cầu 1 - 8');

  contentArea.innerHTML = `
    <div class="stats-grid">
      <div><small>Tiêu chí đã khớp</small><strong>${completed.size}/8</strong></div>
      <div><small>Trạng thái tài khoản</small><strong>${user.active ? 'Active' : 'Wait'}</strong></div>
      <div><small>Người dùng hiện tại</small><strong>${user.name.split(' ')[0]}</strong></div>
    </div>

    <section class="view-card">
      <h3>Nội dung đã chỉnh theo bảng kiểm tra</h3>
      <p>Khung giao diện cũ vẫn được giữ theo dạng sidebar, danh sách bên trái và vùng nội dung bên phải. Phần nội dung đã đổi sang module quản lý tài khoản để phù hợp 8 tiêu chí đầu trong bảng chấm điểm.</p>
      <div class="requirement-list">
        ${featureList.map(item => `
          <div class="requirement-row">
            <b>${item.id}</b>
            <p><strong>${item.title}</strong><br>${item.detail}</p>
            <span class="done-text">${completed.has(item.id) ? 'Đã có' : 'Chưa thao tác'}</span>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="view-card">
      <h3>Cách thầy kiểm tra nhanh</h3>
      <p>Vào tab Đăng ký để tạo tài khoản mới, lấy mã kích hoạt hiện trên màn hình, kích hoạt tài khoản, đăng nhập, thử quên mật khẩu, sau đó mở Hồ sơ, Đổi mật khẩu và Tùy chọn để kiểm tra các phần còn lại.</p>
    </section>
  `;
}

function renderProfile() {
  const user = getCurrentUser();
  updateHeader('Tài khoản người dùng > Hồ sơ', 'Xem và chỉnh sửa hồ sơ');
  markDone(5);

  contentArea.innerHTML = `
    <section class="form-card">
      <div class="profile-head">
        <div class="avatar" id="profileAvatar"></div>
        <div>
          <h3>${user.name}</h3>
          <p>${user.email}</p>
          <p>Ngày tạo: ${user.createdAt} · Trạng thái: ${user.active ? 'Đã kích hoạt' : 'Chưa kích hoạt'}</p>
        </div>
      </div>

      <form id="profileForm" class="form-grid">
        <div>
          <label>Họ tên</label>
          <input type="text" id="profileName" value="${escapeHTML(user.name)}" required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value="${escapeHTML(user.email)}" disabled />
        </div>
        <div>
          <label>Số điện thoại</label>
          <input type="text" id="profilePhone" value="${escapeHTML(user.phone || '')}" placeholder="Nhập số điện thoại" />
        </div>
        <div>
          <label>Ảnh đại diện</label>
          <input type="file" id="profileAvatarInput" accept="image/*" />
        </div>
        <div class="full">
          <label>Giới thiệu ngắn</label>
          <textarea id="profileBio" rows="4" placeholder="Viết một chút về bạn...">${escapeHTML(user.bio || '')}</textarea>
        </div>
      </form>
      <div class="form-actions">
        <button class="primary-btn" id="saveProfileBtn">Lưu hồ sơ</button>
        <button class="secondary-btn" id="removeAvatarBtn">Xóa ảnh đại diện</button>
      </div>
    </section>
  `;

  renderAvatar(document.getElementById('profileAvatar'), user);
  document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
  document.getElementById('removeAvatarBtn').addEventListener('click', removeAvatar);
  document.getElementById('profileAvatarInput').addEventListener('change', previewAvatarBeforeSave);
}

function previewAvatarBeforeSave(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('profileAvatar').innerHTML = `<img src="${reader.result}" alt="Ảnh đại diện mới" />`;
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  const user = getCurrentUser();
  const file = document.getElementById('profileAvatarInput').files[0];
  const patch = {
    name: document.getElementById('profileName').value.trim(),
    phone: document.getElementById('profilePhone').value.trim(),
    bio: document.getElementById('profileBio').value.trim(),
    completed: uniqueNumbers([...(user.completed || []), 5, 6])
  };

  if (!patch.name) {
    showToast('Họ tên không được để trống.');
    return;
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      updateCurrentUser({ ...patch, avatar: reader.result });
      renderApp();
      showToast('Đã lưu hồ sơ và ảnh đại diện.');
    };
    reader.readAsDataURL(file);
  } else {
    updateCurrentUser(patch);
    renderApp();
    showToast('Đã lưu hồ sơ.');
  }
}

function removeAvatar() {
  const user = getCurrentUser();
  updateCurrentUser({ avatar: '', completed: uniqueNumbers([...(user.completed || []), 6]) });
  renderApp();
  showToast('Đã xóa ảnh đại diện.');
}

function renderPasswordChange() {
  updateHeader('Tài khoản người dùng > Bảo mật', 'Thay đổi mật khẩu');
  contentArea.innerHTML = `
    <section class="form-card">
      <h3>Đổi mật khẩu tài khoản</h3>
      <p style="margin-bottom:18px;color:var(--text-muted);line-height:1.6">Chức năng này yêu cầu người dùng đã đăng nhập, nhập đúng mật khẩu cũ, sau đó xác nhận mật khẩu mới.</p>
      <form id="changePasswordForm" class="form-grid">
        <div class="full">
          <label>Mật khẩu hiện tại</label>
          <input type="password" id="oldPassword" required />
        </div>
        <div>
          <label>Mật khẩu mới</label>
          <input type="password" id="newPassword" minlength="6" required />
        </div>
        <div>
          <label>Nhập lại mật khẩu mới</label>
          <input type="password" id="confirmNewPassword" minlength="6" required />
        </div>
      </form>
      <div class="form-actions">
        <button class="primary-btn" id="savePasswordBtn">Cập nhật mật khẩu</button>
      </div>
    </section>
  `;
  document.getElementById('savePasswordBtn').addEventListener('click', saveNewPassword);
}

function saveNewPassword() {
  const user = getCurrentUser();
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  if (oldPassword !== user.password) {
    showToast('Mật khẩu hiện tại không đúng.');
    return;
  }

  if (newPassword.length < 6) {
    showToast('Mật khẩu mới cần tối thiểu 6 ký tự.');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showToast('Mật khẩu mới nhập lại không khớp.');
    return;
  }

  updateCurrentUser({ password: newPassword, completed: uniqueNumbers([...(user.completed || []), 7]) });
  renderApp();
  showToast('Đã thay đổi mật khẩu.');
}

function renderSettings() {
  const user = getCurrentUser();
  const settings = user.settings || {};
  updateHeader('Tài khoản người dùng > Tùy chọn', 'Tùy chọn của người dùng');

  contentArea.innerHTML = `
    <section class="form-card">
      <h3>Tùy chỉnh trải nghiệm cá nhân</h3>
      <p style="margin-bottom:18px;color:var(--text-muted);line-height:1.6">Các lựa chọn này được lưu theo từng tài khoản bằng localStorage để khi đăng nhập lại vẫn giữ nguyên.</p>
      <div class="options-grid">
        <div class="option-tile">
          <h4>Giao diện</h4>
          <p>Chọn nền sáng hoặc tối cho ứng dụng.</p>
          <select id="themeSetting">
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Sáng</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Tối</option>
          </select>
        </div>
        <div class="option-tile">
          <h4>Màu nhấn</h4>
          <p>Đổi màu header, nút chính và điểm nhấn.</p>
          <select id="accentSetting">
            <option value="#e74c99" ${settings.accent === '#e74c99' ? 'selected' : ''}>Hồng NoteStudio</option>
            <option value="#2563eb" ${settings.accent === '#2563eb' ? 'selected' : ''}>Xanh dương</option>
            <option value="#16a34a" ${settings.accent === '#16a34a' ? 'selected' : ''}>Xanh lá</option>
            <option value="#f97316" ${settings.accent === '#f97316' ? 'selected' : ''}>Cam</option>
          </select>
        </div>
        <div class="option-tile">
          <h4>Tự động lưu</h4>
          <p>Mô phỏng việc lưu nội dung ghi chú trong lúc nhập.</p>
          <label class="switch-row"><input type="checkbox" id="autosaveSetting" ${settings.autosave ? 'checked' : ''}> Bật tự động lưu</label>
        </div>
        <div class="option-tile">
          <h4>Thông báo email</h4>
          <p>Cho phép nhận thông báo khi có chia sẻ ghi chú.</p>
          <label class="switch-row"><input type="checkbox" id="emailNotifySetting" ${settings.emailNotify ? 'checked' : ''}> Nhận thông báo</label>
        </div>
        <div class="option-tile">
          <h4>Chế độ gọn</h4>
          <p>Thu gọn khoảng cách để xem được nhiều nội dung hơn.</p>
          <label class="switch-row"><input type="checkbox" id="compactSetting" ${settings.compact ? 'checked' : ''}> Bật chế độ gọn</label>
        </div>
      </div>
      <div class="form-actions">
        <button class="primary-btn" id="saveSettingsBtn">Lưu tùy chọn</button>
      </div>
    </section>
  `;
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

function saveSettings() {
  const user = getCurrentUser();
  const nextSettings = {
    theme: document.getElementById('themeSetting').value,
    accent: document.getElementById('accentSetting').value,
    autosave: document.getElementById('autosaveSetting').checked,
    emailNotify: document.getElementById('emailNotifySetting').checked,
    compact: document.getElementById('compactSetting').checked
  };

  updateCurrentUser({
    settings: nextSettings,
    completed: uniqueNumbers([...(user.completed || []), 8])
  });
  applyUserSettings();
  renderApp();
  showToast('Đã lưu tùy chọn người dùng.');
}

function applyUserSettings() {
  const user = getCurrentUser();
  const settings = user?.settings || {};
  const accent = settings.accent || '#e74c99';
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-2', lightenColor(accent, 16));
  document.body.classList.toggle('dark-mode', settings.theme === 'dark');
  document.body.classList.toggle('compact-mode', Boolean(settings.compact));
}

function renderNotes() {
  updateHeader('Ghi chú > Ghi chú của tôi', 'Quản lý ghi chú');

  const userNotes = getUserNotes();

  if (!activeNoteId && userNotes.length > 0) {
    activeNoteId = userNotes[0].id;
  }

  contentArea.innerHTML = `
    <section class="notes-page">
      <div class="notes-toolbar">
        <div>
          <h3>Ghi chú của tôi</h3>
          <p>Tạo, chỉnh sửa, tìm kiếm, ghim, lọc nhãn và tự động lưu ghi chú.</p>
        </div>

        <div class="notes-actions">
          <button class="primary-btn" id="createNoteBtn">+ Ghi chú mới</button>
        </div>
      </div>

      <div class="notes-active-filter">
        <span>${noteKeyword ? `Từ khóa: “${escapeHTML(noteKeyword)}”` : 'Tất cả ghi chú'}</span>
        <span>${selectedLabel ? `Nhãn: ${escapeHTML(selectedLabel)}` : getFilterText()}</span>
        ${(noteKeyword || selectedLabel || noteFilter !== 'all') ? '<button class="mini-clear-btn" id="clearNoteFilterBtn" type="button">Xóa lọc</button>' : ''}
      </div>

      <div class="notes-workspace layout-${notesLayout}">
        <aside class="notes-browser">
          <div id="noteCardsContainer" class="note-cards-container ${notesLayout}"></div>
        </aside>

        <section class="note-editor-area" id="noteEditorArea"></section>
      </div>
    </section>
  `;

  document.getElementById('createNoteBtn').addEventListener('click', createNewNote);

  document.getElementById('clearNoteFilterBtn')?.addEventListener('click', () => {
    noteKeyword = '';
    noteFilter = 'all';
    selectedLabel = '';
    renderApp();
  });

  renderNoteCards();
  renderNoteEditor();
  renderSidePanel();
}

function getFilterText() {
  if (noteFilter === 'pinned') return 'Bộ lọc: Đã ghim';
  if (noteFilter === 'locked') return 'Bộ lọc: Có mật khẩu';
  if (noteFilter === 'shared') return 'Bộ lọc: Được chia sẻ';
  return 'Bộ lọc: Tất cả';
}

function escapeHTML(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function lightenColor(hex, percent) {
  const raw = hex.replace('#', '');
  const num = parseInt(raw, 16);
  const amount = Math.round(2.55 * percent);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function saveNotes() {
  saveJSON(NOTES_KEY, notes);
}

function makeId() {
  return `note-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function getUserNotes() {
  return getBaseUserNotes()
    .filter(note => {
      const keyword = noteKeyword.trim().toLowerCase();
      if (!keyword) return true;

      return (
        (note.title || '').toLowerCase().includes(keyword) ||
        (note.content || '').toLowerCase().includes(keyword)
      );
    })
    .filter(note => {
      if (noteFilter === 'pinned') return Boolean(note.isPinned);
      if (noteFilter === 'locked') return Boolean(note.isLocked);
      if (noteFilter === 'shared') return Boolean(note.isShared);
      return true;
    })
    .filter(note => {
      if (!selectedLabel) return true;
      return (note.labels || []).includes(selectedLabel);
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (a.isPinned && b.isPinned) {
        return new Date(b.pinnedAt || 0) - new Date(a.pinnedAt || 0);
      }

      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function createNewNote() {
  const user = getCurrentUser();

  if (!user) {
    authOverlay.classList.remove('hidden');
    showToast('Vui lòng đăng nhập trước khi tạo ghi chú.');
    return;
  }

  const now = new Date().toISOString();

  const newNote = {
    id: makeId(),
    ownerEmail: user.email,
    title: 'Ghi chú mới',
    content: '',
    isPinned: false,
    pinnedAt: null,
    labels: selectedLabel ? [selectedLabel] : [],
    color: '#ffffff',
    isLocked: false,
    isShared: false,
    createdAt: now,
    updatedAt: now
  };

  notes.unshift(newNote);
  activeNoteId = newNote.id;
  saveNotes();

  activeView = 'notes';
  renderApp();

  showToast('Đã tạo ghi chú mới.');
}

function renderNoteCards() {
  const container = document.getElementById('noteCardsContainer');
  if (!container) return;

  const userNotes = getUserNotes();

  if (userNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h4>Chưa có ghi chú</h4>
        <p>Bấm "+ Ghi chú mới" để tạo ghi chú đầu tiên.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = userNotes.map(note => `
    <article class="real-note-card ${note.id === activeNoteId ? 'active' : ''}" data-note-id="${note.id}">
      <div class="note-card-top">
        <div class="note-badges">
          ${note.isPinned ? '<span title="Đã ghim">📌</span>' : ''}
          ${note.isLocked ? '<span title="Có mật khẩu">🔒</span>' : ''}
          ${note.isShared ? '<span title="Đã chia sẻ">👥</span>' : ''}
        </div>
        <small>${formatDate(note.updatedAt)}</small>
      </div>

      <h4>${escapeHTML(note.title || 'Không có tiêu đề')}</h4>
      <p>${escapeHTML(note.content || 'Chưa có nội dung')}</p>
      <div class="note-label-row">
        ${(note.labels || []).slice(0, 3).map(label => `<span>${escapeHTML(label)}</span>`).join('')}
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.real-note-card').forEach(card => {
    card.addEventListener('click', () => {
      activeNoteId = card.dataset.noteId;
      renderNoteCards();
      renderNoteEditor();
    });
  });
}

function renderNoteEditor() {
  const editor = document.getElementById('noteEditorArea');
  if (!editor) return;

  const user = getCurrentUser();
  const note = notes.find(item => item.id === activeNoteId && item.ownerEmail === user?.email);

  if (!note) {
    editor.innerHTML = `
      <div class="empty-editor">
        <h3>Chọn hoặc tạo một ghi chú</h3>
        <p>Ghi chú được chọn sẽ hiển thị tại đây.</p>
      </div>
    `;
    return;
  }

  editor.innerHTML = `
    <div class="note-editor-card">
      <div class="editor-top-row">
        <div>
          <span class="editor-breadcrumb">Ghi chú cá nhân</span>
          <input type="text" id="noteTitleInput" class="note-title-input" value="${escapeHTML(note.title)}" placeholder="Tiêu đề ghi chú" />
        </div>

        <div class="editor-buttons">
          <button class="secondary-btn" id="pinNoteBtn">${note.isPinned ? 'Bỏ ghim' : 'Ghim'}</button>
          <button class="danger-btn" id="deleteNoteBtn">Xóa</button>
        </div>
      </div>

      <textarea id="noteContentInput" class="note-content-input" placeholder="Viết nội dung ghi chú...">${escapeHTML(note.content)}</textarea>

      <div class="editor-footer">
        <span id="saveStatus">Đã lưu</span>
        <span>Cập nhật: ${formatDate(note.updatedAt)}</span>
      </div>
    </div>
  `;

  document.getElementById('noteTitleInput').addEventListener('input', scheduleAutoSave);
  document.getElementById('noteContentInput').addEventListener('input', scheduleAutoSave);
  document.getElementById('deleteNoteBtn').addEventListener('click', deleteCurrentNote);
  document.getElementById('pinNoteBtn').addEventListener('click', togglePinCurrentNote);
}

function scheduleAutoSave() {
  const status = document.getElementById('saveStatus');

  if (status) {
    status.textContent = 'Đang lưu...';
  }

  clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(() => {
    saveCurrentNote();
  }, 600);
}

function saveCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;

  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');

  if (!titleInput || !contentInput) return;

  const index = notes.findIndex(note => note.id === activeNoteId && note.ownerEmail === user.email);

  if (index === -1) return;

  notes[index].title = titleInput.value.trim() || 'Không có tiêu đề';
  notes[index].content = contentInput.value;
  notes[index].updatedAt = new Date().toISOString();

  saveNotes();
  renderNoteCards();
  renderSidePanel();

  const status = document.getElementById('saveStatus');

  if (status) {
    status.textContent = 'Đã tự động lưu';
  }
}

function deleteCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;

  const confirmed = confirm('Bạn có chắc chắn muốn xóa ghi chú này không?');

  if (!confirmed) return;

  notes = notes.filter(note => !(note.id === activeNoteId && note.ownerEmail === user.email));
  activeNoteId = null;

  saveNotes();
  renderNotes();

  showToast('Đã xóa ghi chú.');
}

function togglePinCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;

  const index = notes.findIndex(note => note.id === activeNoteId && note.ownerEmail === user.email);

  if (index === -1) return;

  notes[index].isPinned = !notes[index].isPinned;
  notes[index].pinnedAt = notes[index].isPinned ? new Date().toISOString() : null;
  notes[index].updatedAt = new Date().toISOString();

  saveNotes();
  renderNotes();

  showToast(notes[index].isPinned ? 'Đã ghim ghi chú.' : 'Đã bỏ ghim ghi chú.');
}

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatShortDate(value) {
  if (!value) return '';

  const date = new Date(value);

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  });
}

/* ===== UI redesign override: dashboard + rich note editor ===== */
const DASHBOARD_CATEGORY_PRESETS = [
  { name: 'Công việc', icon: '💼', bg: '#ff6aa9', border: '#f74493' },
  { name: 'Cá nhân', icon: '👤', bg: '#ffd93d', border: '#f4c817' },
  { name: 'Học tập', icon: '🎓', bg: '#9fead0', border: '#66d6b2' },
  { name: 'Ý tưởng', icon: '💡', bg: '#ffb2a8', border: '#ff8c81' },
  { name: 'Du lịch', icon: '🧳', bg: '#85c7ff', border: '#58acef' }
];

function setMainHeaderVisible(show) {
  const header = document.getElementById('dynamic-header');
  if (!header) return;
  header.style.display = show ? 'flex' : 'none';
}

function stripHTMLContent(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlainPreview(value, limit = 88) {
  const text = stripHTMLContent(value);
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text || 'Chưa có nội dung';
}

function getUserNotes() {
  return getBaseUserNotes()
    .filter(note => {
      const keyword = noteKeyword.trim().toLowerCase();
      if (!keyword) return true;

      return (
        (note.title || '').toLowerCase().includes(keyword) ||
        stripHTMLContent(note.content || '').toLowerCase().includes(keyword)
      );
    })
    .filter(note => {
      if (noteFilter === 'pinned') return Boolean(note.isPinned);
      if (noteFilter === 'locked') return Boolean(note.isLocked);
      if (noteFilter === 'shared') return Boolean(note.isShared);
      return true;
    })
    .filter(note => {
      if (!selectedLabel) return true;
      return (note.labels || []).includes(selectedLabel);
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (a.isPinned && b.isPinned) {
        return new Date(b.pinnedAt || 0) - new Date(a.pinnedAt || 0);
      }

      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function createNewNote() {
  const user = getCurrentUser();

  if (!user) {
    authOverlay.classList.remove('hidden');
    showToast('Vui lòng đăng nhập trước khi tạo ghi chú.');
    return;
  }

  const now = new Date().toISOString();

  const newNote = {
    id: makeId(),
    ownerEmail: user.email,
    title: 'Ghi chú mới',
    content: '',
    isPinned: false,
    pinnedAt: null,
    labels: selectedLabel ? [selectedLabel] : ['Cá nhân'],
    color: '#ffffff',
    isLocked: false,
    isShared: false,
    createdAt: now,
    updatedAt: now
  };

  notes.unshift(newNote);
  activeNoteId = newNote.id;
  saveNotes();

  activeView = 'notes';
  renderApp();
  showToast('Đã tạo ghi chú mới.');
}

function openDashboardNote(noteId) {
  activeNoteId = noteId;
  activeView = 'notes';
  renderApp();
}

function getDashboardCategoryCount(baseNotes, categoryName) {
  return baseNotes.filter(note => {
    const labels = note.labels || [];
    const title = (note.title || '').toLowerCase();
    const category = categoryName.toLowerCase();
    return labels.includes(categoryName) || title.includes(category);
  }).length;
}

function renderDashboard() {
  setMainHeaderVisible(false);
  const user = getCurrentUser();
  const baseNotes = getBaseUserNotes();
  const keyword = noteKeyword.trim().toLowerCase();
  const filteredNotes = baseNotes.filter(note => {
    if (!keyword) return true;
    return (note.title || '').toLowerCase().includes(keyword) || stripHTMLContent(note.content || '').toLowerCase().includes(keyword);
  });

  const recentNotes = filteredNotes.slice(0, 4);
  const sharedNotes = filteredNotes.filter(note => note.isShared).slice(0, 4);

  contentArea.innerHTML = `
    <section class="dashboard-shell">
      <div class="dashboard-search-row">
        <div class="dashboard-search-box">
          <span>🔎</span>
          <input id="dashboardSearchInput" type="text" placeholder="Tìm ghi chú..." value="${escapeHTML(noteKeyword)}" />
        </div>
      </div>

      <h1 class="dashboard-heading">Trung tâm ghi chú</h1>

      <section class="dashboard-section">
        <h2 class="section-title">Gần đây</h2>
        <div class="dashboard-scroll-row ${notesLayout === 'list' ? 'list-mode' : ''}">
          ${recentNotes.length ? recentNotes.map((note, index) => {
            const tones = [
              { bg: '#ffe0ef', border: '#f26fa8', icon: '💻' },
              { bg: '#fff1a8', border: '#efcf40', icon: '🍽️' },
              { bg: '#d6fff1', border: '#73d6b0', icon: '💻' },
              { bg: '#ffe8df', border: '#f3a491', icon: '📝' }
            ];
            const tone = tones[index % tones.length];
            return `
              <article class="recent-note-card" data-open-note="${note.id}" style="--card-bg:${tone.bg};--card-border:${tone.border};">
                <div class="recent-note-icon">${tone.icon}</div>
                <h3>${escapeHTML(note.title || 'Không có tiêu đề')}</h3>
                <p>${escapeHTML(getPlainPreview(note.content, 62))}</p>
              </article>
            `;
          }).join('') : '<div class="empty-dashboard-block">Chưa có ghi chú gần đây. Hãy tạo ghi chú đầu tiên.</div>'}
        </div>
      </section>

      <section class="dashboard-section">
        <h2 class="section-title">Categories</h2>
        <div class="category-grid-modern">
          ${DASHBOARD_CATEGORY_PRESETS.map(item => `
            <button class="category-card-modern" data-open-category="${item.name}" type="button" style="--card-bg:${item.bg};--card-border:${item.border};">
              <span class="category-count-pill">${getDashboardCategoryCount(baseNotes, item.name)}</span>
              <div>
                <h3>${escapeHTML(item.name)}</h3>
              </div>
              <span class="category-icon">${item.icon}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="dashboard-section">
        <h2 class="section-title">Bộ lọc nhanh</h2>
        <div class="quick-filter-grid-modern">
          <button class="quick-tile-modern all" data-open-filter="all" type="button">Tất cả ghi chú</button>
          <button class="quick-tile-modern pinned" data-open-filter="pinned" type="button">Đã ghim</button>
          <button class="quick-tile-modern locked" data-open-filter="locked" type="button">Có mật khẩu</button>
          <button class="quick-tile-modern shared" data-open-filter="shared" type="button">Được chia sẻ</button>
        </div>
      </section>

      <section class="dashboard-section">
        <h2 class="section-title">Được chia sẻ với tôi</h2>
        <div class="shared-grid-modern">
          ${sharedNotes.length ? sharedNotes.map((note, index) => {
            const tones = ['#ffe7f2', '#fff8d6', '#e4fff4', '#ffefe8'];
            return `
              <article class="shared-note-card" data-open-note="${note.id}" style="--card-bg:${tones[index % tones.length]};">
                <div class="shared-note-avatar">${getInitials(user.name || 'NS')}</div>
                <h3>${escapeHTML(note.title || 'Không có tiêu đề')}</h3>
                <p>${escapeHTML(getPlainPreview(note.content, 56))}</p>
              </article>
            `;
          }).join('') : '<div class="empty-dashboard-block">Chưa có ghi chú nào được đánh dấu chia sẻ.</div>'}
        </div>
      </section>
    </section>
  `;

  document.getElementById('dashboardSearchInput')?.addEventListener('input', event => {
    noteKeyword = event.target.value;
    renderDashboard();
  });

  contentArea.querySelectorAll('[data-open-note]').forEach(card => {
    card.addEventListener('click', () => openDashboardNote(card.dataset.openNote));
  });

  contentArea.querySelectorAll('[data-open-category]').forEach(button => {
    button.addEventListener('click', () => {
      selectedLabel = button.dataset.openCategory;
      noteFilter = 'all';
      activeView = 'notes';
      renderApp();
    });
  });

  contentArea.querySelectorAll('[data-open-filter]').forEach(button => {
    button.addEventListener('click', () => {
      noteFilter = button.dataset.openFilter;
      selectedLabel = '';
      activeView = 'notes';
      renderApp();
    });
  });
}

function renderNotes() {
  setMainHeaderVisible(false);
  const userNotes = getUserNotes();

  if (!activeNoteId && userNotes.length > 0) {
    activeNoteId = userNotes[0].id;
  }

  contentArea.innerHTML = `
    <section class="notes-screen-modern">
      <div class="notes-topbar-modern">
        <div class="dashboard-search-box compact-search-box">
          <span>🔎</span>
          <input id="noteSearchInline" type="text" placeholder="Tìm ghi chú..." value="${escapeHTML(noteKeyword)}" />
        </div>
        <div class="notes-topbar-actions">
          <button class="view-chip ${notesLayout === 'grid' ? 'active' : ''}" id="notesGridModeBtn" type="button">▦ Lưới</button>
          <button class="view-chip ${notesLayout === 'list' ? 'active' : ''}" id="notesListModeBtn" type="button">☷ Danh sách</button>
          <button class="primary-btn" id="createNoteBtn">+ Ghi chú mới</button>
        </div>
      </div>

      <div class="note-strip-modern ${notesLayout === 'list' ? 'list-mode' : ''}" id="modernNoteStrip">
        ${userNotes.length ? userNotes.map((note, index) => {
          const tones = ['#ffe3ef', '#fff1ae', '#d9fff1', '#ffe8df', '#d9eefe'];
          return `
            <button class="note-strip-card ${note.id === activeNoteId ? 'active' : ''}" data-switch-note="${note.id}" type="button" style="--card-bg:${tones[index % tones.length]};">
              <strong>${escapeHTML(note.title || 'Không có tiêu đề')}</strong>
              <span>${escapeHTML(getPlainPreview(note.content, 42))}</span>
            </button>
          `;
        }).join('') : '<div class="empty-dashboard-block">Chưa có ghi chú. Hãy tạo ghi chú đầu tiên.</div>'}
      </div>

      <div class="note-filter-summary">
        <span>${selectedLabel ? `Nhãn: ${escapeHTML(selectedLabel)}` : getFilterText()}</span>
        ${(noteKeyword || selectedLabel || noteFilter !== 'all') ? '<button class="mini-clear-btn" id="clearNoteFilterBtn" type="button">Xóa lọc</button>' : ''}
      </div>

      <div id="noteModernEditorArea"></div>
    </section>
  `;

  document.getElementById('noteSearchInline')?.addEventListener('input', event => {
    noteKeyword = event.target.value;
    renderNotes();
  });

  document.getElementById('notesGridModeBtn')?.addEventListener('click', () => {
    notesLayout = 'grid';
    renderNotes();
  });

  document.getElementById('notesListModeBtn')?.addEventListener('click', () => {
    notesLayout = 'list';
    renderNotes();
  });

  document.getElementById('createNoteBtn')?.addEventListener('click', createNewNote);
  document.getElementById('clearNoteFilterBtn')?.addEventListener('click', () => {
    noteKeyword = '';
    noteFilter = 'all';
    selectedLabel = '';
    renderApp();
  });

  contentArea.querySelectorAll('[data-switch-note]').forEach(button => {
    button.addEventListener('click', () => {
      activeNoteId = button.dataset.switchNote;
      renderNotes();
    });
  });

  renderNoteEditor();
}

function renderNoteEditor() {
  const mount = document.getElementById('noteModernEditorArea');
  if (!mount) return;

  const user = getCurrentUser();
  const note = notes.find(item => item.id === activeNoteId && item.ownerEmail === user?.email);

  if (!note) {
    mount.innerHTML = `
      <div class="empty-editor modern-empty-editor">
        <h3>Chọn hoặc tạo một ghi chú</h3>
        <p>Ghi chú được chọn sẽ hiển thị tại đây để chỉnh sửa.</p>
      </div>
    `;
    return;
  }

  mount.innerHTML = `
    <div class="editor-layout-modern">
      <section class="writing-panel-modern">
        <div class="editor-toolbar-modern">
          <button class="tool-btn mint" data-command="bold" type="button"><strong>B</strong></button>
          <button class="tool-btn mint" data-command="italic" type="button"><em>I</em></button>
          <button class="tool-btn mint" data-command="insertUnorderedList" type="button">•≣</button>
          <button class="tool-btn yellow" data-command="insertOrderedList" type="button">1≣</button>
          <button class="tool-btn yellow" data-command="removeFormat" type="button">⌫</button>
          <button class="tool-btn yellow right-tool" id="pinNoteBtn" type="button">${note.isPinned ? '📌' : '⋯'}</button>
        </div>

        <input type="text" id="noteTitleInput" class="note-title-input modern-title" value="${escapeHTML(note.title)}" placeholder="Tiêu đề ghi chú" />

        <div
          id="noteContentInput"
          class="note-content-editable"
          contenteditable="true"
          data-placeholder="Viết nội dung ghi chú..."
        >${note.content || ''}</div>

        <div class="editor-bottom-bar">
          <span id="saveStatus">Đã lưu</span>
          <div class="editor-main-actions">
            <button class="secondary-btn" id="shareNoteBtn" type="button">${note.isShared ? 'Bỏ chia sẻ' : 'Chia sẻ'}</button>
            <button class="secondary-btn" id="lockNoteBtn" type="button">${note.isLocked ? 'Bỏ khóa' : 'Khóa'}</button>
            <button class="danger-btn" id="deleteNoteBtn" type="button">Xóa</button>
            <button class="primary-btn save-btn-modern" id="manualSaveBtn" type="button">✓ Lưu</button>
          </div>
        </div>
      </section>

      <aside class="note-info-panel-modern">
        <h3>Note Info</h3>

        <div class="info-block-modern">
          <h4>Tag</h4>
          <div class="tag-wrap-modern">
            ${(note.labels || []).length
              ? note.labels.map((label, index) => {
                  const tones = ['pink', 'green', 'mint', 'peach', 'blue'];
                  return `<span class="tag-pill-modern ${tones[index % tones.length]}">${escapeHTML(label)}</span>`;
                }).join('')
              : '<span class="info-muted">Chưa có nhãn</span>'}
          </div>
          <button class="mini-add-btn wide-btn" id="addLabelBtnInInfo" type="button">+ Thêm tag</button>
        </div>

        <div class="info-block-modern">
          <h4>Ngày tạo</h4>
          <p>${formatDate(note.createdAt)}</p>
        </div>

        <div class="info-block-modern">
          <h4>Cập nhật gần nhất</h4>
          <p>${formatDate(note.updatedAt)}</p>
        </div>

        <div class="info-block-modern">
          <h4>Trạng thái</h4>
          <div class="status-chip-wrap">
            <span class="status-chip ${note.isPinned ? 'active' : ''}">${note.isPinned ? 'Đã ghim' : 'Chưa ghim'}</span>
            <span class="status-chip ${note.isLocked ? 'active' : ''}">${note.isLocked ? 'Có khóa' : 'Mở'}</span>
            <span class="status-chip ${note.isShared ? 'active' : ''}">${note.isShared ? 'Đã chia sẻ' : 'Riêng tư'}</span>
          </div>
        </div>
      </aside>
    </div>
  `;

  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');

  titleInput?.addEventListener('input', scheduleAutoSave);
  contentInput?.addEventListener('input', scheduleAutoSave);
  document.getElementById('manualSaveBtn')?.addEventListener('click', saveCurrentNote);
  document.getElementById('deleteNoteBtn')?.addEventListener('click', deleteCurrentNote);
  document.getElementById('pinNoteBtn')?.addEventListener('click', togglePinCurrentNote);
  document.getElementById('shareNoteBtn')?.addEventListener('click', toggleShareCurrentNote);
  document.getElementById('lockNoteBtn')?.addEventListener('click', toggleLockCurrentNote);
  document.getElementById('addLabelBtnInInfo')?.addEventListener('click', addLabelToCurrentNote);

  mount.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => applyEditorCommand(button.dataset.command));
  });
}

function applyEditorCommand(command) {
  const editor = document.getElementById('noteContentInput');
  if (!editor) return;

  editor.focus();

  if (command === 'removeFormat') {
    document.execCommand('removeFormat');
    document.execCommand('unlink');
  } else {
    document.execCommand(command, false, null);
  }

  scheduleAutoSave();
}

function scheduleAutoSave() {
  const status = document.getElementById('saveStatus');
  if (status) status.textContent = 'Đang lưu...';

  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveCurrentNote();
  }, 500);
}

function saveCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;

  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');
  if (!titleInput || !contentInput) return;

  const index = notes.findIndex(note => note.id === activeNoteId && note.ownerEmail === user.email);
  if (index === -1) return;

  notes[index].title = titleInput.value.trim() || 'Không có tiêu đề';
  notes[index].content = contentInput.innerHTML.trim();
  notes[index].updatedAt = new Date().toISOString();

  saveNotes();
  renderSidePanel();

  const status = document.getElementById('saveStatus');
  if (status) status.textContent = 'Đã lưu';

  const strip = document.getElementById('modernNoteStrip');
  if (strip) {
    renderNotes();
  }
}

function deleteCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;
  const confirmed = confirm('Bạn có chắc chắn muốn xóa ghi chú này không?');
  if (!confirmed) return;

  notes = notes.filter(note => !(note.id === activeNoteId && note.ownerEmail === user.email));
  activeNoteId = null;
  saveNotes();
  renderNotes();
  showToast('Đã xóa ghi chú.');
}

function togglePinCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;
  const index = notes.findIndex(note => note.id === activeNoteId && note.ownerEmail === user.email);
  if (index === -1) return;

  notes[index].isPinned = !notes[index].isPinned;
  notes[index].pinnedAt = notes[index].isPinned ? new Date().toISOString() : null;
  notes[index].updatedAt = new Date().toISOString();
  saveNotes();
  renderNotes();
  showToast(notes[index].isPinned ? 'Đã ghim ghi chú.' : 'Đã bỏ ghim ghi chú.');
}

function toggleShareCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;
  const index = notes.findIndex(note => note.id === activeNoteId && note.ownerEmail === user.email);
  if (index === -1) return;

  notes[index].isShared = !notes[index].isShared;
  notes[index].updatedAt = new Date().toISOString();
  saveNotes();
  renderNotes();
  showToast(notes[index].isShared ? 'Đã bật chia sẻ ghi chú.' : 'Đã tắt chia sẻ ghi chú.');
}

function toggleLockCurrentNote() {
  const user = getCurrentUser();
  if (!user || !activeNoteId) return;
  const index = notes.findIndex(note => note.id === activeNoteId && note.ownerEmail === user.email);
  if (index === -1) return;

  notes[index].isLocked = !notes[index].isLocked;
  notes[index].updatedAt = new Date().toISOString();
  saveNotes();
  renderNotes();
  showToast(notes[index].isLocked ? 'Đã bật khóa ghi chú.' : 'Đã bỏ khóa ghi chú.');
}

/* ===== UI redesign override v2: closer to mockup, underline + image + overflow scroll ===== */
function renderNotes() {
  setMainHeaderVisible(false);
  const userNotes = getUserNotes();

  if (!activeNoteId && userNotes.length > 0) {
    activeNoteId = userNotes[0].id;
  }

  contentArea.innerHTML = `
    <section class="notes-screen-modern notes-screen-v2">
      <div class="notes-topbar-modern">
        <div class="dashboard-search-box compact-search-box">
          <span>🔎</span>
          <input id="noteSearchInline" type="text" placeholder="Tìm ghi chú..." value="${escapeHTML(noteKeyword)}" />
        </div>
        <div class="notes-topbar-actions">
          <button class="view-chip ${notesLayout === 'grid' ? 'active' : ''}" id="notesGridModeBtn" type="button">▦ Lưới</button>
          <button class="view-chip ${notesLayout === 'list' ? 'active' : ''}" id="notesListModeBtn" type="button">☷ Danh sách</button>
          <button class="primary-btn create-note-btn-v2" id="createNoteBtn">+ Ghi chú mới</button>
        </div>
      </div>

      <div class="note-strip-scroll">
        <div class="note-strip-modern ${notesLayout === 'list' ? 'list-mode' : ''}" id="modernNoteStrip">
          ${userNotes.length ? userNotes.map((note, index) => {
            const tones = ['#f8dce9', '#f7ebaa', '#d8f1e9', '#f5dfd5', '#d8e6f4'];
            return `
              <button class="note-strip-card ${note.id === activeNoteId ? 'active' : ''}" data-switch-note="${note.id}" type="button" style="--card-bg:${tones[index % tones.length]};">
                <strong>${escapeHTML(note.title || 'Không có tiêu đề')}</strong>
                <span>${escapeHTML(getPlainPreview(note.content, 56))}</span>
              </button>
            `;
          }).join('') : '<div class="empty-dashboard-block">Chưa có ghi chú. Hãy tạo ghi chú đầu tiên.</div>'}
        </div>
      </div>

      <div class="note-filter-summary">
        <span>${selectedLabel ? `Bộ lọc: ${escapeHTML(selectedLabel)}` : getFilterText()}</span>
        ${(noteKeyword || selectedLabel || noteFilter !== 'all') ? '<button class="mini-clear-btn" id="clearNoteFilterBtn" type="button">Xóa lọc</button>' : ''}
      </div>

      <div id="noteModernEditorArea"></div>
    </section>
  `;

  document.getElementById('noteSearchInline')?.addEventListener('input', event => {
    noteKeyword = event.target.value;
    renderNotes();
  });

  document.getElementById('notesGridModeBtn')?.addEventListener('click', () => {
    notesLayout = 'grid';
    renderNotes();
  });

  document.getElementById('notesListModeBtn')?.addEventListener('click', () => {
    notesLayout = 'list';
    renderNotes();
  });

  document.getElementById('createNoteBtn')?.addEventListener('click', createNewNote);
  document.getElementById('clearNoteFilterBtn')?.addEventListener('click', () => {
    noteKeyword = '';
    noteFilter = 'all';
    selectedLabel = '';
    renderApp();
  });

  contentArea.querySelectorAll('[data-switch-note]').forEach(button => {
    button.addEventListener('click', () => {
      activeNoteId = button.dataset.switchNote;
      renderNotes();
    });
  });

  renderNoteEditor();
}

function renderNoteEditor() {
  const mount = document.getElementById('noteModernEditorArea');
  if (!mount) return;

  const user = getCurrentUser();
  const note = notes.find(item => item.id === activeNoteId && item.ownerEmail === user?.email);

  if (!note) {
    mount.innerHTML = `
      <div class="empty-editor modern-empty-editor">
        <h3>Chọn hoặc tạo một ghi chú</h3>
        <p>Ghi chú được chọn sẽ hiển thị tại đây để chỉnh sửa.</p>
      </div>
    `;
    return;
  }

  mount.innerHTML = `
    <div class="editor-layout-modern">
      <section class="writing-panel-modern">
        <div class="editor-toolbar-modern toolbar-v2">
          <button class="tool-btn mint" data-command="bold" type="button" title="In đậm"><strong>B</strong></button>
          <button class="tool-btn mint" data-command="italic" type="button" title="In nghiêng"><em>I</em></button>
          <button class="tool-btn mint" data-command="underline" type="button" title="Gạch chân"><u>U</u></button>
          <button class="tool-btn mint" data-command="insertUnorderedList" type="button" title="Gạch đầu dòng">•≣</button>
          <button class="tool-btn yellow" data-command="insertOrderedList" type="button" title="Danh sách số">1≣</button>
          <button class="tool-btn yellow" data-command="insertImage" type="button" title="Chèn ảnh">🖼️</button>
          <button class="tool-btn yellow" data-command="removeFormat" type="button" title="Xóa định dạng">⌫</button>
          <button class="tool-btn yellow right-tool" id="pinNoteBtn" type="button" title="Ghim ghi chú">${note.isPinned ? '📌' : '⋯'}</button>
          <input type="file" id="imageUploadInput" accept="image/*" hidden />
        </div>

        <input type="text" id="noteTitleInput" class="note-title-input modern-title" value="${escapeHTML(note.title)}" placeholder="Tiêu đề ghi chú" />

        <div
          id="noteContentInput"
          class="note-content-editable"
          contenteditable="true"
          data-placeholder="Viết nội dung ghi chú..."
        >${note.content || ''}</div>

        <div class="editor-bottom-bar">
          <span id="saveStatus">Đã lưu</span>
          <div class="editor-main-actions">
            <button class="secondary-btn" id="shareNoteBtn" type="button">${note.isShared ? 'Bỏ chia sẻ' : 'Chia sẻ'}</button>
            <button class="secondary-btn" id="lockNoteBtn" type="button">${note.isLocked ? 'Bỏ khóa' : 'Khóa'}</button>
            <button class="danger-btn" id="deleteNoteBtn" type="button">Xóa</button>
            <button class="primary-btn save-btn-modern" id="manualSaveBtn" type="button">✓ Lưu</button>
          </div>
        </div>
      </section>

      <aside class="note-info-panel-modern">
        <h3>Note Info</h3>

        <div class="info-block-modern">
          <h4>Tag</h4>
          <div class="tag-wrap-modern">
            ${(note.labels || []).length
              ? note.labels.map((label, index) => {
                  const tones = ['pink', 'green', 'mint', 'peach', 'blue'];
                  return `<span class="tag-pill-modern ${tones[index % tones.length]}">${escapeHTML(label)}</span>`;
                }).join('')
              : '<span class="info-muted">Chưa có nhãn</span>'}
          </div>
          <button class="mini-add-btn wide-btn" id="addLabelBtnInInfo" type="button">+ Thêm tag</button>
        </div>

        <div class="info-block-modern">
          <h4>Ngày tạo</h4>
          <p>${formatDate(note.createdAt)}</p>
        </div>

        <div class="info-block-modern">
          <h4>Cập nhật gần nhất</h4>
          <p>${formatDate(note.updatedAt)}</p>
        </div>

        <div class="info-block-modern">
          <h4>Trạng thái</h4>
          <div class="status-chip-wrap">
            <span class="status-chip ${note.isPinned ? 'active' : ''}">${note.isPinned ? 'Đã ghim' : 'Chưa ghim'}</span>
            <span class="status-chip ${note.isLocked ? 'active' : ''}">${note.isLocked ? 'Có khóa' : 'Mở'}</span>
            <span class="status-chip ${note.isShared ? 'active' : ''}">${note.isShared ? 'Đã chia sẻ' : 'Riêng tư'}</span>
          </div>
        </div>
      </aside>
    </div>
  `;

  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');
  const imageInput = document.getElementById('imageUploadInput');

  titleInput?.addEventListener('input', scheduleAutoSave);
  contentInput?.addEventListener('input', scheduleAutoSave);
  document.getElementById('manualSaveBtn')?.addEventListener('click', saveCurrentNote);
  document.getElementById('deleteNoteBtn')?.addEventListener('click', deleteCurrentNote);
  document.getElementById('pinNoteBtn')?.addEventListener('click', togglePinCurrentNote);
  document.getElementById('shareNoteBtn')?.addEventListener('click', toggleShareCurrentNote);
  document.getElementById('lockNoteBtn')?.addEventListener('click', toggleLockCurrentNote);
  document.getElementById('addLabelBtnInInfo')?.addEventListener('click', addLabelToCurrentNote);

  mount.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => applyEditorCommand(button.dataset.command));
  });

  imageInput?.addEventListener('change', handleInlineImageInsert);
}

function applyEditorCommand(command) {
  const editor = document.getElementById('noteContentInput');
  if (!editor) return;

  if (command === 'insertImage') {
    document.getElementById('imageUploadInput')?.click();
    return;
  }

  editor.focus();

  if (command === 'removeFormat') {
    document.execCommand('removeFormat');
    document.execCommand('unlink');
  } else {
    document.execCommand(command, false, null);
  }

  scheduleAutoSave();
}

function handleInlineImageInsert(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = loadEvent => {
    const result = loadEvent.target?.result;
    if (!result) return;

    const editor = document.getElementById('noteContentInput');
    if (!editor) return;

    editor.focus();
    const html = `<div class="editor-image-wrap"><img src="${result}" alt="Ảnh ghi chú" class="editor-inline-image" /></div><p></p>`;

    if (document.queryCommandSupported('insertHTML')) {
      document.execCommand('insertHTML', false, html);
    } else {
      editor.innerHTML += html;
    }

    scheduleAutoSave();
    showToast('Đã chèn ảnh vào ghi chú.');
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}
