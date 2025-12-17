// GET /api/records - 기록 조회
// POST /api/records - 새 기록 저장

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// 한국 시간으로 날짜 범위 계산
function getDateRange(period) {
  // 한국 시간 기준 현재 시간
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9
  const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);

  // 오늘 자정 (KST)
  const todayStart = new Date(kstNow);
  todayStart.setUTCHours(0, 0, 0, 0);
  todayStart.setTime(todayStart.getTime() - kstOffset * 60 * 1000); // UTC로 변환

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

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';
    const { start, end } = getDateRange(period);

    const results = await env.DB.prepare(`
      SELECT * FROM mimi_records
      WHERE recorded_at >= ? AND recorded_at <= ?
      ORDER BY recorded_at DESC
    `).bind(start, end).all();

    return new Response(JSON.stringify({
      success: true,
      period: period,
      count: results.results.length,
      records: results.results
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('GET records error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '기록을 불러오는데 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();

    // 유효성 검사
    const {
      water,
      food_amount,
      snack_partymix,
      snack_jogong,
      snack_churu,
      poop_count,
      urine_size,
      memo
    } = data;

    // 최소 1개 옵션 선택 확인
    const hasValue = water ||
      food_amount !== null && food_amount !== undefined ||
      snack_partymix ||
      snack_jogong ||
      snack_churu ||
      poop_count ||
      urine_size ||
      (memo && memo.length > 0);

    if (!hasValue) {
      return new Response(JSON.stringify({
        success: false,
        message: '최소 1개 이상의 옵션을 선택해주세요.'
      }), { status: 400, headers: corsHeaders });
    }

    // 값 검증
    if (water && !['자급', '지급'].includes(water)) {
      return new Response(JSON.stringify({
        success: false,
        message: '물 옵션이 올바르지 않습니다.'
      }), { status: 400, headers: corsHeaders });
    }

    if (food_amount !== null && food_amount !== undefined) {
      if (food_amount < 10 || food_amount > 60 || food_amount % 5 !== 0) {
        return new Response(JSON.stringify({
          success: false,
          message: '사료량은 10-60 사이의 5단위 값이어야 합니다.'
        }), { status: 400, headers: corsHeaders });
      }
    }

    if (snack_partymix && (snack_partymix < 1 || snack_partymix > 20)) {
      return new Response(JSON.stringify({
        success: false,
        message: '파티믹스 개수는 1-20 사이여야 합니다.'
      }), { status: 400, headers: corsHeaders });
    }

    if (snack_jogong && (snack_jogong < 1 || snack_jogong > 20)) {
      return new Response(JSON.stringify({
        success: false,
        message: '조공 개수는 1-20 사이여야 합니다.'
      }), { status: 400, headers: corsHeaders });
    }

    if (poop_count && (poop_count < 1 || poop_count > 20)) {
      return new Response(JSON.stringify({
        success: false,
        message: '대변 개수는 1-20 사이여야 합니다.'
      }), { status: 400, headers: corsHeaders });
    }

    if (urine_size && !['대', '중', '소'].includes(urine_size)) {
      return new Response(JSON.stringify({
        success: false,
        message: '소변 크기가 올바르지 않습니다.'
      }), { status: 400, headers: corsHeaders });
    }

    // 한국 시간으로 현재 시간 저장
    const now = new Date();
    const recordedAt = now.toISOString();

    // memo를 JSON 문자열로 변환
    const memoStr = memo && memo.length > 0 ? JSON.stringify(memo) : null;

    const result = await env.DB.prepare(`
      INSERT INTO mimi_records (
        recorded_at, water, food_amount, snack_partymix,
        snack_jogong, snack_churu, poop_count, urine_size, memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      recordedAt,
      water || null,
      food_amount ?? null,
      snack_partymix || null,
      snack_jogong || null,
      snack_churu ? 1 : 0,
      poop_count || null,
      urine_size || null,
      memoStr
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: '저장 완료!',
      id: result.meta.last_row_id,
      recorded_at: recordedAt
    }), { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error('POST records error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '기록 저장에 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
