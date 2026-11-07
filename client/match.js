// ===================== a match: vote → intro → play → result, repeat, then the podium =====================
// The host's device runs everything and tells the others what's happening. Everyone else just draws it and sends inputs.
const GAMES = {};
const POINTS = [8, 6, 5, 4, 3, 2, 1, 0];
let HM = null;          // host-only match state
let CM = { phase:"", game:null, view:null, S:null, info:null, round:0, total:0, scores:{}, ends:0, myVote:null };   // what this device shows
const isHost = () => NET.host;
// ---------- host helpers ----------
function hsend(k, d = {}){ const m = Object.assign({ k }, d); send("g", m); onG(m); }
function enabledGames(){ const off = (NET.room && NET.room.off) || []; return Object.keys(GAMES).filter(id => !off.includes(id)); }
function canPlay(id, ids){ const g = GAMES[id], humans = ids.filter(x => !playerOf(x)?.bot).length; return ids.length >= (g.min || 2) && humans >= (g.minHumans || 1); }
function startMatch(){
  if(!isHost() || HM) return; const ids = players().map(p => p.id); if(ids.length < 2) return toast("You need at least 2 players. Add a bot!");
  const pool = enabledGames().filter(id => canPlay(id, ids)); if(pool.length < 1) return toast("Turn on some games first");
  HM = { round:0, total:NET.room.rounds || 10, scores:{}, played:[], records:{}, wins:{}, drawn:{}, inputs:{}, t:0 };
  ids.forEach(id => { HM.scores[id] = 0; HM.records[id] = []; HM.wins[id] = 0; });
  send("status", { status:"playing" }); hsend("start", { total:HM.total, scores:HM.scores }); setTimeout(hVote, 600);
}
function hVote(){
  if(!HM) return; if(HM.round >= HM.total) return hFinal();
  const ids = players().map(p => p.id); ids.forEach(id => { if(HM.scores[id] == null){ HM.scores[id] = 0; HM.records[id] = []; HM.wins[id] = 0; } });
  let pool = enabledGames().filter(id => canPlay(id, ids)); if(!pool.length) pool = Object.keys(GAMES).filter(id => canPlay(id, ids));
  // never offer a game already played this match; also skip what was just on the last vote if there's enough left
  let fresh = pool.filter(id => !HM.played.includes(id)); if(fresh.length < 3) fresh = pool.filter(id => !HM.played.slice(-Math.max(0, pool.length - 3)).includes(id));
  const notLast = fresh.filter(id => !(HM.lastOpts || []).includes(id)), opts = shuffle(notLast.length >= 3 ? notLast : fresh.length >= 3 ? fresh : pool).slice(0, 3); HM.lastOpts = opts;
  HM.phase = "vote"; HM.vote = { opts, votes:{} }; HM.round++;
  hsend("vote", { opts, round:HM.round, total:HM.total, secs:10, scores:HM.scores });
  players().filter(p => p.bot).forEach(p => setTimeout(() => hInput(p.id, { e:"vote", g:pick(opts) }), 1200 + rand()*4500));
  clearTimeout(HM.vt); HM.vt = setTimeout(hVoteEnd, 10500);
}
function hVoteEnd(){
  if(!HM || HM.phase !== "vote") return; clearTimeout(HM.vt); const c = {}; Object.values(HM.vote.votes).forEach(g => c[g] = (c[g] || 0) + 1);
  const top = Math.max(0, ...Object.values(c)), best = HM.vote.opts.filter(g => (c[g] || 0) === top); hIntro(pick(best));
}
function hIntro(id){
  const ids = players().map(p => p.id), game = GAMES[id]; HM.phase = "intro"; HM.game = id; HM.played.push(id); HM.inputs = {};
  HM.G = game.init(ids, { seed:randInt(1e9), drawn:HM.drawn, bots:ids.filter(x => playerOf(x)?.bot) }); HM.G.ids = ids; HM.G.t = 0; HM.G.dur = HM.G.dur || game.dur;
  HM.sent = 0; hsend("intro", { game:id, info:HM.G.info || null, secs:5 }); send("s", { d:snapOf(HM.G) });
  setTimeout(() => { if(!HM || HM.game !== id || HM.phase !== "intro") return; HM.phase = "play"; HM.last = now(); hsend("play", { dur:HM.G.dur }); }, 5200);
}
function snapOf(G){ const g = GAMES[HM.game]; return g.snap ? g.snap(G) : G; }
const HAPI = {
  ev(e){ hsend("ev", { e }); },
  to(id, e){ if(id === NET.me) onG({ k:"ev", e }); else send("g", { k:"ev", e, to:id }); },
  end(rank){ hResult(rank); }
};
function hTick(){
  if(!HM || HM.phase !== "play") return; const t = now(); let rem = Math.min(1.5, t - HM.last); HM.last = t; const G = HM.G, game = GAMES[HM.game];
  // real-time clock, fixed small physics steps, so slow hosts don't stretch the round
  while(rem > 1e-4 && HM.phase === "play"){ const dt = Math.min(.034, rem); rem -= dt; G.t += dt;
    players().filter(p => p.bot && G.ids.includes(p.id)).forEach(p => { if(game.bot){ const inp = game.bot(G, p.id, dt, HAPI); if(inp) HM.inputs[p.id] = Object.assign(HM.inputs[p.id] || {}, inp); } });
    game.tick(G, dt, HM.inputs, HAPI); if(HM.phase !== "play") return;
    if(G.t >= G.dur){ hResult(game.timeout ? game.timeout(G) : [G.ids]); return; } }
  const rate = game.rate || 15; if(t - HM.sent >= 1 / rate || G.dirty){ HM.sent = t; G.dirty = false; send("s", { d:snapOf(G) }); }
}
function hInput(id, d){
  if(!HM) return;
  if(d.e === "vote" && HM.phase === "vote" && HM.vote.opts.includes(d.g)){ HM.vote.votes[id] = d.g; hsend("votes", { votes:HM.vote.votes });
    if(players().every(p => HM.vote.votes[p.id])) setTimeout(hVoteEnd, 700); return; }
  if(HM.phase !== "play" && HM.phase !== "intro") return;
  const game = GAMES[HM.game];
  if(d.c) HM.inputs[id] = Object.assign(HM.inputs[id] || {}, d.c);
  if(d.e && game.onEvent && HM.phase === "play") game.onEvent(HM.G, id, d, HAPI);
}
function hResult(rank){
  if(!HM || HM.phase !== "play") return; HM.phase = "result"; const groups = normRank(rank, HM.G.ids), gained = {};
  let place = 0; groups.forEach(gp => { gp.forEach(id => { gained[id] = POINTS[place] || 0; if(HM.scores[id] != null){ HM.scores[id] += gained[id]; HM.records[id].push({ game:HM.game, place:place + 1 }); if(place === 0) HM.wins[id]++; } }); place += gp.length; });
  send("s", { d:snapOf(HM.G) });
  hsend("result", { game:HM.game, groups, gained, scores:HM.scores, round:HM.round, total:HM.total });
  setTimeout(hVote, 6500);
}
function normRank(rank, ids){
  // a rank is a list of ids (best first) or of groups; anyone missing comes last together
  let groups = rank.map(x => Array.isArray(x) ? x : [x]).filter(g => g.length); const seen = new Set(groups.flat());
  const rest = ids.filter(id => !seen.has(id) && playerOf(id)); if(rest.length) groups.push(rest);
  return groups.map(g => g.filter(id => playerOf(id))).filter(g => g.length);
}
function hFinal(){
  HM.phase = "final"; const ids = Object.keys(HM.scores).filter(id => playerOf(id)).sort((a, b) => HM.scores[b] - HM.scores[a]);
  const groups = []; ids.forEach(id => { const last = groups[groups.length - 1]; if(last && HM.scores[last[0]] === HM.scores[id]) last.push(id); else groups.push([id]); });
  let place = 0; const results = []; groups.forEach(g => { g.forEach(id => results.push({ name:id, place:place + 1, pts:HM.scores[id], wonRounds:HM.wins[id] || 0, rounds:HM.records[id] || [] })); place += g.length; });
  hsend("final", { results });
  send("end", { results });
  setTimeout(() => { HM = null; hsend("lobby", {}); }, 13000);
}
on("i", m => { if(isHost()) hInput(m.id, m.d); });
on("left", m => { if(HM && HM.G && GAMES[HM.game].drop) GAMES[HM.game].drop(HM.G, m.id, HAPI); });
on("abort", m => { HM = null; toast(m.msg, 3500); backToLobby(); });
on("hostchange", h => { if(!h) HM = null; });
// ---------- what every device shows ----------
function myInput(d){ if(isHost()) hInput(NET.me, d); else send("i", { d }); }
on("g", m => onG(m));
on("s", m => { CM.S = m.d; CM.St = now(); if(CM.view && CM.view.snap) CM.view.snap(m.d); });
function onG(m){
  switch(m.k){
    case "start": CM.total = m.total; CM.scores = m.scores; show("matchScreen"); SND.music("game"); stageClear(); ovl(""); sfx.whistle(); break;
    case "vote": showVote(m); break;
    case "votes": CM.votes = m.votes; drawVotes(); break;
    case "intro": showIntro(m); break;
    case "play": ovl(""); CM.phase = "play"; CM.playT = now(); CM.dur = m.dur; break;
    case "ev": if(CM.view && CM.view.ev) CM.view.ev(m.e); break;
    case "result": showResult(m); break;
    case "final": showFinal(m); break;
    case "lobby": backToLobby(); break;
  }
}
function stageClear(){ if(CM.view && CM.view.destroy) CM.view.destroy(); CM.view = null; $("#stage").innerHTML = ""; CM.S = null; ctlShow(null); }
function ovl(html, cls = ""){ const o = $("#ovl"); o.className = "ovl " + cls; o.innerHTML = html; o.hidden = !html; }
function nameOf(id){ return esc(id); }
function beanOf(id, sz = 40, mood){ const p = playerOf(id); return beanSVG(p ? p.bean : null, sz, { mood }); }
function hudTop(){ $("#mRound").textContent = CM.round ? `Round ${CM.round}/${CM.total}` : ""; }
function showVote(m){
  if($("#matchScreen").hidden) show("matchScreen"); stageClear(); CM.phase = "vote"; CM.round = m.round; CM.total = m.total; CM.scores = m.scores; CM.votes = {}; CM.voteOpts = m.opts; CM.myVote = null; CM.ends = now() + m.secs; hudTop(); SND.music("game");
  ovl(`<div class="vote"><h2>Vote for the next game</h2><div class="vote-t" id="voteT">${m.secs}</div><div class="vote-opts">${m.opts.map(id => { const g = GAMES[id];
    return `<button class="vote-card cat-${g.cat}" data-g="${id}"><span class="vc-ic">${g.icon}</span><b>${g.name}</b><small>${g.desc}</small><div class="vc-who" id="vw-${id}"></div></button>`; }).join("")}</div>
    <div class="mini-board">${miniBoard()}</div></div>`, "vote-ovl");
  $$(".vote-card").forEach(b => b.onclick = () => { if(CM.myVote) return; CM.myVote = b.dataset.g; b.classList.add("mine"); sfx.vote(); myInput({ e:"vote", g:b.dataset.g }); });
  SND.say("Vote for the next game!");
}
function drawVotes(){ (CM.voteOpts || []).forEach(id => { const box = $("#vw-" + id); if(box) box.innerHTML = Object.entries(CM.votes || {}).filter(([, g]) => g === id).map(([p]) => `<span title="${esc(p)}">${beanOf(p, 18)}</span>`).join(""); }); sfx.pop(); }
function miniBoard(){ const ids = Object.keys(CM.scores || {}).filter(id => playerOf(id)).sort((a, b) => CM.scores[b] - CM.scores[a]);
  return ids.map((id, i) => `<div class="mb-row ${id === NET.me ? "me" : ""}"><span class="mb-p">${i + 1}</span>${beanOf(id, 20)}<b>${esc(id)}</b><span class="mb-s">${CM.scores[id]}</span></div>`).join(""); }
function showIntro(m){
  if($("#matchScreen").hidden) show("matchScreen"); stageClear(); CM.phase = "intro"; CM.game = m.game; CM.info = m.info; const g = GAMES[m.game]; CM.ends = now() + m.secs;
  CM.view = g.view($("#stage"), { me:NET.me, info:m.info, input:myInput, host:isHost() });
  ovl(`<div class="intro cat-${g.cat}"><div class="in-ic">${g.icon}</div><h1>${g.name}</h1><ul>${g.how.map(h => `<li>${h}</li>`).join("")}</ul><div class="count" id="introCount"></div></div>`, "intro-ovl");
  if(g.introNote){ const n = g.introNote(m.info, NET.me); if(n) $(".intro").insertAdjacentHTML("beforeend", `<p class="in-note">${n}</p>`); }
  SND.say(g.name, 1.05, 1.2);
  [3, 2, 1].forEach((n, i) => setTimeout(() => { const c = $("#introCount"); if(!c || CM.game !== m.game) return; c.textContent = n; c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); sfx.beep(); if(i === 0) SND.say("3, 2, 1, go!", 1.25, 1.3); }, 2000 + i * 1000));
  setTimeout(() => { const c = $("#introCount"); if(c && CM.game === m.game){ c.textContent = "GO!"; sfx.go(); } }, 5000);
}
function showResult(m){
  CM.phase = "result"; CM.scores = m.scores; const g = GAMES[m.game]; let place = 0;
  const rows = m.groups.map(gp => { const html = gp.map(id => `<div class="rr ${id === NET.me ? "me" : ""}"><span class="rr-p">${["🥇","🥈","🥉"][place] || place + 1}</span>${beanOf(id, 30, place === 0 ? "happy" : place >= m.groups.length - 1 && place > 0 ? "sad" : "")}<b>${esc(id)}</b><span class="rr-g">+${m.gained[id] || 0}</span></div>`).join(""); place += gp.length; return html; }).join("");
  const mine = m.groups.findIndex(gp => gp.includes(NET.me));
  ovl(`<div class="result"><h2>${g.icon} ${g.name}</h2><div class="rr-list">${rows}</div><div class="mini-board">${miniBoard()}</div><small class="muted">${m.round >= m.total ? "Final scores next…" : "Next vote in a moment…"}</small></div>`, "result-ovl");
  if(mine === 0){ sfx.win(); SND.say("Nice!"); } else sfx.ding();
  if(CM.view && CM.view.over) CM.view.over();
}
function showFinal(m){
  stageClear(); CM.phase = "final"; SND.music("final"); const top = m.results.slice(0, 3), me = m.results.find(r => r.name === NET.me);
  const pod = [1, 0, 2].map(i => top[i] ? `<div class="pod p${i + 1}"><div class="pod-b">${beanOf(top[i].name, i === 0 ? 74 : 56, "happy")}</div><b>${esc(top[i].name)}</b><span>${top[i].pts} pts</span><div class="pod-step">${i + 1}</div></div>` : `<div class="pod p${i + 1} empty"></div>`).join("");
  ovl(`<div class="final"><h1>${esc(m.results[0].name)} wins!</h1><div class="podium">${pod}</div><div class="fin-list">${m.results.slice(3).map(r => `<div class="rr"><span class="rr-p">${r.place}</span>${beanOf(r.name, 24)}<b>${esc(r.name)}</b><span class="rr-g">${r.pts}</span></div>`).join("")}</div>
    ${me && !playerOf(NET.me)?.bot ? `<p class="fin-me">You came <b>${ordinal(me.place)}</b>: +${[60, 40, 30, 20, 15, 12, 10, 10][me.place - 1] || 10} coins and XP</p>` : ""}<small class="muted">Back to the lobby soon…</small></div>`, "final-ovl");
  sfx.crown(); SND.say(`${m.results[0].name} wins!`); confetti();
}
const ordinal = n => n + (["th","st","nd","rd"][(n % 100 - 20) % 10] || ["th","st","nd","rd"][n % 100] || "th");
function backToLobby(){ stageClear(); ovl(""); CM.phase = ""; CM.round = 0; if(NET.room){ show("roomScreen"); SND.music("lobby"); renderRoom(); refreshMe(); } }
// ---------- per-frame loop ----------
let lastF = now();
function frame(){
  requestAnimationFrame(frame); const t = now(), dt = Math.min(.05, t - lastF); lastF = t;
  if(isHost()) hTick();
  if(CM.view && CM.view.update){ const S = isHost() && HM && HM.G && HM.game === CM.game ? snapOf(HM.G) : CM.S; if(S) CM.view.update(S, dt, t); }
  if(CM.phase === "vote"){ const v = $("#voteT"); if(v){ const s = Math.max(0, Math.ceil(CM.ends - t)); if(v.textContent != s){ v.textContent = s; if(s <= 3 && s > 0) sfx.tick(); } } }
  if(CM.phase === "play" && CM.dur && !(GAMES[CM.game] || {}).noClock){ const left = Math.max(0, CM.dur - (t - CM.playT)); $("#mTime").textContent = left < 100 ? Math.ceil(left) + "s" : ""; } else $("#mTime").textContent = "";
  ctlTick();
}
requestAnimationFrame(frame);
setInterval(() => { if(isHost() && now() - lastF > .25) hTick(); }, 120); // keeps the match running if the host's tab stops drawing
function confetti(){ const c = $("#confetti"); c.innerHTML = Array.from({ length:70 }, () => `<i style="left:${rand()*100}%;background:${pick(["#ff4ab8","#ffd23a","#3ad8ff","#5ae07a","#9a6aff","#ff7a3a"])};animation-delay:${rand()*.6}s;animation-duration:${1.6 + rand()*1.4}s;transform:rotate(${rand()*360}deg)"></i>`).join(""); setTimeout(() => c.innerHTML = "", 3500); }
