/* Friends-only real-time co-op prototype. Requires the Cloudflare Worker URL. */
(function () {
  'use strict';
  const STORE = 'idle-lineage-coop-settings-v1';
  const css = document.createElement('style');
  css.textContent = `
    #coop-launch{position:fixed;z-index:99989;left:14px;bottom:calc(var(--m-nav-h,0px) + 12px);border:1px solid #607d69;background:#18251f;color:#edf6ef;border-radius:8px;padding:10px 13px;font:600 13px system-ui;box-shadow:0 4px 18px #0009;cursor:pointer}
    #coop-overlay{display:none;position:fixed;inset:0;z-index:100030;background:#050908df;align-items:center;justify-content:center;padding:14px;color:#edf2e9;font:14px system-ui,sans-serif}
    #coop-overlay.open{display:flex}#coop-card{width:min(520px,100%);max-height:92vh;overflow:auto;background:#17211a;border:1px solid #56684c;border-radius:12px;padding:18px;box-shadow:0 16px 70px #000b}
    #coop-card header{display:flex;align-items:center;justify-content:space-between;gap:12px}#coop-card h2{font-size:18px;margin:0}#coop-close,#coop-card button{background:#29372b;color:#edf2e9;border:1px solid #4a5b47;border-radius:6px;padding:9px 12px;cursor:pointer;font:inherit}
    #coop-form{display:grid;gap:9px;margin-top:14px}#coop-form input{box-sizing:border-box;width:100%;background:#0d130f;color:#fff;border:1px solid #405041;border-radius:6px;padding:10px;font:inherit}
    #coop-actions{display:flex;gap:8px;flex-wrap:wrap}#coop-status{margin:14px 0;color:#c2d4b1;line-height:1.6}#coop-hp{height:14px;background:#332522;border-radius:99px;overflow:hidden}#coop-hp-fill{height:100%;width:100%;background:linear-gradient(90deg,#d34a39,#ed9b52);transition:width .25s}
    #coop-roomview{display:none;margin-top:14px}#coop-roomcode{font-size:24px;font-weight:800;letter-spacing:4px;color:#ffe3a1}#coop-players{line-height:1.8;color:#d6e3d1}#coop-hit{width:100%;margin-top:12px!important;min-height:52px;background:#516b39!important;font-weight:700!important;font-size:16px!important}
    #coop-note{font-size:11px;color:#a9b6a2;line-height:1.5;margin:10px 0 0}
    @media(max-width:650px){#coop-launch{left:10px;bottom:calc(var(--m-nav-h,0px) + 12px)}#coop-overlay{padding:0}#coop-card{height:100%;max-height:none;border-radius:0;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px calc(env(safe-area-inset-bottom,0px) + 16px)}}
  `;
  document.head.appendChild(css);
  const launch = document.createElement('button'); launch.id = 'coop-launch'; launch.type = 'button'; launch.textContent = '⚔ 好友共鬥';
  const overlay = document.createElement('div'); overlay.id = 'coop-overlay'; overlay.innerHTML = `
    <section id="coop-card" role="dialog" aria-modal="true" aria-label="好友即時共鬥">
      <header><h2>⚔ 好友即時共鬥</h2><button id="coop-close" type="button">關閉 ✕</button></header>
      <div id="coop-form">
        <input id="coop-api" type="url" placeholder="共鬥伺服器網址（由管理者設定）" autocomplete="url">
        <input id="coop-name" maxlength="16" placeholder="你的隊員名稱">
        <div id="coop-actions"><button id="coop-create" type="button">建立房間</button><input id="coop-code" maxlength="8" placeholder="輸入 8 碼房間碼" style="flex:1;min-width:150px;text-transform:uppercase"><button id="coop-join" type="button">加入</button></div>
      </div>
      <div id="coop-status" aria-live="polite">建立房間後，把房間碼分享給朋友。每個人需先建立自己的遊戲角色。</div>
      <div id="coop-roomview"><div>房間碼：<span id="coop-roomcode"></span></div><p id="coop-bossline">共鬥首領</p><div id="coop-hp"><div id="coop-hp-fill"></div></div><p id="coop-hptext"></p><div id="coop-players"></div><button id="coop-hit" type="button">攻擊共享首領</button></div>
      <p id="coop-note">即時共鬥原型：房間最多 4 人，大家共享首領血量。此測試版不發放經驗、金幣或掉落；房間碼僅供邀請朋友，請勿公開張貼。</p>
    </section>`;
  document.body.append(launch, overlay);
  const $ = id => overlay.querySelector('#' + id);
  let socket = null, roomCode = '', joining = false;
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch {}
  $('coop-api').value = settings.api || '';
  $('coop-name').value = (typeof player !== 'undefined' && player && player.name) || '';
  function setStatus(text) { $('coop-status').textContent = text; }
  function closeRoom() { joining = false; if (socket) { socket.close(); socket = null; } $('coop-roomview').style.display = 'none'; $('coop-form').style.display = 'grid'; }
  function connect(base, code) {
    const name = $('coop-name').value.trim() || ((typeof player !== 'undefined' && player.name) || '冒險者');
    let pid = localStorage.getItem(STORE + '-pid');
    if (!pid) { pid = crypto.randomUUID(); localStorage.setItem(STORE + '-pid', pid); }
    const wsBase = base.replace(/^http/i, 'ws').replace(/\/$/, '');
    socket = new WebSocket(wsBase + '/ws/' + encodeURIComponent(code) + '?name=' + encodeURIComponent(name) + '&pid=' + encodeURIComponent(pid));
    joining = true;
    socket.onopen = () => { roomCode = code; $('coop-form').style.display = 'none'; $('coop-roomview').style.display = 'block'; $('coop-roomcode').textContent = code; setStatus('已連線，等待房間資料…'); };
    socket.onmessage = event => {
      let msg; try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type !== 'state' || !msg.room) return;
      const room = msg.room, hp = Number(room.hp) || 0, max = Number(room.maxHp) || 1;
      $('coop-hp-fill').style.width = Math.max(0, Math.min(100, hp / max * 100)) + '%';
      $('coop-hptext').textContent = '首領 HP：' + hp.toLocaleString() + ' / ' + max.toLocaleString();
      $('coop-players').textContent = '隊員：' + Object.values(room.players || {}).join('、');
      if (msg.notice) setStatus(msg.notice);
      else if (msg.lastHit) setStatus(msg.lastHit.name + ' 造成 ' + msg.lastHit.damage + ' 點傷害。');
      else setStatus('房間 ' + roomCode + ' · 共擊敗 ' + (room.defeated || 0) + ' 隻首領');
    };
    socket.onerror = () => setStatus('連線失敗。確認伺服器網址正確並已部署。');
    socket.onclose = () => { if (joining) { joining = false; setStatus('連線已中斷。'); } };
  }
  launch.onclick = () => { overlay.classList.add('open'); };
  $('coop-close').onclick = () => { overlay.classList.remove('open'); closeRoom(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('open'); closeRoom(); } });
  $('coop-api').onchange = () => { settings.api = $('coop-api').value.trim().replace(/\/$/, ''); localStorage.setItem(STORE, JSON.stringify(settings)); };
  $('coop-create').onclick = async () => {
    const base = $('coop-api').value.trim().replace(/\/$/, '');
    if (!/^https:\/\//i.test(base)) return setStatus('請先輸入管理者提供的 https:// 共鬥伺服器網址。');
    try {
      const response = await fetch(base + '/rooms', { method: 'POST' });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || '建立房間失敗');
      connect(base, data.room);
    } catch (err) { setStatus('建立房間失敗：' + err.message); }
  };
  $('coop-join').onclick = () => {
    const base = $('coop-api').value.trim().replace(/\/$/, ''), code = $('coop-code').value.trim().toUpperCase();
    if (!/^https:\/\//i.test(base)) return setStatus('請先輸入管理者提供的 https:// 共鬥伺服器網址。');
    if (!/^[A-Z0-9]{8}$/.test(code)) return setStatus('房間碼需為 8 個英數字。');
    connect(base, code);
  };
  $('coop-hit').onclick = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const d = (typeof player !== 'undefined' && player && player.d) || {};
    const raw = Number(d.meleeDmg || d.rangedDmg || d.magicDmg || 8);
    const damage = Math.max(1, Math.min(80, Math.floor(raw + Math.random() * Math.max(1, raw * 0.15))));
    socket.send(JSON.stringify({ type: 'attack', damage }));
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) { overlay.classList.remove('open'); closeRoom(); } });
})();

