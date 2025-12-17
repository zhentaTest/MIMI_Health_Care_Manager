// API 호출 래퍼

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('mimi_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('mimi_token', token);
    } else {
      localStorage.removeItem('mimi_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('mimi_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 인증 토큰 추가 (auth 엔드포인트 제외)
    if (!endpoint.startsWith('/auth/') && this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      // 401 에러 시 로그아웃 처리
      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      console.error('API request error:', error);
      return {
        ok: false,
        status: 0,
        data: { success: false, message: '네트워크 오류가 발생했습니다.' }
      };
    }
  }

  // 인증 API
  async login(password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // 기록 API
  async createRecord(data) {
    return this.request('/records', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getRecords(period = 'today') {
    return this.request(`/records?period=${period}`);
  }

  async getRecord(id) {
    return this.request(`/records/${id}`);
  }

  async deleteRecord(id) {
    return this.request(`/records/${id}`, {
      method: 'DELETE'
    });
  }

  // 통계 API
  async getFoodStats(period = 'today') {
    return this.request(`/stats/food?period=${period}`);
  }

  async getBathroomStats(period = 'today') {
    return this.request(`/stats/bathroom?period=${period}`);
  }

  async getWaterStats(period = 'today') {
    return this.request(`/stats/water?period=${period}`);
  }

  async getMemoStats(period = 'today') {
    return this.request(`/stats/memo?period=${period}`);
  }
}

// 전역 API 클라이언트 인스턴스
window.api = new ApiClient();
