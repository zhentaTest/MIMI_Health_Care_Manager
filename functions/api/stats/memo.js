// GET /api/stats/memo - 특이사항 통계 조회

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function getDateRange(period, dateParam = null) {
  let baseDate;
  if (dateParam) {
    baseDate = new Date(dateParam + 'T00:00:00+09:00');
  } else {
    const now = new Date();
    baseDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  }

  const baseDateStart = new Date(baseDate);
  baseDateStart.setHours(0, 0, 0, 0);

  const baseDateEnd = new Date(baseDate);
  baseDateEnd.setHours(23, 59, 59, 999);

  let startDate;
  let endDate = baseDateEnd;

  switch (period) {
    case 'today':
      startDate = baseDateStart;
      break;
    case '3days':
      startDate = new Date(baseDateStart.getTime() - 2 * 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(baseDateStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(baseDateStart.getTime() - 29 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = baseDateStart;
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
    const dateParam = url.searchParams.get('date');
    const { start, end } = getDateRange(period, dateParam);

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
