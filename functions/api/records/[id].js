// GET /api/records/:id - 개별 기록 조회
// PUT /api/records/:id - 기록 수정
// DELETE /api/records/:id - 기록 삭제

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = params.id;

  try {
    const result = await env.DB.prepare(
      'SELECT * FROM mimi_records WHERE id = ?'
    ).bind(id).first();

    if (!result) {
      return new Response(JSON.stringify({
        success: false,
        message: '기록을 찾을 수 없습니다.'
      }), { status: 404, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      record: result
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('GET record error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '기록을 불러오는데 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPut(context) {
  const { params, env, request } = context;
  const id = params.id;

  try {
    // 먼저 기록이 존재하는지 확인
    const existing = await env.DB.prepare(
      'SELECT id FROM mimi_records WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return new Response(JSON.stringify({
        success: false,
        message: '기록을 찾을 수 없습니다.'
      }), { status: 404, headers: corsHeaders });
    }

    const data = await request.json();
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

    // 유효성 검사
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

    if (urine_size && !['대', '중', '소'].includes(urine_size)) {
      return new Response(JSON.stringify({
        success: false,
        message: '소변 크기가 올바르지 않습니다.'
      }), { status: 400, headers: corsHeaders });
    }

    // memo를 JSON 문자열로 변환
    const memoStr = memo && memo.length > 0 ? JSON.stringify(memo) : null;

    await env.DB.prepare(`
      UPDATE mimi_records SET
        water = ?,
        food_amount = ?,
        snack_partymix = ?,
        snack_jogong = ?,
        snack_churu = ?,
        poop_count = ?,
        urine_size = ?,
        memo = ?
      WHERE id = ?
    `).bind(
      water || null,
      food_amount ?? null,
      snack_partymix || null,
      snack_jogong || null,
      snack_churu ? 1 : 0,
      poop_count || null,
      urine_size || null,
      memoStr,
      id
    ).run();

    // 업데이트된 기록 반환
    const updated = await env.DB.prepare(
      'SELECT * FROM mimi_records WHERE id = ?'
    ).bind(id).first();

    return new Response(JSON.stringify({
      success: true,
      message: '기록이 수정되었습니다.',
      record: updated
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('PUT record error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '기록 수정에 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestDelete(context) {
  const { params, env } = context;
  const id = params.id;

  try {
    // 먼저 기록이 존재하는지 확인
    const existing = await env.DB.prepare(
      'SELECT id FROM mimi_records WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return new Response(JSON.stringify({
        success: false,
        message: '기록을 찾을 수 없습니다.'
      }), { status: 404, headers: corsHeaders });
    }

    await env.DB.prepare(
      'DELETE FROM mimi_records WHERE id = ?'
    ).bind(id).run();

    return new Response(JSON.stringify({
      success: true,
      message: '기록이 삭제되었습니다.'
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('DELETE record error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '기록 삭제에 실패했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
