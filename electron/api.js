// HTTP API of the desktop app, for Stream Deck, Bitfocus Companion and other automation.
// Pure Node: no Electron import, so it can be tested without the desktop shell.
//
//   GET  /api              list the endpoints
//   GET  /api/state        the state last pushed to displays (no PIN; displays on the Wi-Fi see it anyway)
//   POST /api/<action>     play start pause reset next prev nudge blackout flash load message hideMessage
//                          PIN in an X-Pin header, ?pin=, or a JSON body { pin }.
//                          value in ?value= or a JSON body { value }; message takes ?text= (&color=, &bold=1 …) or { text, … }.
//                          Answers { ok: true } or { ok: false, reason } with 200, 400, 403 or 504.
const ACTIONS = ['play', 'start', 'pause', 'reset', 'next', 'prev', 'nudge', 'blackout', 'flash', 'load', 'message', 'hideMessage'];
const TIMEOUT_MS = 3000;

function createApi({ lastMessage, sendCommand, newClientId }) {
  const pending = new Map();   // clientId -> { res, timer }
  const json = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Pin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const readBody = req => new Promise(resolve => {
    let data = ''; req.on('data', c => { data += c; if (data.length > 16 * 1024) { req.destroy(); resolve(null); } });
    req.on('end', () => { if (!data.trim()) return resolve({}); try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
  // The controller page answers through the same reply channel the phone remotes use.
  function reply(clientId, msg) {
    const p = pending.get(clientId); if (!p) return false;
    pending.delete(clientId); clearTimeout(p.timer);
    json(p.res, msg.ok ? 200 : msg.reason === 'Wrong PIN' ? 403 : 400, { ok: !!msg.ok, ...(msg.ok ? {} : { reason: msg.reason || 'Refused' }) });
    return true;
  }
  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/api')) return false;
    if (req.method === 'OPTIONS') { json(res, 204, {}); return true; }
    const action = url.pathname.replace(/^\/api\/?/, '');
    if (!action) { json(res, 200, { app: 'stage-clock', actions: ACTIONS, state: 'GET /api/state', pin: 'X-Pin header, ?pin= or JSON body { pin }', value: '?value= or JSON body { value }; message: ?text= or JSON body { text, color, bold, upper, flash }' }); return true; }
    if (action === 'state') {
      if (req.method !== 'GET') { json(res, 405, { ok: false, reason: 'GET only' }); return true; }
      const m = lastMessage(); if (!m) { json(res, 503, { ok: false, reason: 'No state yet' }); return true; }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(m); return true;
    }
    if (!ACTIONS.includes(action)) { json(res, 404, { ok: false, reason: 'Unknown action', actions: ACTIONS }); return true; }
    if (req.method !== 'POST') { json(res, 405, { ok: false, reason: 'POST only' }); return true; }
    const body = await readBody(req); if (body === null) { json(res, 400, { ok: false, reason: 'Bad JSON' }); return true; }
    const pin = req.headers['x-pin'] || url.searchParams.get('pin') || body.pin;
    let value = body.value !== undefined ? body.value : url.searchParams.get('value');
    if (action === 'nudge') value = parseInt(value, 10) || 0;
    if (action === 'message') {
      const q = k => url.searchParams.get(k);
      value = { text: body.text ?? q('text') ?? '', color: body.color ?? q('color') ?? undefined, bold: !!(body.bold ?? q('bold')), upper: !!(body.upper ?? q('upper')), flash: !!(body.flash ?? q('flash')) };
    }
    const clientId = newClientId();
    const timer = setTimeout(() => { if (pending.delete(clientId)) json(res, 504, { ok: false, reason: 'The controller did not answer' }); }, TIMEOUT_MS);
    pending.set(clientId, { res, timer });
    sendCommand(clientId, { type: 'command', id: 'http-' + clientId, action, value, pin: pin === undefined ? '' : String(pin) });
    return true;
  }
  return { handle, reply, ACTIONS };
}
module.exports = { createApi, ACTIONS };
