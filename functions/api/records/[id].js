// GET /api/records/:id - 개별 기록 조회
// DELETE /api/records/:id - 기록 삭제

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
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
