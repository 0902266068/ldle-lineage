const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, mode: 'friends-only-coop' });
    if (request.method === 'POST' && url.pathname === '/rooms') {
      const room = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
      const id = env.ROOMS.idFromName(room);
      const stub = env.ROOMS.get(id);
      const created = await stub.fetch('https://room/init', { method: 'POST' });
      if (!created.ok) return json({ error: '建立房間失敗' }, 500);
      return json({ room });
    }
    const match = url.pathname.match(/^\/ws\/([A-Z0-9]{8})$/i);
    if (match && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const id = env.ROOMS.idFromName(match[1].toUpperCase());
      return env.ROOMS.get(id).fetch(request);
    }
    return json({ error: '找不到 API 路徑' }, 404);
  }
};

export class CoopRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.room = null;
  }
  async load() {
    if (!this.room) this.room = await this.ctx.storage.get('room') || null;
    return this.room;
  }
  async save() { await this.ctx.storage.put('room', this.room); }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/init') {
      if (!await this.load()) {
        this.room = { hp: 10000, maxHp: 10000, boss: '共鬥首領', players: {}, defeated: 0 };
        await this.save();
      }
      return new Response('ok');
    }
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: '無效請求' }, 400);
    await this.load();
    if (!this.room) return json({ error: '房間不存在或已失效' }, 404);
    const name = (url.searchParams.get('name') || '冒險者').trim().slice(0, 16) || '冒險者';
    const pid = (url.searchParams.get('pid') || '').slice(0, 40);
    if (!pid) return json({ error: '缺少玩家識別碼' }, 400);
    const peers = this.ctx.getWebSockets();
    const existing = peers.map(ws => ws.deserializeAttachment()?.pid).filter(Boolean);
    if (!existing.includes(pid) && new Set(existing).size >= 4) return json({ error: '房間最多 4 位玩家' }, 409);
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ pid, name, lastAttack: 0 });
    this.room.players[pid] = name;
    await this.save();
    server.send(JSON.stringify({ type: 'state', room: this.room }));
    this.broadcast({ type: 'state', room: this.room });
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, message) {
    let data;
    try { data = JSON.parse(message); } catch { return; }
    const attachment = ws.deserializeAttachment() || {};
    if (data.type !== 'attack' || !attachment.pid) return;
    const now = Date.now();
    if (now - (attachment.lastAttack || 0) < 450) return;
    attachment.lastAttack = now;
    ws.serializeAttachment(attachment);
    await this.load();
    if (!this.room || this.room.hp <= 0) return;
    // Prototype room: damage is intentionally capped and no character rewards are issued.
    const damage = Math.max(1, Math.min(80, Math.floor(Number(data.damage) || 1)));
    this.room.hp = Math.max(0, this.room.hp - damage);
    if (this.room.hp === 0) this.room.defeated++;
    await this.save();
    this.broadcast({ type: 'state', room: this.room, lastHit: { name: attachment.name, damage } });
    if (this.room.hp === 0) {
      const round = this.room.defeated;
      setTimeout(async () => {
        await this.load();
        if (this.room && this.room.defeated === round && this.room.hp === 0) {
          this.room.hp = this.room.maxHp;
          await this.save();
          this.broadcast({ type: 'state', room: this.room, notice: '首領重新出現！' });
        }
      }, 3500);
    }
  }
  async webSocketClose(ws) {
    const attachment = ws.deserializeAttachment() || {};
    await this.remove(attachment.pid);
  }
  async webSocketError(ws) {
    const attachment = ws.deserializeAttachment() || {};
    await this.remove(attachment.pid);
  }
  async remove(pid) {
    if (!pid) return;
    await this.load();
    if (!this.room) return;
    const stillConnected = this.ctx.getWebSockets().some(ws => ws.deserializeAttachment()?.pid === pid);
    if (!stillConnected) delete this.room.players[pid];
    await this.save();
    this.broadcast({ type: 'state', room: this.room });
  }
  broadcast(data) {
    const payload = JSON.stringify(data);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* connection is already closing */ }
    }
  }
}

