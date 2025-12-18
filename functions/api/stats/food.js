// GET /api/stats/food - 음식 통계 조회

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

    // 사료 통계
    const foodStats = await env.DB.prepare(`
      SELECT
        COUNT(CASE WHEN food_amount IS NOT NULL THEN 1 END) as food_count,
        SUM(food_amount) as food_total,
        AVG(food_amount) as food_avg
      FROM mimi_records
      WHERE recorded_at >= ? AND recorded_at <= ?
    `).bind(start, end).first();

    // 간식 통계
    const snackStats = await env.DB.prepare(`
      SELECT
        SUM(snack_partymix) as partymix_total,
        SUM(snack_jogong) as jogong_total,
        SUM(CASE WHEN snack_churu = 1 THEN 1 ELSE 0 END) as churu_count
      FROM mimi_records
      WHERE recorded_at >= ? AND recorded_at <= ?
    `).bind(start, end).first();

    return new Response(JSON.stringify({
      success: true,
      period: period,
      stats: {
        food: {
          total: foodStats.food_total || 0,
          count: foodStats.food_count || 0,
          average: foodStats.food_avg ? Math.round(foodStats.food_avg * 10) / 10 : 0
        },
        snacks: {
          partymix: snackStats.partymix_total || 0,
          jogong: snackStats.jogong_total || 0,
          churu: snackStats.churu_count || 0
        }
      }
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Food stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '통계를 불러오는데 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
