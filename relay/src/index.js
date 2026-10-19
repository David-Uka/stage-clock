// Stage Clock relay: one Durable Object per room code. The controller connects with role=controller
// and pushes state; displays connect with role=display and receive it. The relay never looks at the
// timer data beyond forwarding it, and keeps only the latest message so late joiners catch up.
const CODE = /^[A-Z0-9]{6}$/;
const MAX_MESSAGE = 256 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'stage-clock-relay' });
    }
    const m = /^\/room\/([A-Za-z0-9]+)$/.exec(url.pathname);
    if (!m) return json({ error: 'not found' }, 404);
    const code = m[1].toUpperCase();
    if (!CODE.test(code)) return json({ error: 'room code must be 6 letters or digits' }, 400);
    const requested = url.searchParams.get('role');
    const role = requested === 'controller' ? 'controller' : requested === 'remote' ? 'remote' : 'display';
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected a WebSocket upgrade' }, 426);
    const id = env.ROOMS.idFromName(code);
    return env.ROOMS.get(id).fetch(new Request(`https://room/${code}?role=${role}`, request));
  },
};

export class Room {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async fetch(request) {
    const role = new URL(request.url).searchParams.get('role');
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    // Tags: the role, and a unique id so a controller's reply can be routed back to one remote.
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.ctx.acceptWebSocket(server, [role, id]);
    if (role === 'display' || role === 'remote') {
      const last = await this.ctx.storage.get('last');
      if (last) server.send(last);
    }
    this.sendClientCount();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE) return;
    const [role, id] = this.ctx.getTags(ws);
    let parsed; try { parsed = JSON.parse(message); } catch (e) { return; }
    if (!parsed || typeof parsed !== 'object') return;
    if (role === 'remote') {
      // A phone remote may only send commands, and each carries the sender's id for the reply.
      if (parsed.type !== 'command') return;
      const out = JSON.stringify({ ...parsed, from: id });
      for (const c of this.ctx.getWebSockets('controller')) { try { c.send(out); } catch (e) {} }
      return;
    }
    if (role !== 'controller') return;
    if (parsed.type === 'reply' && typeof parsed.to === 'string' && parsed.msg) {
      const out = JSON.stringify(parsed.msg);
      for (const r of this.ctx.getWebSockets(parsed.to)) { try { r.send(out); } catch (e) {} }
      return;
    }
    if (parsed.type !== 'state') return;
    await this.ctx.storage.put('last', message);
    for (const d of this.ctx.getWebSockets('display')) { try { d.send(message); } catch (e) {} }
    for (const r of this.ctx.getWebSockets('remote')) { try { r.send(message); } catch (e) {} }
  }

  webSocketClose(ws) { try { ws.close(); } catch (e) {} this.sendClientCount(ws); }
  webSocketError(ws) { try { ws.close(); } catch (e) {} this.sendClientCount(ws); }

  // `closing` is still listed by getWebSockets() while its close handler runs, so leave it out.
  sendClientCount(closing = null) {
    const n = [...this.ctx.getWebSockets('display'), ...this.ctx.getWebSockets('remote')].filter(s => s !== closing).length;
    const msg = JSON.stringify({ type: 'clients', n });
    for (const c of this.ctx.getWebSockets('controller')) { try { c.send(msg); } catch (e) {} }
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
