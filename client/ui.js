// ===================== screens: login, home, wardrobe, friends, stats, lobby, chat =====================
const PRICE = id => SHOP[id];
const linkCode = (location.pathname.match(/^\/r\/([a-z]{4})/i) || [])[1];
// ---------- login ----------
let authMode = "login";
function showAuth(){ show("authScreen"); $("#chat").hidden = true; }
$("#authSeg").onclick = e => { const b = e.target.closest("button"); if(!b) return; authMode = b.dataset.m; $$("#authSeg button").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#aGo").textContent = authMode === "login" ? "Log in" : "Create account"; $("#aPass").autocomplete = authMode === "login" ? "current-password" : "new-password"; };
$("#aGo").onclick = async () => { const name = $("#aName").value.trim(), pass = $("#aPass").value; $("#aErr").textContent = ""; $("#aGo").disabled = true;
  const j = await api(authMode, { name, pass }); $("#aGo").disabled = false;
  if(j.error){ $("#aErr").textContent = j.error; sfx.wrong(); return; } STORE.token = j.token; saveStore(); ME = j.me; sfx.win(); afterLogin(); };
$("#aPass").addEventListener("keydown", e => { if(e.key === "Enter") $("#aGo").click(); });
async function afterLogin(){ await refreshMe(); show("homeScreen"); SND.music("lobby"); const c = linkCode || STORE.pendingCode; STORE.pendingCode = null; saveStore(); if(c) enterRoom(c.toUpperCase(), false); }
// ---------- home ----------
function renderHome(){
  if(!ME) return; const need = lvlNeed(ME.lvl);
  $("#hCoins").textContent = `🪙 ${fmt(ME.coins)}`;
  $("#meCard").innerHTML = `<div class="mc-bean">${beanSVG(ME.bean, 78)}</div><div class="mc-info"><h2>${esc(ME.name)}</h2><span class="lvl">Level ${ME.lvl}</span><div class="xpbar"><i style="width:${ME.xp / need * 100}%"></i></div><small>${fmt(ME.xp)} / ${fmt(need)} XP · ${ME.wins} wins from ${ME.matches} matches</small></div>`;
  const reqs = (ME.reqs || []).length; $("#hReq").hidden = !reqs; $("#hReq").textContent = reqs;
  const pc = passClaimable(); $("#hPassN").hidden = !pc; $("#hPassN").textContent = pc; $("#hSpinN").hidden = !!ME.spun;
  const on = FRIENDS.filter(f => f.online);
  $("#hFriendsMini").innerHTML = `<div class="label">Friends online (${on.length})</div>` + (on.length ? on.map(f => `<div class="fm">${beanSVG(f.bean, 28)}<b>${esc(f.name)}</b>${f.room ? `<button class="btn small blue" data-join="${f.room}">Join ${f.room}</button>` : `<span class="dot on">online</span>`}</div>`).join("") : `<p class="muted">Nobody online right now. Add friends from the Friends button.</p>`);
}
$("#hFriendsMini").onclick = e => { const b = e.target.closest("[data-join]"); if(b) enterRoom(b.dataset.join, false); };
$("#hCreate").onclick = () => { sfx.click(); modal("#createModal"); };
$$("#createModal .opt").forEach(b => b.onclick = () => { modal("#createModal", false); enterRoom(newCode(), true, b.dataset.pub === "1"); });
$("#hJoinForm").onsubmit = e => { e.preventDefault(); const c = $("#hCode").value.trim().toUpperCase(); if(!/^[A-Z]{4}$/.test(c)) return toast("Room codes are 4 letters"); enterRoom(c, false); };
$("#hCode").addEventListener("input", e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
$("#hPublic").onclick = () => { modal("#publicModal"); loadPublic(); };
$("#pubRefresh").onclick = loadPublic;
async function loadPublic(){ $("#pubList").innerHTML = `<p class="muted">Loading…</p>`; const j = await api("rooms");
  $("#pubList").innerHTML = (j.rooms || []).length ? j.rooms.map(r => `<button class="pub" data-join="${r.code}"><b>${esc(r.host)}'s room</b><span>${r.n}/8 · ${r.status === "playing" ? "playing now" : "in the lobby"}</span><em>${r.code}</em></button>`).join("") : `<p class="muted">No public rooms right now. Make one!</p>`;
  $$("#pubList [data-join]").forEach(b => b.onclick = () => { modal("#publicModal", false); enterRoom(b.dataset.join, false); }); }
// ---------- wardrobe ----------
let wTab = "col", wSel = null;
$("#hWardrobe").onclick = () => { wSel = Object.assign({}, ME.bean); modal("#wardModal"); renderWard(); };
$("#wTabs").onclick = e => { const b = e.target.closest("button"); if(!b) return; wTab = b.dataset.s; $$("#wTabs button").forEach(x => x.setAttribute("aria-pressed", x === b)); renderWard(); };
function renderWard(){
  $("#wCoins").textContent = `🪙 ${fmt(ME.coins)}`; $("#wPrev").innerHTML = beanSVG(wSel, 150, { mood:"happy" }) + `<button class="btn green" id="wSave">Wear this</button>`;
  let items = [];
  if(wTab === "col") items = FREE_COLS.map(c => ({ id:c, col:c, free:true })).concat(Object.keys(ITEMS).filter(k => ITEMS[k].s === "col").map(k => ({ id:k, col:k })));
  else items = [{ id:"", none:true }].concat(Object.keys(ITEMS).filter(k => ITEMS[k].s === wTab).map(k => ({ id:k })));
  $("#wGrid").innerHTML = items.map(it => { const owned = it.free || it.none || ME.own[it.id], on = wTab === "col" ? wSel.col === it.id : (wSel[wTab] || "") === it.id;
    const prevBean = Object.assign({}, wSel, wTab === "col" ? { col:it.id } : { [wTab]:it.id });
    const ex = !it.free && !it.none && ITEMS[it.id] && ITEMS[it.id].ex;
    return `<button class="wi ${on ? "on" : ""} ${owned ? "" : "locked"} ${ex ? "ex" : ""}" data-id="${it.id}">${ex ? `<i class="wi-ex">S1</i>` : ""}${beanSVG(prevBean, 46)}<b>${it.none ? "None" : it.free ? "" : ITEMS[it.id].n}</b>${owned ? "" : `<span>${ex ? "🎟️ Pass" : `🪙 ${fmt(PRICE(it.id) || 0)}`}</span>`}</button>`; }).join("");
  $("#wSave").onclick = async () => { const j = await api("bean", { bean:wSel }); if(j.error) return toast(j.error); ME = j.me; sfx.win(); toast("Looking good!"); renderHome(); modal("#wardModal", false); if(NET.room) toast("Rejoin the room to show your new look to everyone"); };
}
$("#wGrid").onclick = async e => { const b = e.target.closest(".wi"); if(!b) return; const id = b.dataset.id;
  if(b.classList.contains("locked") && ITEMS[id] && ITEMS[id].ex){ sfx.wrong(); return toast("Season 1 pass reward. Earn it in 🎟️ Season pass!"); }
  if(b.classList.contains("locked")){ if(b.dataset.sure !== "1"){ $$(".wi").forEach(x => delete x.dataset.sure); b.dataset.sure = "1"; b.querySelector("span").textContent = "Tap to buy"; sfx.click(); return; }
    const j = await api("buy", { item:id }); if(j.error){ sfx.wrong(); return toast(j.error); } ME = j.me; sfx.coin(); toast(`Bought ${ITEMS[id].n}!`); }
  if(wTab === "col") wSel.col = id; else wSel[wTab] = id; sfx.pop(); renderWard(); };
// ---------- friends ----------
$("#hFriends").onclick = () => { modal("#friendsModal"); renderFriends(); };
function renderFriends(){
  $("#fReqs").innerHTML = (ME.reqs || []).map(n => `<div class="freq"><b>${esc(n)}</b> wants to be friends <button class="btn small green" data-acc="${esc(n)}">Accept</button><button class="btn small ghost" data-dec="${esc(n)}">No</button></div>`).join("");
  $("#fList").innerHTML = FRIENDS.length ? FRIENDS.sort((a, b) => b.online - a.online).map(f => `<div class="fm">${beanSVG(f.bean, 30)}<div><b>${esc(f.name)}</b><small>Level ${f.lvl} · ${f.online ? (f.room ? "in room " + f.room : "online") : "offline"}</small></div>${f.room ? `<button class="btn small blue" data-join="${f.room}">Join</button>` : ""}<button class="icon sm" data-rem="${esc(f.name)}" title="Remove">✕</button></div>`).join("") : `<p class="muted">No friends yet. Add someone by their username.</p>`;
}
$("#friendsModal").addEventListener("click", async e => { const t = e.target.closest("[data-acc],[data-dec],[data-rem],[data-join]"); if(!t) return;
  if(t.dataset.join){ modal("#friendsModal", false); return enterRoom(t.dataset.join, false); }
  const action = t.dataset.acc ? "accept" : t.dataset.dec ? "decline" : "remove", name = t.dataset.acc || t.dataset.dec || t.dataset.rem;
  if(action === "remove" && t.dataset.sure !== "1"){ t.dataset.sure = "1"; t.textContent = "Sure?"; return; }
  const j = await api("friend", { action, name }); if(j.error) toast(j.error); await refreshMe(); renderFriends(); });
$("#fAdd").onsubmit = async e => { e.preventDefault(); const n = $("#fName").value.trim(); if(!n) return; const j = await api("friend", { action:"add", name:n }); if(j.error) return toast(j.error); $("#fName").value = ""; toast("Friend request sent!"); sfx.ding(); await refreshMe(); renderFriends(); };
// ---------- stats ----------
$("#hStats").onclick = () => { modal("#statsModal"); renderStats(); };
function renderStats(){
  const g = ME.games || {}, rows = Object.keys(GAMES).map(id => { const s = g[id] || { p:0, w:0 }; return { id, p:s.p, w:s.w }; }).sort((a, b) => b.w - a.w || b.p - a.p);
  const best = rows.find(r => r.p > 0);
  $("#statsBody").innerHTML = `<div class="stat-grid"><div><b>${ME.matches}</b><span>Matches</span></div><div><b>${ME.wins}</b><span>Wins</span></div><div><b>${ME.matches ? Math.round(ME.wins / ME.matches * 100) : 0}%</b><span>Win rate</span></div><div><b>${ME.rounds || 0}</b><span>Rounds</span></div></div>
    ${best ? `<p class="best">Best game: <b>${GAMES[best.id].icon} ${GAMES[best.id].name}</b> (${best.w} wins)</p>` : ""}
    <div class="label">Every game</div><div class="g-stats">${rows.map(r => `<div><span>${GAMES[r.id].icon} ${GAMES[r.id].name}</span><b>${r.w}/${r.p}</b></div>`).join("")}</div>
    <div class="label">Recent matches</div><div class="hist">${(ME.hist || []).length ? ME.hist.map(h => `<div class="h-row"><span class="h-place p${Math.min(h.place, 4)}">${ordinal(h.place)}</span><div><b>${h.place === 1 ? "Won" : "Played"} vs ${h.n - 1} other${h.n === 2 ? "" : "s"}</b><small>${(h.board || []).slice(0, 4).map(b => `${esc(b.name)} ${b.pts}`).join(" · ")}</small></div><span class="h-r">+${h.coins}🪙<small>${timeAgo(h.t)}</small></span></div>`).join("") : `<p class="muted">No matches yet. Go play!</p>`}</div>`;
}
// ---------- settings ----------
function syncSet(){ $$("#sGfx button").forEach(b => b.setAttribute("aria-pressed", (STORE.gfx || "high") === b.dataset.q)); $("#sDark").setAttribute("aria-checked", isDark()); $("#sMusic").setAttribute("aria-checked", !!STORE.music); $("#sSound").setAttribute("aria-checked", !!STORE.sound); $("#sVoice").setAttribute("aria-checked", !!STORE.voice); $("#sVol").value = Math.round(STORE.vol * 100); }
$("#hSettings").onclick = () => { syncSet(); modal("#setModal"); };
$("#sGfx").onclick = e => { const b = e.target.closest("[data-q]"); if(!b) return; STORE.gfx = b.dataset.q; saveStore(); syncSet(); sfx.click(); toast(b.dataset.q === "high" ? "✨ High graphics" : "🔋 Low graphics: smoother on older phones"); };
$("#sDark").onclick = () => { STORE.dark = !isDark(); saveStore(); applyDark(); syncSet(); sfx.click(); };
[["#sMusic", "music"], ["#sSound", "sound"], ["#sVoice", "voice"]].forEach(([s, k]) => $(s).onclick = () => { STORE[k] = !STORE[k]; saveStore(); syncSet(); sfx.click(); });
$("#sVol").oninput = e => SND.setVol(e.target.value / 100);
$("#sLogout").onclick = async () => { await api("logout"); STORE.token = null; saveStore(); leaveRoom(true); modal("#setModal", false); showAuth(); };
// ---------- the room lobby ----------
function enterRoom(code, create, pub){ if(!ME) { STORE.pendingCode = code; saveStore(); return showAuth(); } history.replaceState(null, "", "/r/" + code); joinRoom(code, { create, pub }); $("#rCode").textContent = code; show("roomScreen"); $("#rPlayers").innerHTML = `<p class="muted">Connecting…</p>`; $("#rSettings").innerHTML = ""; $("#chat").hidden = false; chatLog = []; renderChat(); }
on("room", r => { if(!CM.phase) show("roomScreen"); renderRoom(); if(!CM.phase) SND.music("lobby"); });
on("fatal", () => { history.replaceState(null, "", "/"); leaveRoom(true); HM = null; stageClear(); ovl(""); CM.phase = ""; $("#chat").hidden = true; show("homeScreen"); SND.music("lobby"); refreshMe(); });
on("reconnecting", () => toast("Reconnecting…", 1500));
$("#rLeave").onclick = () => { if($("#rLeave").dataset.sure !== "1" && NET.room && NET.room.status === "playing"){ $("#rLeave").dataset.sure = "1"; toast("Tap again to leave the match"); setTimeout(() => delete $("#rLeave").dataset.sure, 3000); return; }
  leaveRoom(); HM = null; history.replaceState(null, "", "/"); $("#chat").hidden = true; show("homeScreen"); refreshMe(true); };
$("#rShare").onclick = () => { const url = `${location.origin}/r/${NET.code}`; if(navigator.share) navigator.share({ title:"Join my cpk room", text:`Join my cpk party! Code ${NET.code}`, url }).catch(() => copyText(url)); else copyText(url); };
function renderRoom(){
  const r = NET.room; if(!r) return; $("#rCode").textContent = r.code; const host = NET.host;
  $("#rPlayers").innerHTML = r.players.map(p => `<button class="pl ${p.id === NET.me ? "me" : ""}" data-p="${esc(p.id)}">${p.id === r.host ? `<span class="crown">👑</span>` : ""}${beanSVG(p.bean, 54)}<b>${esc(p.name)}</b><small>${p.bot ? "🤖 bot" : "Lv " + p.lvl}</small></button>`).join("") + Array.from({ length:Math.max(0, 8 - r.players.length) }, () => `<div class="pl empty"><span>?</span></div>`).join("");
  $("#rHostRow").innerHTML = host ? `<button class="btn small blue" id="rBotAdd" ${r.players.length >= 8 ? "disabled" : ""}>🤖 Add bot</button><button class="btn small ghost" id="rBotRem" ${r.players.some(p => p.bot) ? "" : "disabled"}>Remove bot</button><button class="btn small ${r.locked ? "yellow" : "ghost"}" id="rLock">${r.locked ? "🔒 Locked" : "🔓 Open"}</button>` : `<small class="muted">${esc(r.host)} is the host · ${r.pub ? "🌍 public room" : "🔒 private room"}</small>`;
  $("#rSettings").hidden = !host;
  const single = r.mode === "single", pg = GAMES[r.pick];
  if(host){ const off = r.off || [], keep = $(".g-pick") ? $(".g-pick").scrollTop : 0, py = window.scrollY;
    $("#rSettings").innerHTML = `<div class="seg mode-seg" id="rMode"><button data-m="party" aria-pressed="${!single}">🎉 Party</button><button data-m="single" aria-pressed="${single}">🎯 Single game</button></div>` + (single ?
      `<div class="label">Pick a game <small>play it once</small></div><div class="g-pick">${Object.entries(GAMES).map(([id, g]) => `<button class="gp cat-${g.cat} ${r.pick === id ? "on" : ""} ${g.solo ? "solo" : ""}" data-g="${id}"><span>${g.icon}</span>${g.name}${g.solo ? "<i>NEW</i>" : ""}</button>`).join("")}</div>
      <div class="set"><span>🌍 Public room</span><button class="sw" id="rPub" aria-checked="${!!r.pub}"></button></div>` : `<div class="label">Rounds</div><div class="seg" id="rRounds">${[5, 10, 15].map(n => `<button data-n="${n}" aria-pressed="${r.rounds === n}">${n}</button>`).join("")}</div>
      <div class="set"><span>🌍 Public room</span><button class="sw" id="rPub" aria-checked="${!!r.pub}"></button></div>
      <div class="label">Games (${Object.keys(GAMES).length - off.filter(x => GAMES[x]).length} on) <small>tap to turn off</small></div><div class="g-toggles">${Object.entries(GAMES).filter(([, g]) => !g.solo).map(([id, g]) => `<button class="gt cat-${g.cat} ${off.includes(id) ? "off" : ""}" data-g="${id}">${g.icon} ${g.name}</button>`).join("")}</div>`);
    $$("#rMode button").forEach(b => b.onclick = () => { send("settings", { mode:b.dataset.m }); sfx.click(); });
    $$(".gp").forEach(b => b.onclick = () => { send("settings", { pick:b.dataset.g }); sfx.pop(); });
    if($(".g-pick")) $(".g-pick").scrollTop = keep; if(Math.abs(window.scrollY - py) > 2) window.scrollTo(0, py);
    $$("#rRounds button").forEach(b => b.onclick = () => { send("settings", { rounds:+b.dataset.n }); sfx.click(); });
    $("#rPub").onclick = () => send("settings", { pub:!r.pub });
    $$(".gt").forEach(b => b.onclick = () => { const id = b.dataset.g, o = off.includes(id) ? off.filter(x => x !== id) : off.concat(id); if(Object.keys(GAMES).every(k => o.includes(k))) return toast("Leave at least one game on"); send("settings", { off:o }); sfx.click(); });
    $("#rBotAdd").onclick = () => send("bot", { add:true }); $("#rBotRem").onclick = () => send("bot", { add:false });
    $("#rLock").onclick = () => send("lock", { on:!r.locked }); }
  $("#rStart").hidden = !host; $("#rWait").hidden = host || r.status === "playing"; $("#rStart").disabled = r.players.length < 2 || r.status === "playing";
  $("#rStart").textContent = r.players.length < 2 ? "Need 2+ players (add a bot!)" : single ? (pg ? `▶ Play ${pg.name}` : "Pick a game above") : "▶ Start the party";
  if(single && !pg && host) $("#rStart").disabled = true;
  $("#rWait").textContent = single ? (pg ? `🎯 Next up: ${pg.icon} ${pg.name}. Waiting for the host…` : "🎯 The host is picking a game…") : "Waiting for the host to start…";
}
$("#rStart").onclick = () => { sfx.click(); startMatch(); };
$("#rPlayers").onclick = e => { const b = e.target.closest("[data-p]"); if(!b) return; const id = b.dataset.p, p = playerOf(id); if(!p) return;
  const host = NET.host, me = id === NET.me;
  $("#pMenuBody").innerHTML = `<div class="pm-head">${beanSVG(p.bean, 70)}<div><h2>${esc(p.name)}</h2><small>${p.bot ? "Bot" : "Level " + p.lvl}</small></div></div>
    ${!me && !p.bot ? `<button class="btn blue" data-pa="friend">👯 Add friend</button>` : ""}
    ${host && !me && !p.bot ? `<button class="btn yellow" data-pa="pass">👑 Make host</button>` : ""}
    ${host && !me ? `<button class="btn red" data-pa="kick">🚪 Kick</button>` : ""}<button class="btn ghost" data-close>Close</button>`;
  modal("#pMenu"); $$("#pMenuBody [data-pa]").forEach(x => x.onclick = async () => { const a = x.dataset.pa; modal("#pMenu", false);
    if(a === "friend"){ const j = await api("friend", { action:"add", name:id }); toast(j.error || "Friend request sent!"); }
    if(a === "pass") send("pass", { id }); if(a === "kick") send(p.bot ? "bot" : "kick", p.bot ? { add:false, id } : { id }); }); };
// ---------- chat + emotes ----------
let chatLog = [], chatUnread = 0;
const EMOTES = ["😂", "🔥", "💀", "👏", "😭", "🤡", "😎", "❤️", "😡", "🫡"];
$("#emotes").innerHTML = EMOTES.map(e => `<button data-e="${e}">${e}</button>`).join("");
$("#emotes").onclick = e => { const b = e.target.closest("[data-e]"); if(!b) return; $("#emotes").hidden = true; const t = Date.now(); if(t - (window._emT || 0) < 600) return; window._emT = t; send("emote", { e:b.dataset.e }); };
$("#emoBtn").onclick = () => { const em = $("#emotes"); em.hidden = !em.hidden; if(!em.hidden) $("#chatPanel").hidden = true; };
$("#chatBtn").onclick = () => { const p = $("#chatPanel"); p.hidden = !p.hidden; $("#emotes").hidden = true; if(!p.hidden){ chatUnread = 0; renderChat(); $("#chatIn").focus(); } };
$("#chatForm").onsubmit = e => { e.preventDefault(); const t = $("#chatIn").value.trim(); if(!t) return; send("chat", { text:t }); $("#chatIn").value = ""; };
on("chat", m => { chatLog.push(m); if(chatLog.length > 80) chatLog.shift(); if($("#chatPanel").hidden){ chatUnread++; sfx.chat(); } renderChat(); });
on("sys", m => { chatLog.push({ sys:1, text:m.msg }); renderChat(); });
on("emote", m => { sfx.pop(); if(CM.view && CM.view.S) return; const d = document.createElement("div"); d.className = "emo-pop"; d.style.left = (10 + rand()*75) + "%"; d.innerHTML = `<span>${esc(m.e)}</span><small>${esc(m.id)}</small>`; $("#emoPops").appendChild(d); setTimeout(() => d.remove(), 2400); });
function renderChat(){ $("#chatN").hidden = !chatUnread; $("#chatN").textContent = chatUnread;
  $("#chatMsgs").innerHTML = chatLog.length ? chatLog.map(m => m.sys ? `<div class="cm sys">${esc(m.text)}</div>` : `<div class="cm ${m.id === NET.me ? "mine" : ""}">${beanSVG(playerOf(m.id)?.bean, 18)}<b>${esc(m.id)}</b> ${esc(m.text)}</div>`).join("") : `<div class="cm sys">Say hi 👋</div>`;
  $("#chatMsgs").scrollTop = 1e6; }
$("#mBoard").onclick = () => toast(Object.keys(CM.scores || {}).filter(id => playerOf(id)).sort((a, b) => CM.scores[b] - CM.scores[a]).map((id, i) => `${i + 1}. ${id} ${CM.scores[id]}`).join("   ") || "No scores yet", 4000);
// ---------- start up ----------
setInterval(() => { if(ME && !document.hidden) refreshMe(); }, 30000);
(async () => {
  if(!STORE.token){ if(linkCode){ STORE.pendingCode = linkCode; saveStore(); } showAuth(); return; }
  const j = await refreshMe(); if(j.error){ showAuth(); return; } afterLogin();
})();

// ---------- season pass ----------
function passTier(){ return PASSI && ME.pass ? Math.min(PASSI.tiers, Math.floor(ME.pass.xp / PASSI.txp)) : 0; }
function passClaimable(){ if(!PASSI || !ME.pass) return 0; const t = passTier(); return Math.max(0, t - ME.pass.cf) + (ME.pass.prem ? Math.max(0, t - ME.pass.cp) : 0); }
function rewardHTML(r){ if(r.item){ const it = ITEMS[r.item], bean = Object.assign({}, ME.bean, it.s === "col" ? { col:r.item } : { [it.s]:r.item }); return `${beanSVG(bean, 40)}<b>${esc(it.n)}</b>`; }
  if(r.pxp) return `<span class="ps-big">⭐</span><b>${r.pxp} pass XP</b>`; return `<span class="ps-big">🪙</span><b>${fmt(r.coins)}</b>`; }
function renderPass(scroll){
  if(!PASSI) return; const P = ME.pass, t = passTier(), into = P.xp - t * PASSI.txp, maxed = t >= PASSI.tiers, cl = passClaimable();
  $("#psCoins").textContent = `🪙 ${fmt(ME.coins)}`;
  const col = (r, tr, n) => { const reached = n <= t, got = tr === "free" ? n <= P.cf : P.prem && n <= P.cp, lock = tr === "prem" && !P.prem;
    return `<div class="ps-r ${tr} ${reached ? "reach" : ""} ${got ? "got" : ""} ${lock ? "lock" : ""} ${r.item ? "item" : ""}">${rewardHTML(r)}${got ? `<i class="ps-ok">✓</i>` : lock ? `<i class="ps-lk">🔒</i>` : ""}</div>`; };
  $("#passBody").innerHTML = `<div class="ps-head"><div class="ps-tier"><small>Tier</small><b>${t}</b><small>/ ${PASSI.tiers}</small></div>
      <div class="ps-prog"><div class="xpbar"><i style="width:${maxed ? 100 : into / PASSI.txp * 100}%"></i></div><small>${maxed ? "Pass complete! 🎉" : `${fmt(into)} / ${PASSI.txp} XP to tier ${t + 1}. Play matches to earn XP`}</small></div>
      ${cl ? `<button class="btn green" id="psClaim">Claim ${cl} reward${cl === 1 ? "" : "s"}</button>` : ""}</div>
    ${P.prem ? `<p class="ps-prem on">⭐ Premium unlocked</p>` : `<div class="ps-buy"><div><b>⭐ Unlock Premium</b><small>9 exclusive items + loads more coins. Pays for itself!</small></div><button class="btn yellow" id="psBuy">🪙 ${fmt(PASSI.price)}</button></div>`}
    <div class="ps-wrap"><div class="ps-labels"><span>Free</span><span>⭐ Premium</span></div><div class="ps-track" id="psTrack">${PASSI.free.map((r, i) => `<div class="ps-col ${i + 1 <= t ? "reach" : ""} ${i + 1 === t + 1 ? "next" : ""}"><div class="ps-n">${i + 1}</div>${col(r, "free", i + 1)}${col(PASSI.prem[i], "prem", i + 1)}</div>`).join("")}</div></div>
    <p class="muted ps-note">Season 1 items will never come back after the season ends.</p>`;
  const tr = $("#psTrack"); if(scroll !== false){ const c = tr.children[Math.max(0, t - 1)]; if(c) tr.scrollLeft = c.offsetLeft - 60; } else tr.scrollLeft = renderPass.sl || 0; tr.onscroll = () => renderPass.sl = tr.scrollLeft;
  const cb = $("#psClaim"); if(cb) cb.onclick = async () => { const j = await api("pass", { action:"claim" }); if(j.error) return toast(j.error); ME = j.me; sfx.coin(); confetti(); toast(gotText(j.got)); renderPass(false); renderHome(); };
  const bb = $("#psBuy"); if(bb) bb.onclick = async () => { if(bb.dataset.sure !== "1"){ bb.dataset.sure = "1"; bb.textContent = "Tap again to buy"; sfx.click(); return; }
    const j = await api("pass", { action:"buy" }); if(j.error){ sfx.wrong(); toast(j.error); return renderPass(false); } ME = j.me; sfx.crown(); confetti(); toast("⭐ Premium unlocked!" + (j.got.length ? " " + gotText(j.got) : "")); renderPass(false); renderHome(); };
}
function gotText(got){ const c = got.reduce((s, r) => s + (r.coins || 0), 0), items = got.filter(r => r.item).map(r => ITEMS[r.item].n); return [c ? `+${fmt(c)} coins` : "", items.length ? "New: " + items.join(", ") : ""].filter(Boolean).join(" · ") || "Claimed!"; }
$("#hPass").onclick = async () => { sfx.click(); if(!PASSI) await refreshMe(); modal("#passModal"); renderPass(); };
// ---------- daily spin ----------
const SPIN_COLS = ["#ff4a8a", "#ffd23a", "#3ab8ff", "#5ae07a", "#9a6aff", "#ff8a3a", "#ff3a5a", "#2ad8c8"];
function wheelSVG(){ const n = SPINL.length, a = 360 / n, P = (deg, r) => [100 + Math.sin(deg * Math.PI / 180) * r, 100 - Math.cos(deg * Math.PI / 180) * r];
  return `<svg viewBox="0 0 200 200">${SPINL.map((x, i) => { const [x1, y1] = P(i * a, 96), [x2, y2] = P((i + 1) * a, 96), [tx, ty] = P(i * a + a/2, 64);
    return `<path d="M100 100 L${x1} ${y1} A96 96 0 0 1 ${x2} ${y2} Z" fill="${SPIN_COLS[i % 8]}" stroke="#fff" stroke-width="2"/><text x="${tx}" y="${ty}" transform="rotate(${i * a + a/2} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-family="Lilita One, sans-serif" font-size="${x.pxp ? 11 : 14}" fill="#fff" stroke="rgba(0,0,0,.25)" stroke-width=".6">${x.pxp ? "⭐ " + x.pxp + "XP" : "🪙" + x.coins}</text>`; }).join("")}<circle cx="100" cy="100" r="16" fill="#fff" stroke="#2a1a4a" stroke-width="3"/><text x="100" y="101" text-anchor="middle" dominant-baseline="middle" font-size="13">🎉</text></svg>`; }
let spinRot = 0;
function renderSpin(){ $("#spinWheel").innerHTML = wheelSVG(); const done = !!ME.spun; $("#spinGo").disabled = done;
  if(done){ const n = new Date(), m = (24*60) - (n.getUTCHours()*60 + n.getUTCMinutes()); $("#spinNote").textContent = `Next spin in ${Math.floor(m / 60)}h ${m % 60}m`; } else $("#spinNote").textContent = "One free spin every day!"; }
$("#hSpin").onclick = async () => { sfx.click(); if(!SPINL.length) await refreshMe(); modal("#spinModal"); renderSpin(); };
$("#spinGo").onclick = async () => { const go = $("#spinGo"); if(go.disabled) return; go.disabled = true;
  const j = await api("spin"); if(j.error){ toast(j.error); go.disabled = false; return; }
  const n = SPINL.length, a = 360 / n, w = $("#spinWheel"); spinRot += 360 * 6 + (360 - (j.i * a + a/2) - (spinRot % 360)) + (rand() - .5) * a * .6;
  w.style.transition = "transform 4.2s cubic-bezier(.17,.67,.2,1)"; w.style.transform = `rotate(${spinRot}deg)`;
  let tk = 0; const tick = () => { if(tk > 4100) return; sfx.tick(); tk += 60 + tk * .08; setTimeout(tick, 60 + tk * .08); }; tick();
  setTimeout(() => { ME = j.me; const p = SPINL[j.i]; sfx.win(); confetti(); toast(p.pxp ? `⭐ +${p.pxp} season pass XP!` : `🪙 You won ${p.coins} coins!`, 3200); SND.say(p.coins >= 250 ? "Jackpot!" : "Nice!"); renderSpin(); renderHome(); }, 4400); };
