// GET /api/auth/verify - JWT 유효성 확인

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode signature
    const signatureStr = atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'));
    const signature = new Uint8Array(signatureStr.length);
    for (let i = 0; i < signatureStr.length; i++) {
      signature[i] = signatureStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(data)
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error('JWT verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        valid: false,
        message: '인증 토큰이 필요합니다.'
      }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.substring(7);
    const jwtSecret = env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return new Response(JSON.stringify({
        valid: false,
        message: '서버 설정 오류입니다.'
      }), { status: 500, headers: corsHeaders });
    }

    const result = await verifyJWT(token, jwtSecret);

    if (!result.valid) {
      return new Response(JSON.stringify({
        valid: false,
        message: result.error === 'Token expired' ? '세션이 만료되었습니다. 다시 로그인해주세요.' : '유효하지 않은 토큰입니다.'
      }), { status: 401, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      valid: true,
      message: '인증 성공',
      user: result.payload.sub,
      expiresAt: result.payload.exp
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Verify error:', error);
    return new Response(JSON.stringify({
      valid: false,
      message: '서버 오류가 발생했습니다.'
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
