// 인증 관련 함수

const Auth = {
  // 로그인 상태 확인
  async checkAuth() {
    const token = api.getToken();
    if (!token) {
      return false;
    }

    const result = await api.verifyToken();
    if (!result.ok || !result.data.valid) {
      api.setToken(null);
      return false;
    }

    return true;
  },

  // 로그인
  async login(password) {
    const result = await api.login(password);

    if (result.ok && result.data.success) {
      api.setToken(result.data.token);
      return { success: true };
    }

    return {
      success: false,
      message: result.data.message || '로그인에 실패했습니다.',
      locked: result.data.locked,
      remainingSeconds: result.data.remainingSeconds,
      remainingAttempts: result.data.remainingAttempts
    };
  },

  // 로그아웃
  logout() {
    api.setToken(null);
  },

  // 토큰 가져오기
  getToken() {
    return api.getToken();
  }
};

window.Auth = Auth;
