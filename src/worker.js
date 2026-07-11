const MAX_SIZE = 100 * 1024 * 1024; // Cloudflare free plan caps request bodies at 100 MB

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(url, env) {
  const key = url.searchParams.get('key');
  return Boolean(key && env.ADMIN_KEY && key === env.ADMIN_KEY);
}

async function handleUpload(request, env, url) {
  const game = (url.searchParams.get('game') || '').trim().slice(0, 60);
  const handle = (url.searchParams.get('handle') || '').trim().slice(0, 60) || 'anonymous';
  const name = (url.searchParams.get('name') || '').slice(0, 120);

  if (!game) return json({ ok: false, error: 'Pick a game first' }, 400);
  if (!name.toLowerCase().endsWith('.mp4')) {
    return json({ ok: false, error: 'Only .mp4 files are accepted' }, 400);
  }
  const size = parseInt(request.headers.get('content-length') || '0', 10);
  if (!size || !request.body) return json({ ok: false, error: 'No clip attached' }, 400);
  if (size > MAX_SIZE) return json({ ok: false, error: 'Clip is over 100 MB' }, 400);

  const clipKey = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.mp4`;
  await env.CLIPS.put(clipKey, request.body, {
    httpMetadata: { contentType: 'video/mp4' },
    customMetadata: {
      game,
      handle,
      originalName: name,
      submittedAt: new Date().toISOString(),
    },
  });
  return json({ ok: true, id: clipKey });
}

async function listSubmissions(env) {
  const rows = [];
  let cursor;
  do {
    const page = await env.CLIPS.list({ include: ['customMetadata'], cursor });
    for (const obj of page.objects) {
      rows.push({
        file: `/uploads/${obj.key}`,
        game: obj.customMetadata?.game || 'unknown',
        handle: obj.customMetadata?.handle || 'anonymous',
        originalName: obj.customMetadata?.originalName || obj.key,
        submittedAt: obj.customMetadata?.submittedAt || obj.uploaded,
        sizeBytes: obj.size,
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  rows.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  return json(rows);
}

async function serveClip(request, env, url) {
  const clipKey = url.pathname.slice('/uploads/'.length);
  const range = request.headers.get('range');
  let object;
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const offset = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : undefined;
      object = await env.CLIPS.get(clipKey, {
        range: end !== undefined ? { offset, length: end - offset + 1 } : { offset },
      });
    }
  }
  if (!object) object = await env.CLIPS.get(clipKey);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
  });
  if (range && object.range) {
    const { offset, length } = object.range;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('Content-Length', String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/upload' && request.method === 'PUT') {
      return handleUpload(request, env, url);
    }
    if (pathname === '/api/submissions') {
      if (!isAdmin(url, env)) return json({ ok: false, error: 'unauthorized' }, 401);
      return listSubmissions(env);
    }
    if (pathname.startsWith('/uploads/')) {
      if (!isAdmin(url, env)) return new Response('unauthorized', { status: 401 });
      return serveClip(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },
};
