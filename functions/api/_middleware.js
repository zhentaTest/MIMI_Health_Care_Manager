// 인증 미들웨어 - 모든 /api/* 요청에 적용

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

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
      return { valid: false };
    }

    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Skip authentication for auth endpoints and OPTIONS requests
  if (url.pathname.startsWith('/api/auth/') || request.method === 'OPTIONS') {
    return next();
  }

  // Require authentication for all other API endpoints
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      success: false,
      message: '인증이 필요합니다.'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const token = authHeader.substring(7);
  const result = await verifyJWT(token, env.JWT_SECRET);

  if (!result.valid) {
    return new Response(JSON.stringify({
      success: false,
      message: '유효하지 않은 인증입니다. 다시 로그인해주세요.'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Add user info to context
  context.user = result.payload;

  return next();
}
