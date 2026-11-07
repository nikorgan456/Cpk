// ===================== more party games: Telephone, Fake Artist, Most Likely To =====================
const nameChip = (id, sz = 18) => `<span class="chip">${beanSVG(playerOf(id)?.bean, sz)}${esc(id)}</span>`;
function phaseTimer(el, endT){ if(!el) return; const l = Math.max(0, Math.ceil(endT - (now() - CM.playT))); if(el.textContent !== String(l)) el.textContent = l; }
const sameWord = (a, b) => { a = normW(a); b = normW(b); return !!a && (a === b || nearWord(a, b) || a + "s" === b || b + "s" === a); };

// ---------- TELEPHONE ----------
// everyone draws their own secret word, then the drawings get passed on and guessed, then the big reveal
const TD = 22, TG = 14, TR = 12;
GAMES.phone = {
  name:"Telephone", noClock:true, icon:"📞", cat:"draw", desc:"Draw it, pass it on, see what they guess", dur:TD + TG + TR, rate:4, minHumans:1,
  how:["Everyone gets a secret word to draw at the same time","Your drawing gets passed to someone else, who has to guess it","Points when your drawing gets guessed and when you guess right. Then laugh at the reveal!"],
  init(ids, ctx){ const order = shuffle(ids), humans = order.filter(id => !ctx.bots.includes(id)), words = shuffle(WORDS), pairs = [];
    humans.forEach((d, i) => { const g = order[(order.indexOf(d) + 1) % order.length]; pairs.push({ d, w:words[i], g }); });
    return { pairs, dw:{}, gs:{}, ph:"draw", sentW:false, sentD:false, rev:false, bots:{}, info:{ pairs:pairs.map(p => ({ d:p.d, g:p.g })) } }; },
  introNote(info, me){ return info.pairs.some(p => p.d === me) ? "✏️ You'll get a secret word. Draw it so the next person can guess it!" : "👀 You'll guess someone's drawing"; },
  tick(G, dt, inp, H){
    if(!G.sentW){ G.sentW = true; G.pairs.forEach(p => H.to(p.d, { t:"word", w:p.w })); }
    if(G.t >= TD && G.ph === "draw"){ G.ph = "guess"; G.dirty = true; G.pairs.forEach(p => H.to(p.g, { t:"guess", from:p.d, st:G.dw[p.d] || [] })); }
    if((G.t >= TD + TG || G.ph === "guess" && G.pairs.every(p => G.gs[p.g] != null)) && G.ph === "guess"){ G.ph = "reveal"; G.revT = G.t; G.dirty = true;
      G.pairs.forEach(p => { p.guess = G.gs[p.g] || ""; p.ok = sameWord(p.guess, p.w); }); H.ev({ t:"reveal", chains:G.pairs.map(p => ({ d:p.d, w:p.w, g:p.g, guess:p.guess, ok:p.ok, st:G.dw[p.d] || [] })) }); }
    if(G.ph === "reveal" && G.t - G.revT >= TR) H.end(this.rankOf(G)); },
  rankOf(G){ const sc = {}; G.ids.forEach(id => sc[id] = 0); G.pairs.forEach(p => { if(p.ok){ sc[p.d] += 2; sc[p.g] += 2; } else if(G.dw[p.d] && G.dw[p.d].length) sc[p.d] += .5; });
    const s = G.ids.slice().sort((a, b) => sc[b] - sc[a]), gs = []; s.forEach(id => { const l = gs[gs.length - 1]; if(l && sc[l[0]] === sc[id]) l.push(id); else gs.push([id]); }); return gs; },
  timeout(G){ if(G.ph !== "reveal") G.pairs.forEach(p => { p.guess = G.gs[p.g] || ""; p.ok = sameWord(p.guess, p.w); }); return this.rankOf(G); },
  onEvent(G, id, d, H){
    if(d.e === "pts" && G.ph === "draw" && G.pairs.some(p => p.d === id)){ const l = G.dw[id] || (G.dw[id] = []); padIn(l, d, 3000); G.dirty = true; }
    if(d.e === "guess" && G.ph === "guess" && G.pairs.some(p => p.g === id) && G.gs[id] == null){ G.gs[id] = String(d.text || "").slice(0, 30); G.dirty = true; } },
  bot(G, id, dt, H){ const p = G.pairs.find(p => p.g === id); if(!p || G.ph !== "guess" || G.gs[id] != null) return null; const B = G.bots[id] || (G.bots[id] = { at:TD + 3 + rand()*8 });
    if(G.t > B.at) this.onEvent(G, id, { e:"guess", text:(G.dw[p.d] || []).length > 3 && rand() < .55 ? p.w : pick(WORDS) }, H); return null; },
  drop(G, id){},
  snap(G){ return { ph:G.ph, drew:Object.keys(G.dw), gs:Object.keys(G.gs) }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, myPair = ctx.info.pairs.find(p => p.d === me), myGuess = ctx.info.pairs.find(p => p.g === me), v = { word:null, ph:"" };
    root.innerHTML = `<div class="pg"><div class="pg-top" id="pgTop"></div><div class="pg-main" id="pgMain"></div></div>`;
    const top = $("#pgTop"), main = $("#pgMain");
    const drawUI = () => { if(!myPair){ main.innerHTML = `<div class="pg-wait">⏳ Everyone's drawing… you'll guess one next</div>`; return; }
      main.innerHTML = `<div class="pg-board"><canvas id="pgCan" width="1000" height="1000"></canvas><div class="pad-tools" id="pgTools"></div></div>`;
      v.pad = makePad($("#pgCan"), { edit:true, send:ctx.input, can:() => CM.phase === "play" && v.ph === "draw" }); v.pad.tools($("#pgTools")); };
    const guessUI = e => { if(!myGuess){ main.innerHTML = `<div class="pg-wait">⏳ Everyone's guessing…</div>`; return; }
      main.innerHTML = `<div class="pg-board"><canvas id="pgCan" width="1000" height="1000"></canvas></div><form class="dg-in pg-form" id="pgForm"><input id="pgIn" placeholder="What is it?" maxlength="30" autocomplete="off"><button class="btn small pink">Lock in</button></form>`;
      const pad = makePad($("#pgCan")); pad.redraw(e.st); if(!e.st.length) $(".pg-board").insertAdjacentHTML("beforeend", `<div class="pg-empty">They drew nothing 😶</div>`);
      $("#pgForm").onsubmit = ev => { ev.preventDefault(); const t = $("#pgIn").value.trim(); if(!t) return; ctx.input({ e:"guess", text:t }); $("#pgForm").innerHTML = `<p class="pg-locked">🔒 Locked in: <b>${esc(t)}</b></p>`; sfx.vote(); }; setTimeout(() => { const i = $("#pgIn"); if(i) i.focus(); }, 50); };
    const revealUI = chains => { main.innerHTML = `<div class="pg-rev">${chains.map((c, i) => `<div class="pg-card ${c.ok ? "ok" : "no"}"><canvas width="1000" height="1000" id="pgr${i}"></canvas><div class="pg-cap">${nameChip(c.d)} drew <b>${esc(c.w)}</b><br>${nameChip(c.g)} guessed <b>${esc(c.guess || "nothing")}</b> ${c.ok ? "✅" : "❌"}</div></div>`).join("")}</div>`;
      chains.forEach((c, i) => makePad($("#pgr" + i)).redraw(c.st)); sfx.ding(); };
    v.ev = e => { if(e.t === "word"){ v.word = e.w; sfx.ding(); } if(e.t === "guess"){ v.ph = "guess"; guessUI(e); sfx.pass(); } if(e.t === "reveal"){ v.ph = "reveal"; revealUI(e.chains); } };
    v.update = s => { if(s.ph === "draw" && v.ph !== "draw" && CM.phase === "play"){ v.ph = "draw"; drawUI(); }
      if(CM.phase === "intro") { if(!v.shown){ v.shown = true; main.innerHTML = `<div class="pg-wait">Get ready…</div>`; } }
      const end = s.ph === "draw" ? TD : s.ph === "guess" ? TD + TG : TD + TG + TR;
      const html = s.ph === "draw" ? (myPair ? `Draw: <b class="dg-word">${esc(v.word || "…")}</b> <span class="pg-t" id="pgT"></span>` : `Drawing time <span class="pg-t" id="pgT"></span>`)
        : s.ph === "guess" ? `Guess the drawing! <span class="pg-t" id="pgT"></span> <small>${s.gs.length}/${ctx.info.pairs.length} locked in</small>` : `🎞️ The reveal!`;
      if(top.dataset.h !== html){ top.dataset.h = html; top.innerHTML = html; } phaseTimer($("#pgT"), end); };
    v.destroy = () => {}; return v; }
};

// ---------- FAKE ARTIST ----------
const FAKE_CATS = { "An animal":["cat","dog","shark","penguin","elephant","giraffe","snake","frog","octopus","owl","horse","rabbit","crab","bee","snail"],
  "Food":["pizza","banana","burger","donut","icecream","taco","carrot","cheese","cake","hotdog","popcorn","apple"],
  "A thing at home":["chair","bed","lamp","toilet","door","clock","sofa","fridge","mirror","toothbrush","umbrella","tv"],
  "Transport":["car","bus","bike","plane","rocket","boat","train","helicopter","tractor","skateboard","submarine"],
  "Outdoors":["tree","sun","cloud","mountain","volcano","rainbow","flower","cactus","island","snowman","tent"] };
const PEN_COLS = ["#ff2a6a", "#1a8aff", "#20b050", "#ff8a00", "#9a3aff", "#e0b000", "#00b8b8", "#6a4a2a"];
const FT = 7, FV = 12, FR = 7;
GAMES.fake = {
  name:"Fake Artist", noClock:true, icon:"🕵️", cat:"draw", desc:"One of you doesn't know the word…", dur:90, rate:5, min:3, minHumans:1,
  how:["Everyone knows the secret word, except the <b>fake</b>, who only knows the category","Take turns adding ONE line each to the same drawing","Then vote who the fake is! Catch them and the artists win. Fool everyone and the fake wins"],
  init(ids, ctx){ const order = shuffle(ids), humans = ids.filter(id => !ctx.bots.includes(id)), fake = pick(humans.length >= 3 ? humans : ids), cat = pick(Object.keys(FAKE_CATS)), word = pick(FAKE_CATS[cat]);
    const laps = ids.length <= 4 ? 2 : 1, turns = []; for(let l=0;l<laps;l++) order.forEach(id => turns.push(id));
    const col = {}; order.forEach((id, i) => col[id] = PEN_COLS[i % PEN_COLS.length]);
    return { fake, cat, word, turns, ti:0, tEnd:FT, st:[], votes:{}, ph:"draw", col, sent:false, bots:{}, dur:turns.length*FT + FV + FR + 1, info:{ col, order, cat } }; },
  introNote(info, me){ return `Category: <b>${esc(info.cat)}</b>. You'll find out if you're the fake when it starts… 🤫`; },
  tick(G, dt, inp, H){
    if(!G.sent){ G.sent = true; G.ids.forEach(id => H.to(id, id === G.fake ? { t:"role", fake:true, cat:G.cat } : { t:"role", cat:G.cat, w:G.word })); }
    if(G.ph === "draw"){ const cur = G.turns[G.ti];
      if(cur && playerOf(cur)?.bot && !G.bots[G.ti] && G.t > G.tEnd - FT + 1.2){ G.bots[G.ti] = 1; this.botLine(G, cur, H); G.tEnd = Math.min(G.tEnd, G.t + .8); }
      if(G.t >= G.tEnd || !playerOf(cur)){ G.ti++; G.tEnd = G.t + FT; G.dirty = true; fxp(G, "turn", G.turns[G.ti] || ""); if(G.ti >= G.turns.length){ G.ph = "vote"; G.vEnd = G.t + FV; fxp(G, "vote"); } } }
    if(G.ph === "vote"){ G.ids.filter(id => playerOf(id)?.bot && G.votes[id] == null).forEach(id => { if(rand() < .02){ const others = G.ids.filter(k => k !== id); G.votes[id] = G.fake !== id && rand() < .4 ? G.fake : pick(others); G.dirty = true; } });
      if(G.t >= G.vEnd || G.ids.every(id => G.votes[id] != null)){ G.ph = "reveal"; G.rEnd = G.t + FR; const c = {}; Object.values(G.votes).forEach(v => c[v] = (c[v] || 0) + 1); const top = Math.max(0, ...Object.values(c)), most = Object.keys(c).filter(k => c[k] === top);
        G.caught = most.length === 1 && most[0] === G.fake; G.res = { fake:G.fake, word:G.word, caught:G.caught, votes:G.votes }; G.dirty = true; fxp(G, "rev"); } }
    if(G.ph === "reveal" && G.t >= G.rEnd) H.end(this.rankOf(G)); },
  botLine(G, id, H){ const cx = 300 + rand()*400, cy = 300 + rand()*400, p = []; let a = rand()*6, r = 60 + rand()*120; for(let i=0;i<14;i++){ a += .35 + (rand() - .5)*.3; p.push(Math.round(clamp(cx + Math.cos(a)*r, 20, 980)), Math.round(clamp(cy + Math.sin(a)*r*.8, 20, 980))); r += (rand() - .5)*20; }
    const st = { s:1, p, m:0, o:id, c:G.col[id] }; G.st.push(st); H.ev(Object.assign({ t:"pts" }, st)); },
  rankOf(G){ if(G.caught == null) return [G.ids]; const art = G.ids.filter(id => id !== G.fake); if(!G.caught) return [[G.fake], art];
    const right = art.filter(id => G.votes[id] === G.fake), wrong = art.filter(id => G.votes[id] !== G.fake); return [right, wrong, [G.fake]].filter(g => g.length); },
  timeout(G){ if(G.caught == null){ G.caught = false; } return this.rankOf(G); },
  onEvent(G, id, d, H){
    if(d.e === "pts" && G.ph === "draw" && G.turns[G.ti] === id){ const st = padIn(G.st, d, 2000); if(st && !st.clr){ st.o = id; st.c = G.col[id]; H.ev(Object.assign({ t:"pts" }, st)); } }
    if(d.e === "done" && G.ph === "draw" && G.turns[G.ti] === id){ G.tEnd = Math.min(G.tEnd, G.t + .6); }
    if(d.e === "vote" && G.ph === "vote" && G.votes[id] == null && G.ids.includes(d.who) && d.who !== id){ G.votes[id] = d.who; G.dirty = true; } },
  bot(){ return null; },
  drop(G, id){},
  snap(G){ return { ph:G.ph, cur:G.turns[G.ti] || null, ti:G.ti, n:G.turns.length, te:+(G.tEnd || 0).toFixed(1), ve:+(G.vEnd || 0).toFixed(1), voted:Object.keys(G.votes), res:G.res || null, fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, col = ctx.info.col, v = { fxSeen:0, role:null, ph:"" };
    root.innerHTML = `<div class="pg"><div class="pg-top" id="faTop"></div><div class="fa-turn" id="faTurn"></div><div class="pg-main" id="faMain"><div class="pg-board"><canvas id="faCan" width="1000" height="1000"></canvas><div class="pad-tools" id="faTools" hidden></div></div></div><div class="fa-leg">${ctx.info.order.map(id => `<span style="--c:${col[id]}">${beanSVG(playerOf(id)?.bean, 16)}${esc(id)}</span>`).join("")}</div></div>`;
    const pad = makePad($("#faCan"), { edit:true, col:col[me], send:ctx.input, can:() => CM.phase === "play" && v.cur === me && !v.used, onEnd:() => { v.used = true; ctx.input({ e:"done" }); $("#faTools").hidden = true; }, noClear:true }); pad.tools($("#faTools"));
    v.ev = e => { if(e.t === "role"){ v.role = e; sfx.ding(); if(e.fake) SND.say("You're the fake!"); }
      if(e.t === "pts" && e.o !== me) pad.seg("r" + e.o + "_" + e.s, e.p, e.m, e.c); };
    v.update = s => { const tt = CM.phase === "play" ? now() - CM.playT : 0;
      newFx(v, s.fx, (type, a) => { if(type === "turn"){ if(a === me){ sfx.go(); toast("✏️ Your turn! One line", 1500); } else sfx.pop(); } if(type === "vote"){ sfx.whistle(); SND.say("Who's the fake?"); } if(type === "rev"){ sfx.crown(); } });
      v.cur = s.cur; if(s.cur !== v.lastCur){ v.lastCur = s.cur; v.used = false; $("#faTools").hidden = s.cur !== me || s.ph !== "draw"; }
      const r = v.role, topH = !r ? "Getting your role…" : r.fake ? `🤫 You're the <b class="fa-fake">FAKE</b>. Category: <b>${esc(r.cat)}</b>` : `The word is <b class="dg-word">${esc(r.w)}</b> <small>(${esc(r.cat)})</small>`;
      const t = $("#faTop"); if(t.dataset.h !== topH){ t.dataset.h = topH; t.innerHTML = topH; }
      if(s.ph === "draw"){ const left = Math.max(0, Math.ceil(s.te - tt)), h = s.cur === me ? `<b style="color:${col[me]}">Your turn!</b> Draw one line · ${left}s` : s.cur ? `${nameChip(s.cur)} is drawing · ${left}s <small>(turn ${s.ti + 1}/${s.n})</small>` : ""; const el = $("#faTurn"); if(el.dataset.h !== h){ el.dataset.h = h; el.innerHTML = h; } }
      if(s.ph === "vote" && v.ph !== "vote"){ v.ph = "vote"; const ov = document.createElement("div"); ov.className = "fa-vote"; ov.id = "faVote";
        ov.innerHTML = `<h2>Who's the fake? 🕵️</h2><div class="fa-vgrid">${ctx.info.order.filter(id => id !== me).map(id => `<button class="fa-vb" data-w="${esc(id)}" style="--c:${col[id]}">${beanSVG(playerOf(id)?.bean, 46)}<b>${esc(id)}</b></button>`).join("")}</div><p class="muted" id="faVs"></p>`;
        $(".pg").appendChild(ov); ov.onclick = e => { const b = e.target.closest("[data-w]"); if(!b || v.voted) return; v.voted = true; b.classList.add("mine"); sfx.vote(); ctx.input({ e:"vote", who:b.dataset.w }); }; }
      if(s.ph === "vote"){ const vs = $("#faVs"); if(vs) vs.textContent = `${s.voted.length} voted · ${Math.max(0, Math.ceil(s.ve - tt))}s`; }
      if(s.res && v.ph !== "rev"){ v.ph = "rev"; const vo = $("#faVote"); if(vo) vo.remove(); const R = s.res, c = {}; Object.values(R.votes).forEach(w => c[w] = (c[w] || 0) + 1);
        const ov = document.createElement("div"); ov.className = "fa-vote"; ov.innerHTML = `<h2>${R.caught ? "Caught! 🚨" : "The fake got away! 😈"}</h2><div class="fa-reveal">${beanSVG(playerOf(R.fake)?.bean, 80, { mood:R.caught ? "sad" : "happy" })}<p><b>${esc(R.fake)}</b> was the fake</p><p>The word was <b class="dg-word">${esc(R.word)}</b></p></div><div class="fa-tally">${Object.entries(c).sort((a, b) => b[1] - a[1]).map(([w, n]) => `<span>${nameChip(w)} ${"🗳️".repeat(n)}</span>`).join("")}</div>`;
        $(".pg").appendChild(ov); } };
    v.destroy = () => {}; return v; }
};

// ---------- MOST LIKELY TO ----------
const LIKELY = ["become famous","get lost in their own town","laugh at the worst moment","eat something off the floor","become a millionaire","forget their own birthday","survive a zombie apocalypse","fall asleep in class",
  "trip over nothing","win a reality TV show","adopt 10 cats","become a teacher","spend all their money in one day","still be on their phone at 3am","get stuck in a lift","start a band","cry at a film",
  "talk their way out of trouble","become prime minister","accidentally text the wrong person","be late to their own wedding","run a marathon","eat a whole pizza alone","go viral","live on a boat",
  "lose their keys twice in one day","win the lottery and lose the ticket","become a spy","sing in the shower the loudest","be best friends with a celebrity","forget what they were saying mid-sentence","move to another country"];
const LQ = 13, LR = 6;
GAMES.likely = {
  name:"Most Likely To", noClock:true, icon:"👉", cat:"social", desc:"Vote who fits the question. Match the crowd", dur:2*(LQ + LR) + 1, rate:4, min:3,
  how:["A question pops up: <b>Who's most likely to…?</b>","Tap the player you think fits best (not yourself!)","Score when you vote with the majority. Two questions per round"],
  init(ids, ctx){ const R = seeded(ctx.seed), qs = shuffle(LIKELY).slice(0, 2); return { qs, qi:0, votes:[{}, {}], ph:"q", pend:LQ, pts:{}, res:[], info:{ qs } }; },
  tick(G, dt, inp, H){ const V = G.votes[G.qi];
    G.ids.forEach(id => { if(playerOf(id)?.bot && V[id] == null && G.ph === "q" && rand() < .015){ V[id] = pick(G.ids.filter(k => k !== id)); G.dirty = true; } });
    if(G.ph === "q" && (G.t >= G.pend || G.ids.every(id => V[id] != null))){ G.ph = "r"; G.pend = G.t + LR; const c = {}; Object.values(V).forEach(w => c[w] = (c[w] || 0) + 1); const top = Math.max(0, ...Object.values(c)), most = Object.keys(c).filter(k => c[k] === top);
      Object.entries(V).forEach(([id, w]) => { if(most.includes(w)) G.pts[id] = (G.pts[id] || 0) + 2; }); G.res[G.qi] = { c, most, votes:V }; fxp(G, "r", G.qi); G.dirty = true; }
    else if(G.ph === "r" && G.t >= G.pend){ if(G.qi === 0){ G.qi = 1; G.ph = "q"; G.pend = G.t + LQ; fxp(G, "q", 1); G.dirty = true; } else H.end(this.rankOf(G)); } },
  rankOf(G){ const p = id => G.pts[id] || 0, s = G.ids.slice().sort((a, b) => p(b) - p(a)), gs = []; s.forEach(id => { const l = gs[gs.length - 1]; if(l && p(l[0]) === p(id)) l.push(id); else gs.push([id]); }); return gs; },
  timeout(G){ return this.rankOf(G); },
  onEvent(G, id, d){ const V = G.votes[G.qi]; if(d.e === "vote" && G.ph === "q" && V[id] == null && G.ids.includes(d.who) && d.who !== id){ V[id] = d.who; G.dirty = true; } },
  bot(){ return null; }, drop(G, id){},
  snap(G){ return { qi:G.qi, ph:G.ph, pe:+G.pend.toFixed(1), voted:Object.keys(G.votes[G.qi]), res:G.res, pts:G.pts, fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, qs = ctx.info.qs, v = { fxSeen:0, k:"" };
    root.innerHTML = `<div class="lk"><div class="lk-q" id="lkQ"></div><div class="lk-t" id="lkT"></div><div class="lk-grid" id="lkGrid"></div></div>`;
    const grid = $("#lkGrid");
    grid.onclick = e => { const b = e.target.closest("[data-w]"); if(!b || v.voted === v.qi || CM.phase !== "play" || b.dataset.w === me) return; v.voted = v.qi; v.my = b.dataset.w; b.classList.add("mine"); sfx.vote(); ctx.input({ e:"vote", who:b.dataset.w }); };
    v.update = s => { const tt = CM.phase === "play" ? now() - CM.playT : 0; v.qi = s.qi;
      newFx(v, s.fx, (type) => { if(type === "r") sfx.ding(); if(type === "q") sfx.pop(); });
      const k = s.qi + s.ph + (s.ph === "r" ? JSON.stringify(s.res[s.qi]) : ""); if(k !== v.k){ v.k = k;
        $("#lkQ").innerHTML = `<small>Question ${s.qi + 1}/2</small>Who's most likely to <b>${esc(qs[s.qi])}</b>?`;
        const ids = Object.keys(CM.scores || {}).filter(id => playerOf(id)), R = s.ph === "r" ? s.res[s.qi] : null;
        grid.innerHTML = ids.map(id => { const n = R ? (R.c[id] || 0) : 0, voters = R ? Object.entries(R.votes).filter(([, w]) => w === id).map(([p]) => beanSVG(playerOf(p)?.bean, 16)).join("") : "";
          return `<button class="lk-b ${id === me ? "self" : ""} ${R && R.most.includes(id) ? "win" : ""} ${!R && v.voted === s.qi && v.my === id ? "mine" : ""}" data-w="${esc(id)}" ${id === me ? "disabled" : ""}>${R && R.most.includes(id) ? `<span class="lk-crown">👑</span>` : ""}${beanSVG(playerOf(id)?.bean, 54, { mood:R && R.most.includes(id) ? "happy" : "" })}<b>${esc(id)}${id === me ? " (you)" : ""}</b>${R ? `<span class="lk-n">${n} vote${n === 1 ? "" : "s"}</span><span class="lk-v">${voters}</span>` : ""}</button>`; }).join("");
        if(R){ const mine = R.votes[me]; if(mine != null) toast(R.most.includes(mine) ? "✅ You matched the crowd! +2" : "❌ Not this time", 1800); } }
      $("#lkT").textContent = s.ph === "q" ? `${Math.max(0, Math.ceil(s.pe - tt))}s · ${s.voted.length} voted` : "Results!"; };
    v.destroy = () => {}; return v; }
};
