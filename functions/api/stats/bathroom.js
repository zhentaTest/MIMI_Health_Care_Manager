// GET /api/stats/bathroom - 배변 통계 조회

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
  let days;
  let endDate = baseDateEnd;

  switch (period) {
    case 'today':
      startDate = baseDateStart;
      days = 1;
      break;
    case '3days':
      startDate = new Date(baseDateStart.getTime() - 2 * 24 * 60 * 60 * 1000);
      days = 3;
      break;
    case 'week':
      startDate = new Date(baseDateStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      days = 7;
      break;
    case 'month':
      startDate = new Date(baseDateStart.getTime() - 29 * 24 * 60 * 60 * 1000);
      days = 30;
      break;
    default:
      startDate = baseDateStart;
      days = 1;
  }

  return { start: startDate.toISOString(), end: endDate.toISOString(), days };
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';
    const dateParam = url.searchParams.get('date');
    const { start, end, days } = getDateRange(period, dateParam);

    // 대변 통계
    const poopStats = await env.DB.prepare(`
      SELECT
        SUM(poop_count) as poop_total,
        COUNT(CASE WHEN poop_count IS NOT NULL THEN 1 END) as poop_records
      FROM mimi_records
      WHERE recorded_at >= ? AND recorded_at <= ?
    `).bind(start, end).first();

    // 소변 통계
    const urineStats = await env.DB.prepare(`
      SELECT
        COUNT(CASE WHEN urine_size = '대' THEN 1 END) as large_count,
        COUNT(CASE WHEN urine_size = '중' THEN 1 END) as medium_count,
        COUNT(CASE WHEN urine_size = '소' THEN 1 END) as small_count
      FROM mimi_records
      WHERE recorded_at >= ? AND recorded_at <= ?
    `).bind(start, end).first();

    const poopTotal = poopStats.poop_total || 0;
    const dailyAverage = days > 0 ? Math.round(poopTotal / days * 10) / 10 : 0;

    return new Response(JSON.stringify({
      success: true,
      period: period,
      stats: {
        poop: {
          total: poopTotal,
          records: poopStats.poop_records || 0,
          dailyAverage: dailyAverage
        },
        urine: {
          large: urineStats.large_count || 0,
          medium: urineStats.medium_count || 0,
          small: urineStats.small_count || 0,
          total: (urineStats.large_count || 0) + (urineStats.medium_count || 0) + (urineStats.small_count || 0)
        }
      }
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Bathroom stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '통계를 불러오는데 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
