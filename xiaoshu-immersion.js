/* Mobile landscape battle HUD for the separate refreshed build. */
(() => {
  'use strict';
  const css = `
@media (pointer:coarse) and (orientation:landscape) {
  body.xiaoshu-immersive #game-screen { padding:0!important; overflow:hidden!important; background:#080907!important; }
  body.xiaoshu-immersive #col-center { position:absolute!important; inset:0!important; width:100%!important; height:100dvh!important; max-width:none!important; padding:0!important; margin:0!important; gap:0!important; }
  body.xiaoshu-immersive #map-view-panel { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; min-height:0!important; padding:0!important; margin:0!important; border:0!important; border-radius:0!important; background:transparent!important; overflow:hidden!important; }
  body.xiaoshu-immersive #map-view-panel>.panel-header, body.xiaoshu-immersive #log-row { display:none!important; }
  body.xiaoshu-immersive #battle-view, body.xiaoshu-immersive #battle-view.area-fit:not(.hidden) { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; max-width:none!important; max-height:none!important; min-height:0!important; aspect-ratio:auto!important; padding:0!important; margin:0!important; border:0!important; border-radius:0!important; display:flex!important; align-items:flex-end!important; justify-content:center!important; overflow:hidden!important; }
  body.xiaoshu-immersive #status-icon-bar { position:absolute!important; top:56px!important; left:8px!important; z-index:30!important; }
  body.xiaoshu-immersive #mob-list { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; align-items:flex-end!important; padding:0 58px 8px 8px!important; }
  body.xiaoshu-immersive #town-view:not(.hidden) { position:absolute!important; inset:0!important; z-index:3!important; width:100%!important; height:100%!important; padding:4px!important; background:transparent!important; }
  body.xiaoshu-immersive #mobile-vitals { position:fixed!important; top:7px!important; left:8px!important; z-index:80!important; width:min(270px,42vw)!important; padding:5px 8px!important; border:1px solid #ae8b4a!important; border-radius:8px!important; background:linear-gradient(110deg,#111516eF,#20231dde)!important; box-shadow:0 3px 12px #000b!important; }
  body.xiaoshu-immersive #mobile-vitals .mv-bars { gap:3px!important; }
  body.xiaoshu-immersive #m-nav { left:auto!important; right:6px!important; top:50%!important; bottom:auto!important; transform:translateY(-50%)!important; width:48px!important; height:auto!important; display:flex!important; flex-direction:column!important; gap:3px!important; padding:5px!important; border:1px solid #a78343!important; border-radius:10px!important; background:#10151ddd!important; box-shadow:0 4px 15px #000b!important; }
  body.xiaoshu-immersive #m-nav .m-nav-btn { flex:none!important; width:36px!important; min-height:38px!important; padding:4px 1px!important; border:1px solid #594729!important; border-radius:6px!important; color:#e1d2b1!important; font-size:10px!important; line-height:1.1!important; }
  body.xiaoshu-immersive #m-nav .m-nav-btn.on { color:#ffe09a!important; background:#62491eaa!important; }
  body.xiaoshu-immersive #xiaoshu-hud { position:fixed; z-index:70; top:5px; left:50%; transform:translateX(-50%); max-width:35vw; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; padding:4px 12px; border:1px solid #8a6b36; border-radius:20px; background:#111512d9; color:#f0d58f; font:600 12px system-ui; text-shadow:0 1px 2px #000; pointer-events:none; }
  body.xiaoshu-immersive #xiaoshu-hotbar { position:fixed; z-index:70; left:50%; bottom:7px; transform:translateX(-50%); display:flex; gap:5px; padding:5px 7px; border:1px solid #927444; border-radius:10px; background:#111512e8; box-shadow:0 3px 12px #000b; }
  body.xiaoshu-immersive .xg-slot { width:42px; height:40px; border:1px solid #594729; border-radius:6px; background:linear-gradient(145deg,#343125,#171812); color:#f3e6c5; font:700 9px system-ui; text-align:center; line-height:1.1; }
  body.xiaoshu-immersive .xg-slot:active { background:#705526; transform:scale(.96); }
  body.xiaoshu-immersive #m-log-sheet { z-index:100!important; }
}
`;
  function install() {
    if (!document.getElementById('xiaoshu-immersive-style')) {
      const style = document.createElement('style'); style.id = 'xiaoshu-immersive-style'; style.textContent = css; document.head.appendChild(style);
    }
    const game = document.getElementById('game-screen');
    if (!game) return;
    let hud = document.getElementById('xiaoshu-hud');
    if (!hud) { hud = document.createElement('div'); hud.id = 'xiaoshu-hud'; game.appendChild(hud); }
    let hotbar = document.getElementById('xiaoshu-hotbar');
    if (!hotbar) {
      hotbar = document.createElement('div'); hotbar.id = 'xiaoshu-hotbar';
      const slots = [['AUTO',null],['紅水','potion_heal'],['強力水','potion_strong'],['EXP','potion_exp150']];
      slots.forEach(([label,id]) => {
        const b = document.createElement('button'); b.type='button'; b.className='xg-slot'; b.textContent=label;
        b.addEventListener('click', () => {
          if (id) { const item=(typeof player!=='undefined'&&player.inv||[]).find(x=>x.id===id); if(item&&typeof useItem==='function') useItem(item.uid); }
          else if (typeof state!=='undefined') { state.running=!state.running; b.textContent=state.running?'AUTO':'暫停'; }
        });
        hotbar.appendChild(b);
      });
      game.appendChild(hotbar);
    }
    const sync = () => {
      const immersive=document.body.classList.contains('m-mobile') && matchMedia('(pointer:coarse) and (orientation:landscape)').matches;
      document.body.classList.toggle('xiaoshu-immersive',immersive);
      const map=document.getElementById('map-select');
      const name=document.getElementById('st-class');
      hud.textContent=(name?.textContent||'冒險者')+'　·　'+(map?.selectedOptions?.[0]?.textContent||'日出之國');
      const auto=hotbar.querySelector('.xg-slot');
      if(auto&&typeof state!=='undefined')auto.textContent=state.running?'AUTO':'暫停';
    };
    sync();
    window.__xiaoshuHudSync=sync;
    if (!window.__xiaoshuHudTimer) window.__xiaoshuHudTimer=setInterval(()=>window.__xiaoshuHudSync?.(),800);
    if (!window.__xiaoshuResizeBound) { window.addEventListener('resize',()=>window.__xiaoshuHudSync?.(),{passive:true}); window.__xiaoshuResizeBound=true; }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  setTimeout(install,600);
})();
