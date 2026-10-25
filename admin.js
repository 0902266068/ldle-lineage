/* Local game-master console for the supplied single-player build.
   Overrides are kept separately from upstream game data in this browser. */
(function () {
  'use strict';
  const STORE_KEY = 'idle-lineage-admin-overrides-v1';
  const dataSets = {
    items: { title: '物品與裝備', read: () => DB.items, canCreate: true },
    mobs: { title: '怪物設定', read: () => DB.mobs, canCreate: true },
    maps: { title: '地圖出怪池', read: () => DB.maps, canCreate: false },
    drops: { title: '怪物掉落表', read: () => MOB_DROPS, canCreate: true }
  };
  const source = {
    items: structuredClone(DB.items), mobs: structuredClone(DB.mobs),
    maps: structuredClone(DB.maps), drops: structuredClone(MOB_DROPS), exp: [...EXP_T]
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  function applyPatch(patch) {
    for (const key of ['items', 'mobs', 'maps', 'drops']) {
      const target = key === 'drops' ? MOB_DROPS : DB[key];
      for (const [id, value] of Object.entries(patch[key] || {})) {
        if (value === null) delete target[id];
        else target[id] = clone(value);
      }
    }
    if (Array.isArray(patch.exp) && patch.exp.length) EXP_T.splice(0, EXP_T.length, ...patch.exp.map(Number));
  }
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); applyPatch(saved); } catch (err) { console.warn('[管理台] 自訂資料無法載入，沿用原始資料。', err); }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const mapTitle = id => {
    for (const region of (typeof MAP_REGIONS !== 'undefined' ? MAP_REGIONS : [])) {
      const entry = (region.maps || []).find(map => map.v === id);
      if (entry) return entry.t;
    }
    return id;
  };
  const styles = `
    #afk-admin-launch{position:fixed;z-index:99990;right:14px;top:14px;border:1px solid #64734f;background:#1d281f;color:#e7e9df;border-radius:7px;padding:9px 13px;font:600 13px system-ui;box-shadow:0 4px 18px #0008;cursor:pointer}
    #afk-admin-launch:hover{background:#34452f;border-color:#a6bf78}
    #afk-admin-overlay{position:fixed;inset:0;z-index:100000;background:#080b09df;display:none;align-items:center;justify-content:center;padding:14px;font:14px system-ui,-apple-system,"Segoe UI",sans-serif;color:#e9ecdf}
    #afk-admin-overlay.open{display:flex}
    #afk-admin-window{width:min(1120px,100%);height:min(800px,100%);background:#151b17;border:1px solid #465343;border-radius:10px;box-shadow:0 20px 80px #000b;display:grid;grid-template-rows:auto 1fr;overflow:hidden}
    #afk-admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;border-bottom:1px solid #374137;background:#1a211c}
    #afk-admin-head h2{font-size:16px;margin:0 0 4px}#afk-admin-head small{color:#a3ad9c;font-size:11px}
    .afk-admin-close{background:transparent;border:1px solid #4b584c;border-radius:5px;color:#e6eadf;padding:7px 10px;cursor:pointer}
    .afk-admin-mobile-close{display:none}
    #afk-admin-body{display:grid;grid-template-columns:185px 1fr;min-height:0}
    #afk-admin-nav{padding:12px 9px;border-right:1px solid #303b31;overflow:auto}
    .afk-admin-navbtn{width:100%;text-align:left;background:transparent;color:#b1bbad;border:0;border-radius:5px;padding:10px 11px;margin-bottom:3px;cursor:pointer;font:inherit;font-size:13px}
    .afk-admin-navbtn:hover,.afk-admin-navbtn.active{background:#2a382c;color:#c5db95}
    #afk-admin-main{padding:17px;overflow:auto;min-width:0}
    .afk-admin-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px;flex-wrap:wrap}
    .afk-admin-actions{display:flex;gap:7px;flex-wrap:wrap}
    .afk-admin-btn{background:#29342b;color:#e7ebdf;border:1px solid #465343;border-radius:5px;padding:8px 11px;cursor:pointer;font:inherit;font-size:12px}
    .afk-admin-btn:hover{background:#354737}.afk-admin-btn.primary{background:#778e57;border-color:#91a870;color:#10150e;font-weight:700}.afk-admin-btn.danger{color:#e1a18e}
    .afk-admin-search{min-width:min(260px,100%);background:#101511;border:1px solid #3a453b;border-radius:5px;color:#edf0e6;padding:9px 10px;font:inherit;font-size:12px}
    .afk-admin-note{color:#9ca797;font-size:11px;margin:0 0 12px;line-height:1.6}
    .afk-admin-tablewrap{overflow:auto;border:1px solid #303b31;border-radius:6px}
    .afk-admin-table{border-collapse:collapse;width:100%;font-size:12px}.afk-admin-table th{text-align:left;color:#a8b19e;background:#1d251f;font-weight:500;position:sticky;top:0}
    .afk-admin-table th,.afk-admin-table td{padding:10px 11px;border-bottom:1px solid #2b352c;white-space:nowrap}.afk-admin-table tr:last-child td{border:0}.afk-admin-table td:first-child{max-width:320px;overflow:hidden;text-overflow:ellipsis}
    .afk-admin-id{font:11px ui-monospace,Consolas,monospace;color:#8d998a}.afk-admin-status{color:#aeb8a8;font-size:11px}
    #afk-admin-editor{position:fixed;inset:0;z-index:100010;background:#050706c9;display:none;align-items:center;justify-content:center;padding:16px}
    #afk-admin-editor.open{display:flex}.afk-admin-editbox{width:min(740px,100%);max-height:92vh;background:#18201a;border:1px solid #50604d;border-radius:9px;padding:18px;display:grid;grid-template-rows:auto auto 1fr auto;gap:12px}
    .afk-admin-editbox h3{margin:0;font-size:15px}.afk-admin-editbox label{font-size:11px;color:#aeb8a8}.afk-admin-editbox input,.afk-admin-editbox textarea{width:100%;box-sizing:border-box;background:#0f1410;border:1px solid #3c493d;color:#edf0e6;border-radius:5px;padding:10px;font:12px ui-monospace,Consolas,monospace}
    .afk-admin-editbox textarea{resize:vertical;min-height:220px;line-height:1.5}.afk-admin-editbox .field{display:grid;gap:6px}.afk-admin-editbox footer{display:flex;justify-content:space-between;gap:8px;align-items:center}
    .afk-admin-toast{position:fixed;z-index:100020;bottom:20px;left:50%;transform:translateX(-50%);background:#d4e0bc;color:#182017;border-radius:6px;padding:10px 15px;box-shadow:0 4px 20px #0008}
    .afk-char-picker{display:grid;gap:9px}.afk-char-categories{display:flex;flex-wrap:wrap;gap:6px}.afk-char-categories .afk-admin-btn{padding:7px 10px}.afk-char-item-search{display:grid;gap:5px;font-size:11px;color:#aab4a5}.afk-char-item-search input{width:100%;box-sizing:border-box;background:#0e130f;border:1px solid #3c493d;color:#edf0e6;border-radius:5px;padding:9px;font:inherit;font-size:12px}.afk-char-card{border:1px solid #354136;background:#1b231d;border-radius:7px;padding:14px;margin:12px 0}.afk-char-card h3{font-size:13px;margin:0 0 10px}.afk-char-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.afk-char-form label{display:grid;gap:5px;font-size:11px;color:#aab4a5}.afk-char-form input,.afk-char-form select,.afk-char-add select,.afk-char-add input{min-width:0;background:#0e130f;border:1px solid #3c493d;color:#edf0e6;border-radius:5px;padding:8px;font:inherit;font-size:12px}.afk-char-add{display:grid;grid-template-columns:minmax(0,2fr) repeat(2,minmax(65px,.5fr)) auto;gap:7px;align-items:end}.afk-char-list{display:grid;gap:7px}.afk-char-row{display:grid;grid-template-columns:minmax(110px,1.5fr) 65px 65px 90px 78px 30px;gap:6px;align-items:center;border:1px solid #303b31;background:#19211b;border-radius:6px;padding:8px}.afk-char-row .name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.afk-char-row input,.afk-char-row select{width:100%;min-width:0;background:#0e130f;border:1px solid #3c493d;color:#edf0e6;border-radius:4px;padding:6px;font:inherit;font-size:11px}.afk-char-row .flag{font-size:10px;color:#aab4a5;text-align:center}.afk-char-row button{border:0;background:transparent;color:#dc9384;font-size:17px;cursor:pointer}.afk-char-labels{display:grid;grid-template-columns:minmax(110px,1.5fr) 65px 65px 90px 78px 30px;gap:6px;padding:4px 8px;color:#929d8f;font-size:10px}.afk-char-empty{padding:20px;text-align:center;color:#929d8f}.afk-char-warning{border:1px solid #8a5d36;background:#392a1c;color:#eed1a7;border-radius:6px;padding:11px;font-size:12px;line-height:1.5}
    .afk-char-item-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:7px;max-height:300px;overflow:auto;padding:2px}.afk-char-item-option{display:grid;gap:4px;text-align:left;min-width:0;padding:9px 10px;border:1px solid #39463a;border-radius:6px;background:#111812;color:#e9ecdf;cursor:pointer}.afk-char-item-option:hover{border-color:#849c68;background:#202b21}.afk-char-item-option.selected{border-color:#adc77d;background:#34452f;box-shadow:inset 0 0 0 1px #adc77d}.afk-char-item-option .item-name,.afk-char-item-option .item-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.afk-char-item-option .item-name{font-size:12px}.afk-char-item-option .item-meta{color:#9daa96;font-size:10px}.afk-char-picker-title{font-size:12px;color:#dbe5cf}.afk-char-picked{align-self:center;color:#c9d9b4;font-size:12px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    @media(max-width:650px){#afk-admin-overlay{padding:0}#afk-admin-window{height:100%;border-radius:0}#afk-admin-body{grid-template-columns:1fr;grid-template-rows:auto 1fr}#afk-admin-nav{display:flex;gap:4px;border-right:0;border-bottom:1px solid #303b31;padding:7px;overflow-x:auto}.afk-admin-navbtn{white-space:nowrap;width:auto;margin:0;padding:9px}.afk-admin-navbtn span{display:none}#afk-admin-main{padding:12px 12px 76px}.afk-admin-mobile-close{display:block;position:fixed;z-index:100005;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);width:calc(100% - 24px);min-height:48px;border:1px solid #82966d;border-radius:8px;background:#34452f;color:#f0f3e8;font:600 15px system-ui;box-shadow:0 4px 20px #000b;cursor:pointer}.afk-admin-toolbar{align-items:stretch}.afk-admin-search{width:100%;min-width:0}.afk-admin-table td:first-child{max-width:170px}#afk-admin-launch{top:auto;bottom:calc(var(--m-nav-h, 0px) + 12px);right:10px}.afk-char-form{grid-template-columns:repeat(2,minmax(0,1fr))}.afk-char-add{grid-template-columns:minmax(0,1fr) 70px 70px}.afk-char-add button{grid-column:1/-1}.afk-char-row,.afk-char-labels{grid-template-columns:minmax(90px,1.5fr) 52px 52px 77px 67px 24px;gap:4px}.afk-char-row{padding:6px}.afk-char-labels{padding:4px 6px}.afk-char-row input,.afk-char-row select{padding:6px 3px;font-size:10px}}
  `;
  const style = document.createElement('style'); style.textContent = styles; document.head.appendChild(style);
  const launcher = document.createElement('button'); launcher.id = 'afk-admin-launch'; launcher.type = 'button'; launcher.textContent = '⚙ 管理台';
  const overlay = document.createElement('div'); overlay.id = 'afk-admin-overlay'; overlay.innerHTML = `
    <section id="afk-admin-window" role="dialog" aria-modal="true" aria-label="遊戲管理台">
      <header id="afk-admin-head"><div><h2>遊戲管理台</h2><small>本機資料管理 · 變更會保存在此瀏覽器，重新整理後仍有效</small></div><button class="afk-admin-close" type="button">關閉　✕</button></header>
      <div id="afk-admin-body"><nav id="afk-admin-nav"></nav><main id="afk-admin-main"></main></div>
    </section>
    <button class="afk-admin-mobile-close" type="button" aria-label="關閉管理台並返回遊戲">返回遊戲　✕</button>
    <div id="afk-admin-editor"><section class="afk-admin-editbox" role="dialog" aria-modal="true"><h3 id="afk-admin-edit-title"></h3><div class="field" id="afk-admin-key-wrap"><label for="afk-admin-key">資料 ID／怪物名稱</label><input id="afk-admin-key" autocomplete="off"></div><div class="field"><label for="afk-admin-json">資料內容（JSON）</label><textarea id="afk-admin-json" spellcheck="false"></textarea></div><footer><button class="afk-admin-btn danger" id="afk-admin-delete" type="button">刪除此筆</button><div><button class="afk-admin-btn" id="afk-admin-cancel" type="button">取消</button> <button class="afk-admin-btn primary" id="afk-admin-save" type="button">儲存</button></div></footer></section></div>
  `;
  document.body.append(launcher, overlay);
  const nav = overlay.querySelector('#afk-admin-nav'), main = overlay.querySelector('#afk-admin-main'), editor = overlay.querySelector('#afk-admin-editor');
  let active = 'characters', query = '', editing = null;
  let characterSlot = 1, characterDraft = null, characterDraftError = '', characterItemCategory = 'all', characterItemSubcategory = 'all', characterItemSearch = '', characterSelectedItem = '';
  const navItems = [
    ['characters','🪙','角色／金幣裝備'], ['items','⚔','物品與裝備'], ['mobs','☠','怪物設定'], ['maps','🗺','地圖出怪池'], ['drops','◇','怪物掉落表'], ['exp','✦','升級經驗表'], ['backup','⇅','匯入／匯出']
  ];
  nav.innerHTML = navItems.map(([key,icon,label]) => `<button class="afk-admin-navbtn" data-page="${key}"><span>${icon}　</span>${label}</button>`).join('');
  const toast = text => { const old=document.querySelector('.afk-admin-toast'); if(old)old.remove(); const el=document.createElement('div');el.className='afk-admin-toast';el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),2400); };
  function diffTable(base, current) {
    const out={};
    for(const id of new Set([...Object.keys(base),...Object.keys(current)])) {
      if(!(id in current)) out[id]=null;
      else if(!(id in base)||JSON.stringify(base[id])!==JSON.stringify(current[id])) out[id]=clone(current[id]);
    }
    return out;
  }
  function persist() {
    const next={items:diffTable(source.items,DB.items),mobs:diffTable(source.mobs,DB.mobs),maps:diffTable(source.maps,DB.maps),drops:diffTable(source.drops,MOB_DROPS)};
    if(JSON.stringify(source.exp)!==JSON.stringify(EXP_T)) next.exp=[...EXP_T];
    try { localStorage.setItem(STORE_KEY,JSON.stringify(next)); saved=next; }
    catch(err) { toast('瀏覽器儲存空間不足，請先匯出備份後整理存檔。'); throw err; }
  }
  function setPage(key) { active=key;query='';nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.page===key));render(); }
  function summary(key,id,value) {
    if(key==='items') return [value.type||'物品', value.dmgS!=null?`傷害 ${value.dmgS}/${value.dmgL}`:'', value.ac!=null?`防禦 ${value.ac}`:'', value.p!=null?`售價 ${value.p}`:''].filter(Boolean).join(' · ');
    if(key==='mobs') return [`Lv.${value.lv??'?'}`,`HP ${value.hp??'?'}`,`EXP ${value.exp??'?'}`,value.boss?'頭目':''].filter(Boolean).join(' · ');
    if(key==='maps') return `${(Array.isArray(value)?value:[]).length} 種怪物 · ${(Array.isArray(value)?value:[]).slice(0,5).map(mid=>DB.mobs[mid]?.n||mid).join('、')}`;
    if(key==='drops') return `${(Array.isArray(value)?value:[]).length} 項掉落`;
    return '';
  }
  function records(key) {
    if(key==='exp') return [];
    const obj=dataSets[key].read();
    return Object.entries(obj).map(([id,value])=>({id,value,label:key==='maps'?mapTitle(id):(value?.n||id)})).sort((a,b)=>a.label.localeCompare(b.label,'zh-Hant'));
  }
  function render() {
    if(active==='characters'){renderCharacters();return;}
    if(active==='backup'){renderBackup();return;}
    if(active==='exp'){renderExp();return;}
    const cfg=dataSets[active], rows=records(active).filter(row=>(row.label+' '+row.id).toLowerCase().includes(query.toLowerCase()));
    const note=active==='maps'?'編輯每張地圖的怪物 ID 陣列；地圖名稱與區域仍由遊戲原始地圖索引管理。':active==='drops'?'掉落機率沿用遊戲原始單位。每筆格式為 [物品 ID, 機率]，例如 [["item_id", 0.5]]。':'可以編輯完整 JSON 欄位；欄位名稱請保持原樣，避免遊戲公式找不到設定。';
    main.innerHTML=`<div class="afk-admin-toolbar"><input class="afk-admin-search" id="afk-admin-search" placeholder="搜尋名稱或 ID" value="${escapeHtml(query)}"><div class="afk-admin-actions">${cfg.canCreate?'<button class="afk-admin-btn primary" id="afk-admin-add">＋ 新增資料</button>':''}<button class="afk-admin-btn" id="afk-admin-reset">還原此分類</button></div></div><p class="afk-admin-note">${note}　共 ${rows.length} 筆。</p><div class="afk-admin-tablewrap"><table class="afk-admin-table"><thead><tr><th>名稱</th><th>ID</th><th>資料摘要</th><th>操作</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${escapeHtml(row.label)}</td><td class="afk-admin-id">${escapeHtml(row.id)}</td><td>${escapeHtml(summary(active,row.id,row.value))}</td><td><button class="afk-admin-btn" data-edit="${escapeHtml(row.id)}">編輯 JSON</button></td></tr>`).join('')||'<tr><td colspan="4">沒有符合的資料</td></tr>'}</tbody></table></div>`;
    main.querySelector('#afk-admin-search').oninput=e=>{query=e.target.value;render()};
    main.querySelector('#afk-admin-reset').onclick=()=>resetCategory(active);
    const add=main.querySelector('#afk-admin-add'); if(add)add.onclick=()=>openEditor(null);
    main.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>openEditor(button.dataset.edit));
  }
  function slotKey(slot){return 'lineage_idle_save_'+String(slot);}
  function isActiveSlot(slot){
    return Number(typeof currentSlot!=='undefined'?currentSlot:0)===Number(slot)&&typeof player!=='undefined'&&!!player?.cls;
  }
  function isVisibleGame(){
    const screen=document.getElementById('game-screen');return !!screen&&!screen.classList.contains('hidden');
  }
  function slotConflict(slot){
    try{return typeof _roleOtherActiveSessions==='function'&&_roleOtherActiveSessions().some(s=>Number(s.slot)===Number(slot));}
    catch{return false;}
  }
  function readCharacter(slot){
    if(isActiveSlot(slot)) return {data:{v:typeof SAVE_VERSION!=='undefined'?SAVE_VERSION:1,p:clone(player),ms:clone(mapState),ticks:state.ticks},active:isVisibleGame(),runtime:true};
    const raw=typeof _lzGet==='function'?_lzGet(slotKey(slot)):localStorage.getItem(slotKey(slot));
    if(raw==null)return {empty:true};
    const un=typeof _saveUnwrap==='function'?_saveUnwrap(raw):{payload:raw,signed:false,ok:true};
    if(un.signed&&!un.ok)throw Error('存檔簽章校驗失敗，請先用遊戲匯出備份並以原始存檔還原。');
    const data=JSON.parse(un.payload);
    if(!data?.p?.cls)throw Error('這個存檔不是有效角色資料。');
    if(!Array.isArray(data.p.inv))data.p.inv=[];
    if(!data.p.eq||typeof data.p.eq!=='object')data.p.eq={};
    return {data,active:false,runtime:false};
  }
  function escapeAttr(value){return escapeHtml(value).replace(/`/g,'&#96;');}
  function charItemRows(list,scope){
    if(!list.length)return `<div class="afk-char-empty">${scope==='inv'?'背包目前沒有物品':'目前沒有已裝備物品'}</div>`;
    const rows=list.map((entry,index)=>{
      const inst=scope==='eq'?entry.inst:entry;
      if(!inst)return '';
      const def=DB.items[inst.id]||{},label=def.n||inst.id,bless=inst.bless==='cursed'?'cursed':inst.bless?'true':'false';
      const indexAttr=scope==='eq'?`data-slot="${escapeAttr(entry.slot)}"`:`data-index="${index}"`;
      const amount=scope==='inv'?`<input aria-label="數量" type="number" min="1" max="999999" value="${Math.max(1,Number(inst.cnt)||1)}" data-char-scope="${scope}" data-char-field="cnt" ${indexAttr}>`:'<span class="flag">裝備</span>';
      return `<div class="afk-char-row"><span class="name" title="${escapeAttr(label)}">${escapeHtml(label)}${Number(inst.en)>0?' +'+Number(inst.en):''}</span>${amount}<input aria-label="強化值" type="number" min="-1" max="30" value="${Number(inst.en)||0}" data-char-scope="${scope}" data-char-field="en" ${indexAttr}><select aria-label="祝福狀態" data-char-scope="${scope}" data-char-field="bless" ${indexAttr}><option value="false" ${bless==='false'?'selected':''}>普通</option><option value="true" ${bless==='true'?'selected':''}>祝福</option><option value="cursed" ${bless==='cursed'?'selected':''}>詛咒</option></select><label class="flag"><input type="checkbox" data-char-scope="${scope}" data-char-field="anc" ${inst.anc?'checked':''} ${indexAttr}>遠古</label><button type="button" title="${scope==='eq'?'取下裝備':'移除物品'}" data-char-remove="${scope}" ${indexAttr}>×</button></div>`;
    }).join('');
    return `<div class="afk-char-labels"><span>${scope==='eq'?'裝備欄位':'物品'}</span><span>${scope==='inv'?'數量':'狀態'}</span><span>強化</span><span>祝福</span><span>遠古</span><span></span></div><div class="afk-char-list">${rows}</div>`;
  }
  function charRowsFromDraft(scope){
    if(scope==='inv')return characterDraft.data.p.inv;
    return Object.entries(characterDraft.data.p.eq||{}).filter(([,value])=>!!value).map(([slot,value])=>({slot,inst:value}));
  }
  function adminItemCategory(id,def){
    if(['wpn','arm','acc'].includes(def?.type))return def.type;
    if(def?.type==='pot')return 'pot';
    if(def?.type==='skillbk'||/^bk_|^mem_/.test(id))return 'skillbk';
    if(def?.type==='scroll'||/^scroll_/.test(id)||/卷軸/.test(def?.n||''))return 'scroll';
    if(def?.type==='etc'||/^mat_/.test(id)||/^new_item_/.test(id))return 'mat';
    if(def?.type==='quest'||/^quest_/.test(id))return 'quest';
    return 'other';
  }
  function adminItemSubcategory(id,def,category=characterItemCategory){
    if(category==='wpn'){
      try{const tags=typeof getWeaponTags==='function'?getWeaponTags(id):[];for(const type of ['弓','單手劍','雙手劍','匕首','矛','雙刀','鋼爪','魔杖','單手鈍器','雙手鈍器','雙斧','奇古獸','鎖鏈劍'])if(tags.includes(type))return type;}catch{}
      if(def?.isBow)return '弓';if(def?.w2h)return '雙手劍';return '其他武器';
    }
    const slot=String(def?.slot||'');
    const slots={helm:'頭盔',armor:'盔甲',gloves:'手套',boots:'長靴',cloak:'斗篷',shield:'盾牌',shin:'脛甲',tshirt:'內衣',belt:'腰帶',ring:'戒指',amulet:'項鍊',ear:'耳環',doll:'娃娃',petarm:'寵物防具',petwpn:'寵物武器',wpn:'主手武器',offwpn:'副手武器'};
    if(category==='arm'||category==='acc')return slots[slot]||'其他部位';
    return '';
  }
  function adminSubcategoryOptions(category){
    if(!['wpn','arm','acc'].includes(category))return [];
    const counts=new Map();for(const [id,d] of Object.entries(DB.items))if(adminItemCategory(id,d)===category){const name=adminItemSubcategory(id,d,category);counts.set(name,(counts.get(name)||0)+1);}
    return [...counts.keys()].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  }
  const adminItemCategories=[['all','全部'],['wpn','武器'],['arm','防具'],['acc','飾品'],['pot','藥水'],['skillbk','技能書'],['scroll','卷軸'],['mat','材料'],['quest','任務'],['other','其他']];
  function adminItemOptions(){
    const list=Object.entries(DB.items).filter(([id,d])=>(characterItemCategory==='all'||adminItemCategory(id,d)===characterItemCategory)&&(characterItemSubcategory==='all'||adminItemSubcategory(id,d)===characterItemSubcategory)&&(`${d?.n||id} ${id}`).toLowerCase().includes(characterItemSearch.trim().toLowerCase())).sort((a,b)=>(a[1]?.n||a[0]).localeCompare(b[1]?.n||b[0],'zh-Hant'));
    return list;
  }
  function renderCharacters(){
    const slots=Array.from({length:16},(_,i)=>i+1).map(n=>{
      let label=`存檔 ${n} · 空`;try{const sum=typeof slotSummary==='function'?slotSummary(n):null;if(sum)label=`存檔 ${n} · ${sum.name||'未命名'} Lv.${sum.lv} · ${sum.gold.toLocaleString()} G`;}catch{}
      return `<option value="${n}" ${Number(characterSlot)===n?'selected':''}>${escapeHtml(label)}</option>`;
    }).join('');
    const data=characterDraft?.data, p=data?.p;
    const header=data?`<div class="afk-admin-note">${escapeHtml(p.name||'未命名')} · ${escapeHtml(p.cls)} · Lv.${Number(p.lv)||1} · 存檔 ${characterSlot}${characterDraft.active?'（目前正在遊玩）':''}</div>`:'';
    const body=characterDraftError?`<div class="afk-char-warning">${escapeHtml(characterDraftError)}</div>`:!data?'<div class="afk-char-empty">選擇一個存檔並按「載入角色」。</div>':`
      ${header}<section class="afk-char-card"><h3>金幣</h3><div class="afk-char-form"><label>角色金幣<input id="afk-char-gold" type="number" min="0" max="2147483647" step="1" value="${Math.max(0,Math.floor(Number(p.gold)||0))}"></label></div></section>
      <section class="afk-char-card"><h3>背包物品與裝備</h3>${charItemRows(p.inv||[],'inv')}<div style="height:12px"></div><div class="afk-char-picker"><strong class="afk-char-picker-title">選擇要加入的物品</strong><div class="afk-char-categories" role="group" aria-label="物品分類">${adminItemCategories.map(([key,label])=>`<button type="button" class="afk-admin-btn ${characterItemCategory===key?'primary':''}" data-item-category="${key}">${label}</button>`).join('')}</div>${['wpn','arm','acc'].includes(characterItemCategory)?`<div class="afk-char-categories afk-char-subcategories" role="group" aria-label="裝備細分類"><button type="button" class="afk-admin-btn ${characterItemSubcategory==='all'?'primary':''}" data-item-subcategory="all">全部${characterItemCategory==='wpn'?'武器':characterItemCategory==='arm'?'防具':'飾品'}</button>${adminSubcategoryOptions(characterItemCategory).map(name=>`<button type="button" class="afk-admin-btn ${characterItemSubcategory===name?'primary':''}" data-item-subcategory="${escapeAttr(name)}">${escapeHtml(name)}</button>`).join('')}</div>`:''}<label class="afk-char-item-search">搜尋裝備／物品<input id="afk-char-item-search" type="search" placeholder="輸入名稱或 ID" value="${escapeAttr(characterItemSearch)}"></label><div class="afk-char-item-results" id="afk-char-item-results">${adminItemOptions().map(([id,d])=>`<button type="button" class="afk-char-item-option ${characterSelectedItem===id?'selected':''}" data-pick-item="${escapeAttr(id)}"><span class="item-name">${escapeHtml(d.n||id)}</span><span class="item-meta">${escapeHtml(id)} · ${escapeHtml(adminItemCategory(id,d)==='wpn'?adminItemSubcategory(id,d):adminItemSubcategory(id,d)||({wpn:'武器',arm:'防具',acc:'飾品',pot:'藥水',skillbk:'技能書',scroll:'卷軸',mat:'材料',quest:'任務'}[adminItemCategory(id,d)]||'其他'))}</span></button>`).join('')||'<div class="afk-char-empty">找不到符合的物品，請換分類或關鍵字。</div>'}</div><div class="afk-char-add"><div class="afk-char-picked" id="afk-char-picked">${characterSelectedItem&&DB.items[characterSelectedItem]?`已選：${escapeHtml(DB.items[characterSelectedItem].n||characterSelectedItem)}`:'尚未選擇物品'}</div><label style="display:grid;gap:5px;font-size:11px;color:#aab4a5">數量<input id="afk-char-add-count" type="number" min="1" max="999999" value="1"></label><label style="display:grid;gap:5px;font-size:11px;color:#aab4a5">強化<input id="afk-char-add-en" type="number" min="0" max="30" value="0"></label><button class="afk-admin-btn primary" id="afk-char-add">加入背包</button></div></div></section>
      <section class="afk-char-card"><h3>已裝備欄位</h3>${charItemRows(charRowsFromDraft('eq'),'eq')}</section>
      <div class="afk-admin-actions"><button class="afk-admin-btn primary" id="afk-char-save">儲存角色修改</button><button class="afk-admin-btn" id="afk-char-reload">取消修改／重新載入</button></div><p class="afk-admin-note">編輯已裝備欄位會直接改角色目前裝備。若同一角色還在其他分頁遊玩，請先關閉其他分頁，避免舊分頁存檔覆蓋修改。</p>`;
    main.innerHTML=`<div class="afk-admin-toolbar"><select class="afk-admin-search" id="afk-char-slot" aria-label="選擇角色存檔">${slots}</select><div class="afk-admin-actions"><button class="afk-admin-btn primary" id="afk-char-load">載入角色</button></div></div>${body}`;
    main.querySelector('#afk-char-slot').onchange=e=>{characterSlot=Number(e.target.value);characterDraft=null;characterDraftError='';renderCharacters()};
    main.querySelectorAll('[data-item-category]').forEach(button=>button.onclick=()=>{characterItemCategory=button.dataset.itemCategory;characterItemSubcategory='all';renderCharacters()});
    main.querySelectorAll('[data-item-subcategory]').forEach(button=>button.onclick=()=>{characterItemSubcategory=button.dataset.itemSubcategory;renderCharacters()});
    const itemSearch=main.querySelector('#afk-char-item-search');if(itemSearch)itemSearch.oninput=()=>{const pos=itemSearch.selectionStart;characterItemSearch=itemSearch.value;const list=adminItemOptions();main.querySelector('#afk-char-item-results').innerHTML=list.map(([id,d])=>`<button type="button" class="afk-char-item-option ${characterSelectedItem===id?'selected':''}" data-pick-item="${escapeAttr(id)}"><span class="item-name">${escapeHtml(d.n||id)}</span><span class="item-meta">${escapeHtml(id)} · ${escapeHtml(adminItemCategory(id,d)==='wpn'?adminItemSubcategory(id,d):adminItemSubcategory(id,d)||({wpn:'武器',arm:'防具',acc:'飾品',pot:'藥水',skillbk:'技能書',scroll:'卷軸',mat:'材料',quest:'任務'}[adminItemCategory(id,d)]||'其他'))}</span></button>`).join('')||'<div class="afk-char-empty">找不到符合的物品，請換分類或關鍵字。</div>';itemSearch.focus();itemSearch.setSelectionRange(pos,pos);bindItemPicks()};
    const bindItemPicks=()=>main.querySelectorAll('[data-pick-item]').forEach(button=>button.onclick=()=>{characterSelectedItem=button.dataset.pickItem;renderCharacters()});
    bindItemPicks();
    main.querySelector('#afk-char-load').onclick=()=>loadCharDraft();
    if(!data)return;
    const gold=main.querySelector('#afk-char-gold');gold.oninput=()=>{p.gold=Math.max(0,Math.floor(Number(gold.value)||0));};
    main.querySelectorAll('[data-char-scope]').forEach(input=>input.onchange=()=>{
      const scope=input.dataset.charScope,field=input.dataset.charField,index=Number(input.dataset.index);
      const inst=scope==='inv'?p.inv[index]:p.eq[input.dataset.slot];if(!inst)return;
      if(field==='bless')inst.bless=input.value==='cursed'?'cursed':input.value==='true';
      else if(input.type==='checkbox')inst[field]=input.checked;
      else inst[field]=Math.floor(Number(input.value)||0);
    });
    main.querySelectorAll('[data-char-remove]').forEach(button=>button.onclick=()=>{
      if(button.dataset.charRemove==='inv')p.inv.splice(Number(button.dataset.index),1);
      else {const slot=button.dataset.slot,inst=p.eq[slot];if(inst){p.inv.push(clone(inst));p.eq[slot]=null;}}
      renderCharacters();
    });
    main.querySelector('#afk-char-add').onclick=()=>{
      const id=characterSelectedItem,def=DB.items[id];if(!id||!def){toast('請先點選一項物品');return;}
      let count=Math.max(1,Math.min(999999,Math.floor(Number(main.querySelector('#afk-char-add-count').value)||1)));
      const isGear=['wpn','arm','acc'].includes(def.type);if(isGear)count=1;
      let en=Math.max(0,Math.min(30,Math.floor(Number(main.querySelector('#afk-char-add-en').value)||0)));
      try{if(typeof enhanceCap==='function'){const cap=Number(enhanceCap(def));if(Number.isFinite(cap))en=Math.min(en,cap);}}catch{}
      p.inv.push({id,uid:typeof uid==='function'?uid():('admin_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)),cnt:count,en,bless:false,anc:false,attr:false,seteff:false,lock:false,junk:false});
      renderCharacters();toast('已加入 '+(def.n||id));
    };
    main.querySelector('#afk-char-save').onclick=()=>saveCharDraft();
    main.querySelector('#afk-char-reload').onclick=()=>{characterDraft=null;characterDraftError='';loadCharDraft()};
  }
  function loadCharDraft(){
    characterDraft=null;characterDraftError='';
    if(slotConflict(characterSlot)){characterDraftError='偵測到同一角色仍在其他分頁遊玩。請先儲存並關閉該角色的其他分頁，再載入編輯。';renderCharacters();return;}
    try{const result=readCharacter(characterSlot);if(result.empty){characterDraftError='這個存檔欄位目前沒有角色。請先在遊戲中建立角色，或從遊戲主畫面匯入存檔。';}else characterDraft={data:result.data,active:result.active,runtime:result.runtime};}
    catch(err){characterDraftError=err.message||'讀取角色存檔失敗。';}
    renderCharacters();
  }
  function saveCharDraft(){
    if(!characterDraft?.data?.p){toast('請先載入一個角色');return;}
    if(slotConflict(characterSlot)){toast('同一角色仍在其他分頁遊玩，為避免覆蓋請先關閉其他分頁。');return;}
    const p=characterDraft.data.p;p.gold=Math.max(0,Math.min(2147483647,Math.floor(Number(p.gold)||0)));
    p.inv=(p.inv||[]).filter(it=>it&&typeof it.id==='string');
    for(const it of p.inv)it.cnt=Math.max(1,Math.min(999999,Math.floor(Number(it.cnt)||1)));
    try{
      let ok;
      if(characterDraft.runtime&&isActiveSlot(characterSlot)){
        player.gold=p.gold;player.inv=clone(p.inv);player.eq=clone(p.eq||{});
        if(typeof calcStats==='function')calcStats();
        if(typeof renderTabs==='function')renderTabs(true);
        ok=typeof saveGame==='function'&&saveGame()===true;
      }else{
        const data=JSON.stringify(characterDraft.data);
        const signed=typeof _saveWrap==='function'?_saveWrap(data):data;
        ok=typeof _lzSet==='function'?_lzSet(slotKey(characterSlot),signed):(localStorage.setItem(slotKey(characterSlot),signed),true);
      }
      if(!ok)throw Error('遊戲未能寫入角色存檔，請檢查瀏覽器儲存空間。');
      characterDraft.active=isActiveSlot(characterSlot)&&isVisibleGame();toast('角色已儲存：'+(p.name||'未命名')+' · '+p.gold.toLocaleString()+' 金幣');renderCharacters();
    }catch(err){toast('儲存失敗：'+err.message);}
  }
  function renderExp() {
    main.innerHTML=`<div class="afk-admin-toolbar"><div><strong>一般模式升級經驗表</strong><p class="afk-admin-note">JSON 數字陣列，索引代表等級；原始表長度 ${source.exp.length}。</p></div><div class="afk-admin-actions"><button class="afk-admin-btn" id="afk-admin-reset-exp">還原原始經驗表</button><button class="afk-admin-btn primary" id="afk-admin-save-exp">儲存經驗表</button></div></div><textarea id="afk-admin-exp-json" style="width:100%;height:calc(100% - 100px);min-height:350px;background:#101511;color:#e9ecdf;border:1px solid #3a453b;border-radius:6px;padding:12px;font:12px ui-monospace,Consolas,monospace;line-height:1.5">${escapeHtml(JSON.stringify(EXP_T,null,2))}</textarea>`;
    main.querySelector('#afk-admin-save-exp').onclick=()=>{try{const value=JSON.parse(main.querySelector('#afk-admin-exp-json').value);if(!Array.isArray(value)||value.some(n=>!Number.isFinite(Number(n))||Number(n)<0))throw Error('必須是非負數字陣列');EXP_T.splice(0,EXP_T.length,...value.map(Number));persist();toast('升級經驗表已儲存');}catch(err){toast('JSON 格式錯誤：'+err.message)}};
    main.querySelector('#afk-admin-reset-exp').onclick=()=>{if(!confirm('還原為 ZIP 內的原始經驗表？'))return;EXP_T.splice(0,EXP_T.length,...source.exp);persist();render();toast('經驗表已還原')};
  }
  function renderBackup() {
    main.innerHTML=`<h3 style="margin:2px 0 8px;font-size:14px">管理資料備份</h3><p class="afk-admin-note">匯出的 JSON 只包含你修改過的管理資料，不含角色進度。角色存檔仍使用遊戲內建的匯出／匯入功能。</p><div class="afk-admin-actions" style="margin:14px 0 24px"><button class="afk-admin-btn primary" id="afk-admin-export">匯出自訂設定</button><button class="afk-admin-btn" id="afk-admin-import">匯入自訂設定</button><input hidden type="file" id="afk-admin-file" accept="application/json"><button class="afk-admin-btn danger" id="afk-admin-reset-all">清除自訂設定</button></div><div style="border:1px solid #344035;background:#1b241d;padding:14px;border-radius:6px"><strong style="font-size:12px">儲存方式</strong><p class="afk-admin-note" style="margin:8px 0 0">設定只存在目前瀏覽器。若要讓其他玩家也看到修改，需另外部署伺服器與管理員登入系統；這份原始遊戲本身是單機網頁版。</p></div>`;
    main.querySelector('#afk-admin-export').onclick=()=>{const blob=new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='idle-lineage-admin-settings.json';a.click();URL.revokeObjectURL(a.href);toast('管理設定已匯出')};
    main.querySelector('#afk-admin-import').onclick=()=>main.querySelector('#afk-admin-file').click();
    main.querySelector('#afk-admin-file').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const value=JSON.parse(reader.result);if(!value||typeof value!=='object')throw Error('檔案格式不正確');for(const key of ['items','mobs','maps','drops'])if(value[key]&&typeof value[key]!=='object')throw Error('資料分類格式錯誤');if(value.exp&&(!Array.isArray(value.exp)||value.exp.some(n=>!Number.isFinite(Number(n)))))throw Error('經驗表格式錯誤');applyPatch(value);saved=value;localStorage.setItem(STORE_KEY,JSON.stringify(value));toast('管理設定已匯入');render()}catch(err){toast('匯入失敗：'+err.message)}};reader.readAsText(file);e.target.value=''};
    main.querySelector('#afk-admin-reset-all').onclick=()=>{if(!confirm('清除所有管理修改並還原 ZIP 原始資料？'))return;resetAll()};
  }
  function openEditor(id) {
    const obj=dataSets[active].read(); editing={kind:active,id};
    const isNew=id===null, value=isNew? (active==='drops'?[]:active==='maps'?[]:{}) : obj[id];
    overlay.querySelector('#afk-admin-edit-title').textContent=(isNew?'新增':'編輯')+' · '+dataSets[active].title;
    const key=overlay.querySelector('#afk-admin-key');key.value=id||'';key.readOnly=!isNew;key.placeholder=active==='drops'?'怪物名稱':'自訂識別 ID';
    overlay.querySelector('#afk-admin-json').value=JSON.stringify(value,null,2);
    const del=overlay.querySelector('#afk-admin-delete');del.style.visibility=isNew?'hidden':'visible';editor.classList.add('open');
    overlay.querySelector('#afk-admin-save').onclick=()=>{
      const nextId=key.value.trim(); if(!nextId){toast('請填寫 ID 或怪物名稱');return;}
      let parsed;try{parsed=JSON.parse(overlay.querySelector('#afk-admin-json').value)}catch(err){toast('JSON 格式錯誤：'+err.message);return;}
      if(active==='maps'&&!Array.isArray(parsed)){toast('地圖出怪池必須是怪物 ID 陣列');return;}
      if(active==='drops'&&(!Array.isArray(parsed)||parsed.some(x=>!Array.isArray(x)||x.length<2||typeof x[0]!=='string'||!Number.isFinite(Number(x[1]))))){toast('掉落表格式應為 [["物品 ID", 機率], ...]');return;}
      if(['items','mobs'].includes(active)&&(!parsed||Array.isArray(parsed)||typeof parsed!=='object')){toast('物品與怪物資料必須是 JSON 物件');return;}
      const recordsNow=dataSets[active].read();if(isNew&&Object.hasOwn(recordsNow,nextId)){toast('這個 ID 已存在');return;}
      recordsNow[nextId]=parsed;try{persist();editor.classList.remove('open');render();toast('資料已儲存；部分戰鬥資料會在下一次生成時套用。')}catch{}
    };
    del.onclick=()=>{if(!confirm('確定刪除「'+id+'」？'))return;delete obj[id];try{persist();editor.classList.remove('open');render();toast('資料已刪除')}catch{}};
  }
  function resetCategory(key) {
    if(!confirm('還原「'+dataSets[key].title+'」為 ZIP 原始資料？'))return;
    const target=key==='drops'?MOB_DROPS:DB[key],base=source[key];
    for(const id of Object.keys(target))delete target[id];Object.assign(target,clone(base));persist();render();toast('已還原原始資料');
  }
  function resetAll() {
    for(const key of ['items','mobs','maps','drops']){const target=key==='drops'?MOB_DROPS:DB[key];for(const id of Object.keys(target))delete target[id];Object.assign(target,clone(source[key]));}
    EXP_T.splice(0,EXP_T.length,...source.exp);localStorage.removeItem(STORE_KEY);saved={};setPage('items');toast('所有管理資料已還原');
  }
  nav.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>setPage(button.dataset.page));
  launcher.onclick=()=>{overlay.classList.add('open');setPage(active)};
  const closeAdmin = () => overlay.classList.remove('open');
  overlay.querySelector('.afk-admin-close').onclick=closeAdmin;
  overlay.querySelector('.afk-admin-mobile-close').onclick=closeAdmin;
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('open');if(e.target===editor)editor.classList.remove('open')});
  overlay.querySelector('#afk-admin-cancel').onclick=()=>editor.classList.remove('open');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){editor.classList.remove('open');overlay.classList.remove('open')}});
  setPage('characters');
})();

