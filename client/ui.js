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
    return `<button class="wi ${on ? "on" : ""} ${owned ? "" : "locked"}" data-id="${it.id}">${beanSVG(prevBean, 46)}<b>${it.none ? "None" : it.free ? "" : ITEMS[it.id].n}</b>${owned ? "" : `<span>🪙 ${fmt(PRICE(it.id) || 0)}</span>`}</button>`; }).join("");
  $("#wSave").onclick = async () => { const j = await api("bean", { bean:wSel }); if(j.error) return toast(j.error); ME = j.me; sfx.win(); toast("Looking good!"); renderHome(); modal("#wardModal", false); if(NET.room) toast("Rejoin the room to show your new look to everyone"); };
}
$("#wGrid").onclick = async e => { const b = e.target.closest(".wi"); if(!b) return; const id = b.dataset.id;
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
function syncSet(){ $("#sMusic").setAttribute("aria-checked", !!STORE.music); $("#sSound").setAttribute("aria-checked", !!STORE.sound); $("#sVoice").setAttribute("aria-checked", !!STORE.voice); $("#sVol").value = Math.round(STORE.vol * 100); }
$("#hSettings").onclick = () => { syncSet(); modal("#setModal"); };
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
  if(host){ const off = r.off || [];
    $("#rSettings").innerHTML = `<div class="label">Rounds</div><div class="seg" id="rRounds">${[5, 10, 15].map(n => `<button data-n="${n}" aria-pressed="${r.rounds === n}">${n}</button>`).join("")}</div>
      <div class="set"><span>🌍 Public room</span><button class="sw" id="rPub" aria-checked="${!!r.pub}"></button></div>
      <div class="label">Games (${Object.keys(GAMES).length - off.filter(x => GAMES[x]).length} on) <small>tap to turn off</small></div><div class="g-toggles">${Object.entries(GAMES).map(([id, g]) => `<button class="gt cat-${g.cat} ${off.includes(id) ? "off" : ""}" data-g="${id}">${g.icon} ${g.name}</button>`).join("")}</div>`;
    $$("#rRounds button").forEach(b => b.onclick = () => { send("settings", { rounds:+b.dataset.n }); sfx.click(); });
    $("#rPub").onclick = () => send("settings", { pub:!r.pub });
    $$(".gt").forEach(b => b.onclick = () => { const id = b.dataset.g, o = off.includes(id) ? off.filter(x => x !== id) : off.concat(id); if(Object.keys(GAMES).every(k => o.includes(k))) return toast("Leave at least one game on"); send("settings", { off:o }); sfx.click(); });
    $("#rBotAdd").onclick = () => send("bot", { add:true }); $("#rBotRem").onclick = () => send("bot", { add:false });
    $("#rLock").onclick = () => send("lock", { on:!r.locked }); }
  $("#rStart").hidden = !host; $("#rWait").hidden = host || r.status === "playing"; $("#rStart").disabled = r.players.length < 2 || r.status === "playing";
  $("#rStart").textContent = r.players.length < 2 ? "Need 2+ players (add a bot!)" : "▶ Start the party";
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
