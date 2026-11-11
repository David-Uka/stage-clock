// Exercises electron/api.js with a fake controller: no Electron needed.  Run: node electron/test-api.js
const http = require('http');
const assert = require('assert');
const { createApi } = require('./api');

const sent = []; let nextId = 1; let last = null; let clock = 1_000_000;
const api = createApi({ lastMessage: () => last, sendCommand: (clientId, msg) => sent.push({ clientId, msg }), newClientId: () => nextId++, now: () => clock });
const server = http.createServer(async (req, res) => { if (!(await api.handle(req, res))) { res.writeHead(404); res.end('static'); } });
const call = (method, path, { body, headers } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ port: server.address().port, method, path, headers: { 'Content-Type': 'application/json', ...(headers || {}) } }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ code: res.statusCode, body: d ? JSON.parse(d) : null, headers: res.headers }));
  });
  req.on('error', reject); if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body)); req.end();
});
// The fake controller: answers the next command the way index.html's applyCommand would.
const controllerAnswers = (pinOk, reason) => { const { clientId } = sent.at(-1); api.reply(clientId, pinOk ? { type: 'ack', ok: true } : { type: 'ack', ok: false, reason }); };

server.listen(0, '127.0.0.1', async () => {
  try {
    let r = await call('GET', '/api'); assert.strictEqual(r.code, 200); assert.ok(r.body.actions.includes('next'));
    r = await call('GET', '/api/state'); assert.strictEqual(r.code, 503);
    last = JSON.stringify({ type: 'state', state: { v: 1, running: true } });
    r = await call('GET', '/api/state'); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.state.running, true);
    r = await call('OPTIONS', '/api/next'); assert.strictEqual(r.code, 204); assert.strictEqual(r.headers['access-control-allow-origin'], '*');
    r = await call('GET', '/api/next'); assert.strictEqual(r.code, 405);
    r = await call('POST', '/api/explode'); assert.strictEqual(r.code, 404);
    assert.strictEqual(await api.handle({ url: '/index.html', method: 'GET', headers: {} }, {}), false, 'static paths are left alone');
    assert.strictEqual(await api.handle({ url: '/apiary.png', method: 'GET', headers: {} }, {}), false, 'only /api and /api/… are the API');

    // header PIN, query value
    let p = call('POST', '/api/nudge?value=60', { headers: { 'X-Pin': '1234' } });
    await new Promise(r => setTimeout(r, 20));
    assert.deepStrictEqual(sent.at(-1).msg, { type: 'command', id: 'http-' + sent.at(-1).clientId, action: 'nudge', value: 60, pin: '1234' });
    controllerAnswers(true); r = await p; assert.strictEqual(r.code, 200); assert.deepStrictEqual(r.body, { ok: true });

    // body PIN, wrong
    p = call('POST', '/api/next', { body: { pin: '0000' } }); await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(sent.at(-1).msg.pin, '0000');
    controllerAnswers(false, 'Wrong PIN'); r = await p; assert.strictEqual(r.code, 403); assert.strictEqual(r.body.reason, 'Wrong PIN');

    // message from the query string
    p = call('POST', '/api/message?text=Wrap+up&color=red&bold=1&pin=1234'); await new Promise(r => setTimeout(r, 20));
    assert.deepStrictEqual(sent.at(-1).msg.value, { text: 'Wrap up', color: 'red', bold: true, upper: false, flash: false });
    controllerAnswers(true); r = await p; assert.strictEqual(r.code, 200);

    // flags: only 1 / true / yes / on switch a flag on
    p = call('POST', '/api/message?text=Go&bold=0&upper=false&flash=on&pin=1234'); await new Promise(r => setTimeout(r, 20));
    assert.deepStrictEqual(sent.at(-1).msg.value, { text: 'Go', color: undefined, bold: false, upper: false, flash: true });
    controllerAnswers(true); await p;
    p = call('POST', '/api/message', { body: { text: 'Go', bold: true, pin: '1234' } }); await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(sent.at(-1).msg.value.bold, true); controllerAnswers(true); await p;

    // bodies: JSON null is an empty body, an oversized body is refused with an answer, bad JSON is 400
    p = call('POST', '/api/next', { body: 'null', headers: { 'X-Pin': '1234' } }); await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(sent.at(-1).msg.action, 'next'); controllerAnswers(true); r = await p; assert.strictEqual(r.code, 200);
    r = await call('POST', '/api/next', { body: 'x'.repeat(20000) }); assert.strictEqual(r.code, 413);
    r = await call('POST', '/api/next', { body: '{nope' }); assert.strictEqual(r.code, 400);

    // five wrong PINs within a minute lock control for the rest of the minute, for HTTP and phone remotes alike
    const sentBefore = sent.length;
    for (let i = 0; i < 4; i++) { p = call('POST', '/api/next', { headers: { 'X-Pin': '9999' } }); await new Promise(r => setTimeout(r, 20)); controllerAnswers(false, 'Wrong PIN'); r = await p; assert.strictEqual(r.code, 403); }
    api.noteWrongPin();   // a phone remote's wrong PIN, reported by main.js
    r = await call('POST', '/api/next', { headers: { 'X-Pin': '1234' } }); assert.strictEqual(r.code, 429); assert.match(r.body.reason, /Too many wrong PINs/);
    assert.strictEqual(sent.length, sentBefore + 4, 'a locked request never reaches the controller');
    assert.ok(api.lockedFor() > 0);
    clock += 61_000;
    assert.strictEqual(api.lockedFor(), 0, 'the lock expires with the window');
    const before = Date.now(); r = await call('POST', '/api/flash', { headers: { 'X-Pin': '1234' } });
    assert.strictEqual(r.code, 504); assert.ok(Date.now() - before >= 2900, 'waits for the controller before giving up');
    assert.strictEqual(api.reply(999, { ok: true }), false, 'a reply nobody waits for is ignored');
    console.log('electron/api.js: all checks passed');
    server.close();
  } catch (e) { console.error(e); server.close(); process.exit(1); }
});
