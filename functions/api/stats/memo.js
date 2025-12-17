// GET /api/stats/memo - 특이사항 통계 조회

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function getDateRange(period) {
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);

  const todayStart = new Date(kstNow);
  todayStart.setUTCHours(0, 0, 0, 0);
  todayStart.setTime(todayStart.getTime() - kstOffset * 60 * 1000);

  let startDate;
  const endDate = now;

  switch (period) {
    case 'today':
      startDate = todayStart;
      break;
    case '3days':
      startDate = new Date(todayStart.getTime() - 2 * 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = todayStart;
  }

  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

// 메모 항목 목록
const MEMO_ITEMS = [
  '구토를 했어요 🤮',
  '앙탈이 심했어요 😾',
  '너무 울어요 😿',
  '밥을 안 먹어요 🙅',
  '평소보다 활발해요 🏃',
  '많이 잤어요 😴',
  '털을 많이 핥아요 🐈',
  '숨어있어요 🙈',
  '컨디션이 좋아요 ✨',
  '물을 많이 마셔요 💧'
];

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';
    const { start, end } = getDateRange(period);

    // 메모가 있는 모든 기록 조회
    const records = await env.DB.prepare(`
      SELECT memo FROM mimi_records
      WHERE recorded_at >= ? AND recorded_at <= ?
      AND memo IS NOT NULL AND memo != '[]'
    `).bind(start, end).all();

    // 메모 항목별 카운트
    const memoCounts = {};
    MEMO_ITEMS.forEach(item => {
      memoCounts[item] = 0;
    });

    let totalMemoRecords = 0;

    records.results.forEach(record => {
      if (record.memo) {
        try {
          const memos = JSON.parse(record.memo);
          if (Array.isArray(memos) && memos.length > 0) {
            totalMemoRecords++;
            memos.forEach(memo => {
              if (memoCounts.hasOwnProperty(memo)) {
                memoCounts[memo]++;
              }
            });
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      }
    });

    // 빈도순 정렬
    const sortedMemos = Object.entries(memoCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([item, count]) => ({ item, count }));

    return new Response(JSON.stringify({
      success: true,
      period: period,
      stats: {
        totalRecords: totalMemoRecords,
        memos: sortedMemos,
        all: memoCounts
      }
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Memo stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '통계를 불러오는데 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
