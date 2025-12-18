// GET /api/stats/water - 물 섭취 통계 조회

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

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';
    const dateParam = url.searchParams.get('date');
    const { start, end } = getDateRange(period, dateParam);

    const waterStats = await env.DB.prepare(`
      SELECT
        COUNT(CASE WHEN water = '자급' THEN 1 END) as self_count,
        COUNT(CASE WHEN water = '지급' THEN 1 END) as given_count,
        COUNT(CASE WHEN water IS NOT NULL THEN 1 END) as total_count
      FROM mimi_records
      WHERE recorded_at >= ? AND recorded_at <= ?
    `).bind(start, end).first();

    const selfCount = waterStats.self_count || 0;
    const givenCount = waterStats.given_count || 0;
    const totalCount = waterStats.total_count || 0;

    const selfPercent = totalCount > 0 ? Math.round(selfCount / totalCount * 100) : 0;
    const givenPercent = totalCount > 0 ? Math.round(givenCount / totalCount * 100) : 0;

    return new Response(JSON.stringify({
      success: true,
      period: period,
      stats: {
        self: selfCount,
        given: givenCount,
        total: totalCount,
        selfPercent: selfPercent,
        givenPercent: givenPercent
      }
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Water stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '통계를 불러오는데 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
