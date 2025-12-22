// 미미 식단 관리 - 메인 앱 로직

class MimiApp {
  constructor() {
    this.currentScreen = 'login';
    this.currentPeriod = 'today';
    this.currentTab = 'food';
    this.selectedDate = this.getTodayKST();
    this.viewMode = 'daily';
    this.editingRecordId = null;

    // 기록 폼 상태
    this.recordForm = {
      water: null,
      food_enabled: false,
      food_amount: 40,
      snack_partymix_enabled: false,
      snack_partymix: 5,
      snack_jogong_enabled: false,
      snack_jogong: 5,
      snack_churu: false,
      poop_enabled: false,
      poop_count: 1,
      urine_enabled: false,
      urine_size: '중',
      memo: []
    };

    this.init();
  }

  // 한국 시간 기준 오늘 날짜 가져오기 (YYYY-MM-DD)
  getTodayKST() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstTime = new Date(utc + (9 * 60 * 60000));
    const year = kstTime.getFullYear();
    const month = String(kstTime.getMonth() + 1).padStart(2, '0');
    const day = String(kstTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 날짜를 YYYY.MM.DD 형식으로 포맷
  formatDateDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${year}.${month}.${day}`;
  }

  // 날짜를 하루 이동 (direction: -1 또는 1)
  shiftDate(dateStr, direction) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + direction);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newDay = String(date.getDate()).padStart(2, '0');
    return `${newYear}-${newMonth}-${newDay}`;
  }

  // 선택된 날짜가 오늘인지 확인
  isToday(dateStr) {
    return dateStr === this.getTodayKST();
  }

  async init() {
    this.setupEventListeners();

    const isAuthenticated = await Auth.checkAuth();
    if (isAuthenticated) {
      this.showScreen('home');
    } else {
      this.showScreen('login');
    }

    window.addEventListener('auth:logout', () => {
      this.showScreen('login');
      Utils.showToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
    });
  }

  setupEventListeners() {
    // 로그인 폼
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));

    // 로그아웃 버튼
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

    // 홈 메뉴 버튼
    document.getElementById('btn-record').addEventListener('click', () => this.showScreen('record'));
    document.getElementById('btn-view').addEventListener('click', () => this.showScreen('view'));

    // 뒤로가기 버튼
    document.getElementById('record-back-btn').addEventListener('click', () => {
      this.editingRecordId = null;
      clearInterval(this.timeInterval);
      this.showScreen('home');
    });
    document.getElementById('view-back-btn').addEventListener('click', () => this.showScreen('home'));

    // 취소 버튼 (기록 화면)
    document.getElementById('cancel-record-btn').addEventListener('click', () => {
      this.editingRecordId = null;
      clearInterval(this.timeInterval);
      this.showScreen('home');
    });

    // 기록 폼 이벤트
    this.setupRecordFormListeners();

    // 저장 버튼
    document.getElementById('save-record-btn').addEventListener('click', () => this.handleSaveRecord());

    // 조회 화면 이벤트
    this.setupViewListeners();
  }

  setupRecordFormListeners() {
    // 물 라디오 버튼
    document.querySelectorAll('input[name="water"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.recordForm.water = radio.value;
        this.updateSaveButton();
      });
    });

    // 사료량
    document.getElementById('food-enabled').addEventListener('change', (e) => {
      this.recordForm.food_enabled = e.target.checked;
      this.toggleStepper('food-stepper', e.target.checked);
      this.updateSaveButton();
    });
    this.setupStepper('food', 10, 60, 5);

    // 간식 - 파티믹스
    document.getElementById('snack-partymix-enabled').addEventListener('change', (e) => {
      this.recordForm.snack_partymix_enabled = e.target.checked;
      this.toggleStepper('snack-partymix-stepper', e.target.checked);
      this.updateSaveButton();
    });
    this.setupStepper('snack-partymix', 1, 20, 1);

    // 간식 - 조공
    document.getElementById('snack-jogong-enabled').addEventListener('change', (e) => {
      this.recordForm.snack_jogong_enabled = e.target.checked;
      this.toggleStepper('snack-jogong-stepper', e.target.checked);
      this.updateSaveButton();
    });
    this.setupStepper('snack-jogong', 1, 20, 1);

    // 간식 - 츄르
    document.getElementById('snack-churu-enabled').addEventListener('change', (e) => {
      this.recordForm.snack_churu = e.target.checked;
      this.updateSaveButton();
    });

    // 대변
    document.getElementById('poop-enabled').addEventListener('change', (e) => {
      this.recordForm.poop_enabled = e.target.checked;
      this.toggleStepper('poop-stepper', e.target.checked);
      this.updateSaveButton();
    });
    this.setupStepper('poop', 1, 20, 1);

    // 소변
    document.getElementById('urine-enabled').addEventListener('change', (e) => {
      this.recordForm.urine_enabled = e.target.checked;
      this.toggleRadioGroup('urine-options', e.target.checked);
      this.updateSaveButton();
    });
    document.querySelectorAll('input[name="urine"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.recordForm.urine_size = radio.value;
      });
    });

    // 메모
    document.querySelectorAll('#memo-options input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.recordForm.memo = Array.from(
          document.querySelectorAll('#memo-options input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        this.updateSaveButton();
      });
    });
  }

  setupStepper(name, min, max, step) {
    const decreaseBtn = document.getElementById(`${name}-decrease`);
    const increaseBtn = document.getElementById(`${name}-increase`);
    const valueEl = document.getElementById(`${name}-value`);

    const formKey = name === 'snack-partymix' ? 'snack_partymix' :
                    name === 'snack-jogong' ? 'snack_jogong' :
                    name === 'poop' ? 'poop_count' :
                    `${name}_amount`;

    decreaseBtn.addEventListener('click', () => {
      let current = this.recordForm[formKey];
      if (current > min) {
        this.recordForm[formKey] = current - step;
        valueEl.textContent = this.recordForm[formKey];
      }
    });

    increaseBtn.addEventListener('click', () => {
      let current = this.recordForm[formKey];
      if (current < max) {
        this.recordForm[formKey] = current + step;
        valueEl.textContent = this.recordForm[formKey];
      }
    });
  }

  toggleStepper(stepperId, enabled) {
    const stepper = document.getElementById(stepperId);
    if (enabled) {
      stepper.classList.remove('disabled');
    } else {
      stepper.classList.add('disabled');
    }
  }

  toggleRadioGroup(groupId, enabled) {
    const group = document.getElementById(groupId);
    if (enabled) {
      group.classList.remove('disabled');
    } else {
      group.classList.add('disabled');
    }
  }

  setupViewListeners() {
    // 모드 스위치
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.view-mode-btn');
        if (!targetBtn) return;

        document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        this.viewMode = targetBtn.dataset.mode;
        this.updateViewModeUI();
        this.loadCurrentTabStats();
        this.loadDetailRecords();
      });
    });

    // 날짜 네비게이션 - 버그 수정
    document.getElementById('date-prev-btn').addEventListener('click', () => {
      this.selectedDate = this.shiftDate(this.selectedDate, -1);
      this.updateDateNavigation();
      this.updatePeriodLabels();
      this.loadCurrentTabStats();
      this.loadDetailRecords();
    });

    document.getElementById('date-next-btn').addEventListener('click', () => {
      const today = this.getTodayKST();
      if (this.selectedDate < today) {
        this.selectedDate = this.shiftDate(this.selectedDate, 1);
        this.updateDateNavigation();
        this.updatePeriodLabels();
        this.loadCurrentTabStats();
        this.loadDetailRecords();
      }
    });

    // 기간 필터
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentPeriod = e.target.dataset.period;
        this.updatePeriodLabels();
        this.loadCurrentTabStats();
        this.loadDetailRecords();
      });
    });

    // 탭 메뉴
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        const tabId = `tab-${e.target.dataset.tab}`;
        document.getElementById(tabId).classList.remove('hidden');

        this.currentTab = e.target.dataset.tab;
        this.loadCurrentTabStats();
      });
    });

    // 상세 보기 토글
    document.getElementById('toggle-detail-btn').addEventListener('click', () => {
      const detailSection = document.getElementById('detail-records');
      const btn = document.getElementById('toggle-detail-btn');

      if (detailSection.classList.contains('hidden')) {
        detailSection.classList.remove('hidden');
        btn.textContent = '상세 기록 숨기기';
        this.loadDetailRecords();
      } else {
        detailSection.classList.add('hidden');
        btn.textContent = '상세 기록 보기';
      }
    });
  }

  showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });

    document.getElementById(`${screenName}-screen`).classList.remove('hidden');
    this.currentScreen = screenName;

    if (screenName === 'record') {
      this.initRecordScreen();
    } else if (screenName === 'view') {
      this.initViewScreen();
    }
  }

  initRecordScreen() {
    if (!this.editingRecordId) {
      this.resetRecordForm();
    }

    // 타이틀 업데이트
    const headerTitle = document.getElementById('record-header-title');
    if (this.editingRecordId) {
      headerTitle.textContent = '기록 수정하기';
    } else {
      headerTitle.textContent = '기록하기';
    }

    // 현재 날짜 표시
    const today = this.getTodayKST();
    document.getElementById('record-date').textContent = this.formatDateDisplay(today);

    // 현재 시간 표시 및 업데이트
    this.updateCurrentTime();
    this.timeInterval = setInterval(() => this.updateCurrentTime(), 1000);
  }

  resetRecordForm() {
    // 라디오 버튼 초기화
    document.querySelectorAll('input[name="water"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="urine"]').forEach(r => {
      r.checked = r.value === '중';
    });

    // 체크박스 초기화
    document.getElementById('food-enabled').checked = false;
    document.getElementById('snack-partymix-enabled').checked = false;
    document.getElementById('snack-jogong-enabled').checked = false;
    document.getElementById('snack-churu-enabled').checked = false;
    document.getElementById('poop-enabled').checked = false;
    document.getElementById('urine-enabled').checked = false;
    document.querySelectorAll('#memo-options input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    // 스텝퍼 초기화
    document.getElementById('food-value').textContent = '40';
    document.getElementById('snack-partymix-value').textContent = '5';
    document.getElementById('snack-jogong-value').textContent = '5';
    document.getElementById('poop-value').textContent = '1';

    // 스텝퍼 비활성화
    this.toggleStepper('food-stepper', false);
    this.toggleStepper('snack-partymix-stepper', false);
    this.toggleStepper('snack-jogong-stepper', false);
    this.toggleStepper('poop-stepper', false);
    this.toggleRadioGroup('urine-options', false);

    // 폼 상태 초기화
    this.recordForm = {
      water: null,
      food_enabled: false,
      food_amount: 40,
      snack_partymix_enabled: false,
      snack_partymix: 5,
      snack_jogong_enabled: false,
      snack_jogong: 5,
      snack_churu: false,
      poop_enabled: false,
      poop_count: 1,
      urine_enabled: false,
      urine_size: '중',
      memo: []
    };

    this.updateSaveButton();
  }

  updateCurrentTime() {
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
      timeEl.textContent = Utils.getCurrentKSTTime();
    }
  }

  updateSaveButton() {
    const hasSelection = this.recordForm.water ||
      this.recordForm.food_enabled ||
      this.recordForm.snack_partymix_enabled ||
      this.recordForm.snack_jogong_enabled ||
      this.recordForm.snack_churu ||
      this.recordForm.poop_enabled ||
      this.recordForm.urine_enabled ||
      this.recordForm.memo.length > 0;

    document.getElementById('save-record-btn').disabled = !hasSelection;
  }

  async handleLogin(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    if (!password) {
      errorEl.textContent = '비밀번호를 입력해주세요.';
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '로그인 중...';

    const result = await Auth.login(password);

    loginBtn.disabled = false;
    loginBtn.textContent = '로그인';

    if (result.success) {
      document.getElementById('password').value = '';
      errorEl.textContent = '';
      this.showScreen('home');
      Utils.showToast('로그인 성공!', 'success');
    } else {
      errorEl.textContent = result.message;
    }
  }

  handleLogout() {
    Auth.logout();
    this.showScreen('login');
    Utils.showToast('로그아웃되었습니다.');
  }

  async handleSaveRecord() {
    const isEditMode = !!this.editingRecordId;
    const confirmMessage = isEditMode ? '기록을 수정하시겠습니까?' : '기록을 저장하시겠습니까?';
    const confirmed = await Utils.showConfirm(confirmMessage);
    if (!confirmed) return;

    const saveBtn = document.getElementById('save-record-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = isEditMode ? '수정 중...' : '저장 중...';

    const data = {
      water: this.recordForm.water,
      food_amount: this.recordForm.food_enabled ? this.recordForm.food_amount : null,
      snack_partymix: this.recordForm.snack_partymix_enabled ? this.recordForm.snack_partymix : null,
      snack_jogong: this.recordForm.snack_jogong_enabled ? this.recordForm.snack_jogong : null,
      snack_churu: this.recordForm.snack_churu,
      poop_count: this.recordForm.poop_enabled ? this.recordForm.poop_count : null,
      urine_size: this.recordForm.urine_enabled ? this.recordForm.urine_size : null,
      memo: this.recordForm.memo
    };

    let result;
    if (isEditMode) {
      result = await api.updateRecord(this.editingRecordId, data);
    } else {
      result = await api.createRecord(data);
    }

    saveBtn.disabled = false;
    saveBtn.textContent = '저장';

    if (result.ok && result.data.success) {
      Utils.showToast(isEditMode ? '수정되었습니다.' : '저장 완료!', 'success');
      clearInterval(this.timeInterval);
      this.editingRecordId = null;
      this.showScreen('view');
    } else {
      Utils.showToast(result.data.message || (isEditMode ? '수정에 실패했습니다.' : '저장에 실패했습니다.'), 'error');
      this.updateSaveButton();
    }
  }

  initViewScreen() {
    this.viewMode = 'daily';
    this.currentPeriod = 'today';
    this.currentTab = 'food';
    this.selectedDate = this.getTodayKST();

    // 모드 스위치 UI 초기화
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.view-mode-btn[data-mode="daily"]').classList.add('active');

    // 기간 필터 UI 초기화
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.period-btn[data-period="today"]').classList.add('active');

    // 탭 UI 초기화
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="food"]').classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('tab-food').classList.remove('hidden');

    // 상세 기록 숨기기
    document.getElementById('detail-records').classList.add('hidden');
    document.getElementById('toggle-detail-btn').textContent = '상세 기록 보기';

    // 모드별 UI 업데이트
    this.updateViewModeUI();
    this.updateDateNavigation();
    this.loadCurrentTabStats();
  }

  updateDateNavigation() {
    const today = this.getTodayKST();
    document.getElementById('current-date-display').textContent = this.formatDateDisplay(this.selectedDate);
    document.getElementById('date-next-btn').disabled = this.selectedDate >= today;
  }

  updateViewModeUI() {
    const dateNav = document.getElementById('date-navigation');
    const periodFilter = document.getElementById('period-filter');
    const tabMenu = document.getElementById('tab-menu');
    const tabContent = document.getElementById('tab-content');
    const detailSection = document.querySelector('.detail-section');
    const detailRecords = document.getElementById('detail-records');

    if (this.viewMode === 'daily') {
      dateNav.classList.remove('hidden');
      periodFilter.classList.add('hidden');
      // 날짜별 모드: 탭 메뉴 숨기고 전체 기록 표시
      tabMenu.classList.add('hidden');
      tabContent.classList.add('hidden');
      detailSection.classList.remove('hidden');
      detailRecords.classList.remove('hidden');
      document.getElementById('toggle-detail-btn').classList.add('hidden');
      this.currentPeriod = 'today';
      this.loadDetailRecords();
    } else {
      dateNav.classList.add('hidden');
      periodFilter.classList.remove('hidden');
      // 기간별 모드: 탭 메뉴 표시
      tabMenu.classList.remove('hidden');
      tabContent.classList.remove('hidden');
      detailSection.classList.remove('hidden');
      document.getElementById('toggle-detail-btn').classList.remove('hidden');
      detailRecords.classList.add('hidden');
      document.getElementById('toggle-detail-btn').textContent = '상세 기록 보기';
    }

    this.updatePeriodLabels();
  }

  updatePeriodLabels() {
    // 기간 라벨은 stats-card 내부에서 동적으로 표시
  }

  async loadCurrentTabStats() {
    if (this.viewMode === 'daily') return; // 날짜별 모드에서는 통계 로드 안함

    switch (this.currentTab) {
      case 'food':
        await this.loadFoodStats();
        break;
      case 'bathroom':
        await this.loadBathroomStats();
        break;
      case 'water':
        await this.loadWaterStats();
        break;
      case 'memo':
        await this.loadMemoStats();
        break;
    }
  }

  async loadFoodStats() {
    const container = document.getElementById('food-stats');
    container.innerHTML = '<div class="loading">로딩 중...</div>';

    const result = await api.getFoodStats(this.currentPeriod, this.selectedDate);

    if (!result.ok) {
      container.innerHTML = '<p class="no-data">데이터를 불러올 수 없습니다.</p>';
      return;
    }

    const stats = result.data.stats;

    if (stats.food.count === 0 && stats.snacks.partymix === 0 && stats.snacks.jogong === 0 && stats.snacks.churu === 0) {
      container.innerHTML = '<p class="no-data">기록이 없습니다.</p>';
      return;
    }

    container.innerHTML = `
      <div class="stats-item">
        <span class="stats-label">🍚 사료</span>
        <span class="stats-value">총 ${stats.food.total}g</span>
      </div>
      ${stats.food.count > 0 ? `
      <div class="stats-subitem">
        <span>기록 횟수</span>
        <span>${stats.food.count}회</span>
      </div>
      <div class="stats-subitem">
        <span>평균</span>
        <span>${stats.food.average}g/회</span>
      </div>
      ` : ''}
      <div class="stats-item">
        <span class="stats-label">🍬 간식</span>
        <span class="stats-value"></span>
      </div>
      <div class="stats-subitem"><span>파티믹스</span><span>${stats.snacks.partymix}개</span></div>
      <div class="stats-subitem"><span>조공</span><span>${stats.snacks.jogong}개</span></div>
      <div class="stats-subitem"><span>츄르</span><span>${stats.snacks.churu}회</span></div>
    `;
  }

  async loadBathroomStats() {
    const container = document.getElementById('bathroom-stats');
    container.innerHTML = '<div class="loading">로딩 중...</div>';

    const result = await api.getBathroomStats(this.currentPeriod, this.selectedDate);

    if (!result.ok) {
      container.innerHTML = '<p class="no-data">데이터를 불러올 수 없습니다.</p>';
      return;
    }

    const stats = result.data.stats;

    if (stats.poop.total === 0 && stats.urine.total === 0) {
      container.innerHTML = '<p class="no-data">기록이 없습니다.</p>';
      return;
    }

    // 프로그레스 바 계산
    const maxUrine = Math.max(stats.urine.large, stats.urine.medium, stats.urine.small, 1);

    container.innerHTML = `
      <div class="stats-item">
        <span class="stats-label">💩 대변</span>
        <span class="stats-value">총 ${stats.poop.total}회</span>
      </div>
      ${stats.poop.records > 0 ? `
      <div class="stats-subitem">
        <span>일평균</span>
        <span>${stats.poop.dailyAverage}회</span>
      </div>
      ` : ''}
      <div class="stats-item">
        <span class="stats-label">💦 소변 (감자 크기)</span>
        <span class="stats-value">총 ${stats.urine.total}회</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-item">
          <span class="progress-label">대</span>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.urine.large / maxUrine) * 100}%"></div>
          </div>
          <span class="progress-value">${stats.urine.large}회</span>
        </div>
        <div class="progress-item">
          <span class="progress-label">중</span>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.urine.medium / maxUrine) * 100}%"></div>
          </div>
          <span class="progress-value">${stats.urine.medium}회</span>
        </div>
        <div class="progress-item">
          <span class="progress-label">소</span>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.urine.small / maxUrine) * 100}%"></div>
          </div>
          <span class="progress-value">${stats.urine.small}회</span>
        </div>
      </div>
    `;
  }

  async loadWaterStats() {
    const container = document.getElementById('water-stats');
    container.innerHTML = '<div class="loading">로딩 중...</div>';

    const result = await api.getWaterStats(this.currentPeriod, this.selectedDate);

    if (!result.ok) {
      container.innerHTML = '<p class="no-data">데이터를 불러올 수 없습니다.</p>';
      return;
    }

    const stats = result.data.stats;

    if (stats.total === 0) {
      container.innerHTML = '<p class="no-data">기록이 없습니다.</p>';
      return;
    }

    container.innerHTML = `
      <div class="stats-item">
        <span class="stats-label">💧 총 기록</span>
        <span class="stats-value">${stats.total}회</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">자급 (스스로 마심)</span>
        <span class="stats-value">${stats.self}회 (${stats.selfPercent}%)</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">지급 (보호자가 줌)</span>
        <span class="stats-value">${stats.given}회 (${stats.givenPercent}%)</span>
      </div>
    `;
  }

  async loadMemoStats() {
    const container = document.getElementById('memo-stats');
    container.innerHTML = '<div class="loading">로딩 중...</div>';

    const result = await api.getMemoStats(this.currentPeriod, this.selectedDate);

    if (!result.ok) {
      container.innerHTML = '<p class="no-data">데이터를 불러올 수 없습니다.</p>';
      return;
    }

    const stats = result.data.stats;

    if (stats.totalRecords === 0 || stats.memos.length === 0) {
      container.innerHTML = '<p class="no-data">기록이 없습니다.</p>';
      return;
    }

    container.innerHTML = `
      <div class="stats-item">
        <span class="stats-label">📝 기록된 메모</span>
        <span class="stats-value">${stats.totalRecords}건</span>
      </div>
      <div class="memo-list">
        ${stats.memos.map(m => `
          <div class="memo-item">
            <span class="memo-text">${m.item}</span>
            <span class="memo-count">${m.count}회</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  async loadDetailRecords() {
    const container = document.getElementById('detail-records');
    if (this.viewMode !== 'daily' && container.classList.contains('hidden')) return;

    container.innerHTML = '<div class="loading">로딩 중...</div>';

    const result = await api.getRecords(this.currentPeriod, this.selectedDate);

    if (!result.ok) {
      container.innerHTML = '<p class="no-data">데이터를 불러올 수 없습니다.</p>';
      return;
    }

    if (result.data.records.length === 0) {
      container.innerHTML = '<p class="no-data">기록이 없습니다.</p>';
      return;
    }

    const grouped = Utils.groupRecordsByDate(result.data.records);
    let html = '';

    for (const [date, records] of Object.entries(grouped)) {
      html += `<div class="detail-day">
        <div class="detail-date">📅 ${date}</div>`;

      records.forEach(record => {
        const time = Utils.formatKSTTime(record.recorded_at);
        const details = Utils.formatRecordDetail(record);
        html += `<div class="detail-record" data-record-id="${record.id}">
          <div class="detail-time">${time}</div>
          <div class="detail-content">
            ${details.map(line => `<div class="detail-line">${line}</div>`).join('')}
          </div>
          <div class="detail-actions">
            <button class="edit-btn" data-id="${record.id}">수정</button>
            <button class="delete-btn" data-id="${record.id}">삭제</button>
          </div>
        </div>`;
      });

      html += '</div>';
    }

    container.innerHTML = html;
    this.bindRecordActions();
  }

  bindRecordActions() {
    // 삭제 버튼
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recordId = e.target.dataset.id;
        this.handleDeleteRecord(recordId);
      });
    });

    // 수정 버튼
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recordId = e.target.dataset.id;
        this.handleEditRecord(recordId);
      });
    });
  }

  async handleDeleteRecord(recordId) {
    const confirmed = await Utils.showConfirm('이 기록을 삭제하시겠습니까?');
    if (!confirmed) return;

    const result = await api.deleteRecord(recordId);

    if (result.ok && result.data.success) {
      Utils.showToast('삭제되었습니다.', 'success');
      this.loadDetailRecords();
      this.loadCurrentTabStats();
    } else {
      Utils.showToast(result.data.message || '삭제에 실패했습니다.', 'error');
    }
  }

  async handleEditRecord(recordId) {
    const result = await api.getRecord(recordId);
    if (!result.ok || !result.data.success) {
      Utils.showToast('기록을 불러올 수 없습니다.', 'error');
      return;
    }

    const record = result.data.record;
    this.editingRecordId = recordId;
    this.showScreen('record');
    this.populateRecordForm(record);
  }

  populateRecordForm(record) {
    // 물
    if (record.water) {
      const waterRadio = document.querySelector(`input[name="water"][value="${record.water}"]`);
      if (waterRadio) {
        waterRadio.checked = true;
        this.recordForm.water = record.water;
      }
    }

    // 사료
    if (record.food_amount) {
      document.getElementById('food-enabled').checked = true;
      this.recordForm.food_enabled = true;
      this.recordForm.food_amount = record.food_amount;
      document.getElementById('food-value').textContent = record.food_amount;
      this.toggleStepper('food-stepper', true);
    }

    // 파티믹스
    if (record.snack_partymix) {
      document.getElementById('snack-partymix-enabled').checked = true;
      this.recordForm.snack_partymix_enabled = true;
      this.recordForm.snack_partymix = record.snack_partymix;
      document.getElementById('snack-partymix-value').textContent = record.snack_partymix;
      this.toggleStepper('snack-partymix-stepper', true);
    }

    // 조공
    if (record.snack_jogong) {
      document.getElementById('snack-jogong-enabled').checked = true;
      this.recordForm.snack_jogong_enabled = true;
      this.recordForm.snack_jogong = record.snack_jogong;
      document.getElementById('snack-jogong-value').textContent = record.snack_jogong;
      this.toggleStepper('snack-jogong-stepper', true);
    }

    // 츄르
    if (record.snack_churu) {
      document.getElementById('snack-churu-enabled').checked = true;
      this.recordForm.snack_churu = true;
    }

    // 대변
    if (record.poop_count) {
      document.getElementById('poop-enabled').checked = true;
      this.recordForm.poop_enabled = true;
      this.recordForm.poop_count = record.poop_count;
      document.getElementById('poop-value').textContent = record.poop_count;
      this.toggleStepper('poop-stepper', true);
    }

    // 소변
    if (record.urine_size) {
      document.getElementById('urine-enabled').checked = true;
      this.recordForm.urine_enabled = true;
      this.recordForm.urine_size = record.urine_size;
      this.toggleRadioGroup('urine-options', true);
      const urineRadio = document.querySelector(`input[name="urine"][value="${record.urine_size}"]`);
      if (urineRadio) urineRadio.checked = true;
    }

    // 메모
    if (record.memo) {
      try {
        const memos = JSON.parse(record.memo);
        if (Array.isArray(memos)) {
          memos.forEach(memoValue => {
            const checkbox = document.querySelector(`#memo-options input[value="${memoValue}"]`);
            if (checkbox) checkbox.checked = true;
          });
          this.recordForm.memo = memos;
        }
      } catch (e) {}
    }

    this.updateSaveButton();
  }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MimiApp();
});
