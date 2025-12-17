// 유틸리티 함수

const Utils = {
  // 한국 시간 포맷터
  formatKSTDate(dateString) {
    const date = new Date(dateString);
    const options = {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    };
    return date.toLocaleDateString('ko-KR', options);
  },

  formatKSTTime(dateString) {
    const date = new Date(dateString);
    const options = {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleTimeString('ko-KR', options);
  },

  formatKSTDateTime(dateString) {
    return `${this.formatKSTDate(dateString)} ${this.formatKSTTime(dateString)}`;
  },

  // 현재 한국 시간 가져오기
  getCurrentKSTTime() {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return now.toLocaleString('ko-KR', options);
  },

  // 기간 라벨
  getPeriodLabel(period) {
    const labels = {
      'today': '오늘',
      '3days': '3일',
      'week': '일주일',
      'month': '한달'
    };
    return labels[period] || '오늘';
  },

  // 토스트 메시지 표시
  showToast(message, type = 'default', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  },

  // 확인 모달 표시
  showConfirm(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const messageEl = document.getElementById('confirm-message');
      const cancelBtn = document.getElementById('confirm-cancel');
      const okBtn = document.getElementById('confirm-ok');

      messageEl.textContent = message;
      modal.classList.remove('hidden');

      const cleanup = () => {
        modal.classList.add('hidden');
        cancelBtn.removeEventListener('click', handleCancel);
        okBtn.removeEventListener('click', handleOk);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const handleOk = () => {
        cleanup();
        resolve(true);
      };

      cancelBtn.addEventListener('click', handleCancel);
      okBtn.addEventListener('click', handleOk);
    });
  },

  // 기록 요약 텍스트 생성
  formatRecordSummary(record) {
    const parts = [];

    if (record.food_amount) {
      parts.push(`사료 ${record.food_amount}개`);
    }

    if (record.water) {
      parts.push(`물 ${record.water}`);
    }

    const snacks = [];
    if (record.snack_partymix) {
      snacks.push(`파티믹스 ${record.snack_partymix}개`);
    }
    if (record.snack_jogong) {
      snacks.push(`조공 ${record.snack_jogong}개`);
    }
    if (record.snack_churu) {
      snacks.push('츄르');
    }
    if (snacks.length > 0) {
      parts.push(`간식(${snacks.join(', ')})`);
    }

    if (record.poop_count) {
      parts.push(`대변 ${record.poop_count}개`);
    }

    if (record.urine_size) {
      parts.push(`소변 ${record.urine_size}`);
    }

    if (record.memo) {
      try {
        const memos = JSON.parse(record.memo);
        if (memos.length > 0) {
          parts.push(`메모 ${memos.length}개`);
        }
      } catch (e) {}
    }

    return parts.length > 0 ? parts.join(', ') : '기록 없음';
  },

  // 날짜별로 기록 그룹화
  groupRecordsByDate(records) {
    const groups = {};

    records.forEach(record => {
      const dateKey = this.formatKSTDate(record.recorded_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    });

    return groups;
  }
};

window.Utils = Utils;
