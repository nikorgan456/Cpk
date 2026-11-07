// ===================== party games: Quick Draw & Guess, Tug of War, Don't Press Red =====================
const WORDS = ("apple banana pizza burger donut cake cookie icecream sandwich taco hotdog carrot cheese egg popcorn " +
  "cat dog fish shark whale octopus snake spider bee butterfly frog duck penguin owl elephant giraffe monkey lion horse cow pig rabbit turtle crab dinosaur unicorn " +
  "house castle bridge tower tent igloo school hospital lighthouse windmill rocket plane helicopter boat car bus train bike skateboard tractor submarine " +
  "sun moon star cloud rain rainbow snowman tree flower cactus mushroom volcano island mountain beach wave tornado " +
  "phone laptop camera guitar drum piano trumpet headphones robot clock key lock lamp chair bed toilet bath umbrella glasses hat crown sock shoe backpack " +
  "football basketball tennis trophy medal ghost alien zombie pirate wizard ninja king queen superhero vampire mermaid dragon " +
  "sword shield bow arrow bomb magnet ladder rope bucket candle balloon kite present gift snowflake fire ice heart skull eye nose ear hand foot tooth brain " +
  "pencil book scissors paperclip toothbrush soap mirror door window fence chimney anchor treasure map compass diamond ring money").split(" ");

// ---------- shared drawing pad: one pen, an eraser and a clear button ----------
// strokes travel as { s:strokeId, p:[x,y,x,y…] (0-1000), m:0 pen / 1 eraser }; { clr:1 } wipes the board
function makePad(can, o = {}){
  const x = can.getContext("2d"), P = { last:{}, mode:0 }; x.lineCap = x.lineJoin = "round";
  P.clear = () => { x.fillStyle = "#fff"; x.fillRect(0, 0, 1000, 1000); P.last = {}; };
  P.seg = (s, p, m, col) => { x.lineWidth = m ? 46 : 9; x.strokeStyle = m ? "#fff" : col || "#1a1a2a"; const last = P.last[s]; x.beginPath();
    if(last) x.moveTo(last[0], last[1]); else if(p.length >= 2){ x.moveTo(p[0], p[1]); if(p.length === 2) x.lineTo(p[0] + .1, p[1]); }
    for(let i = 0; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); if(p.length >= 2) P.last[s] = [p[p.length - 2], p[p.length - 1]]; };
  P.clear();
  P.redraw = list => { P.clear(); list.forEach(st => st.clr ? P.clear() : P.seg("x" + (st.o || "") + "_" + st.s, st.p, st.m, st.c)); P.last = {}; };
  if(o.edit){ let sid = 0, buf = [], down = false, lastSend = 0; const tag = o.tag || "";
    const pt = e => { const r = can.getBoundingClientRect(); return [clamp(Math.round((e.clientX - r.left) / r.width * 1000), 0, 1000), clamp(Math.round((e.clientY - r.top) / r.height * 1000), 0, 1000)]; };
    const flush = () => { if(!buf.length) return; o.send({ e:"pts", s:sid, p:buf, m:P.mode }); buf = []; };
    can.addEventListener("pointerdown", e => { if(!o.can()) return; down = true; sid++; can.setPointerCapture(e.pointerId); const p = pt(e); buf.push(...p); P.seg(tag + sid, p, P.mode, o.col); if(o.onStart) o.onStart(); e.preventDefault(); });
    can.addEventListener("pointermove", e => { if(!down) return; const p = pt(e); buf.push(...p); P.seg(tag + sid, p, P.mode, o.col); if(Date.now() - lastSend > 70){ lastSend = Date.now(); flush(); } });
    const up = () => { if(!down) return; down = false; flush(); if(o.onEnd) o.onEnd(); }; can.addEventListener("pointerup", up); can.addEventListener("pointercancel", up);
    P.tools = el => { el.innerHTML = `<button class="pt on" data-m="0">✏️ Pen</button><button class="pt" data-m="1">🧽 Eraser</button>${o.noClear ? "" : `<button class="pt" data-clr>🗑️ Clear</button>`}`;
      el.onclick = e => { const b = e.target.closest("button"); if(!b || !o.can()) return; sfx.click();
        if(b.dataset.clr != null){ P.clear(); o.send({ e:"pts", clr:1 }); return; }
        P.mode = +b.dataset.m; el.querySelectorAll("[data-m]").forEach(k => k.classList.toggle("on", k === b)); can.classList.toggle("erasing", P.mode === 1); }; };
  }
  return P;
}
// host side: check a stroke message and keep it
function padIn(list, d, max = 4000){ if(d.clr) { list.length = 0; return { clr:1 }; } if(!Array.isArray(d.p) || list.length >= max) return null;
  const p = d.p.slice(0, 120).map(v => clamp(Math.round(+v || 0), 0, 1000)), st = { s:d.s | 0, p, m:d.m ? 1 : 0 }; list.push(st); return st; }

// ---------- QUICK DRAW & GUESS ----------
const normW = s => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
function nearWord(a, b){ if(Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, e = 0; while(i < a.length && j < b.length){ if(a[i] === b[j]){ i++; j++; continue; } if(++e > 1) return false; if(a.length > b.length) i++; else if(b.length > a.length) j++; else { i++; j++; } } return e + (a.length - i) + (b.length - j) <= 1; }
GAMES.draw = {
  name:"Quick Draw & Guess", icon:"✏️", cat:"draw", desc:"One draws, everyone races to guess", dur:50, rate:4, minHumans:1,
  how:["One player gets a secret word and draws it (one pen, no colours!)","Everyone else types guesses. First to get it scores most","The drawer scores when people guess it. No writing letters!"],
  init(ids, ctx){ const humans = ids.filter(id => !ctx.bots.includes(id)), min = Math.min(...humans.map(h => ctx.drawn[h] || 0)), drawer = pick(humans.filter(h => (ctx.drawn[h] || 0) === min));
    ctx.drawn[drawer] = (ctx.drawn[drawer] || 0) + 1;
    return { drawer, word:pick(WORDS), strokes:[], guessed:{}, feed:[], sent:false, info:{ drawer }, bots:{} }; },
  introNote(info, me){ return info.drawer === me ? "🎨 <b>You're drawing!</b> Your word appears when it starts." : `🎨 <b>${esc(info.drawer)}</b> is drawing. Get ready to guess!`; },
  tick(G, dt, inp, H){
    if(!G.sent){ G.sent = true; H.to(G.drawer, { t:"word", w:G.word }); }
    const want = G.ids.filter(id => id !== G.drawer && playerOf(id)); if(want.length && want.every(id => G.guessed[id] != null)){ G.reveal = true; H.end(this.rankOf(G)); } },
  onEvent(G, id, d, H){
    if(d.e === "pts" && id === G.drawer){ const st = padIn(G.strokes, d); if(st) H.ev(Object.assign({ t:"pts" }, st)); }
    if(d.e === "guess" && id !== G.drawer && G.guessed[id] == null){ const g = normW(d.text); if(!g) return;
      if(g === normW(G.word)){ G.guessed[id] = G.t; G.feed.push({ id, ok:1 }); H.ev({ t:"ok", id }); }
      else { G.feed.push({ id, text:String(d.text).slice(0, 30) }); if(nearWord(g, normW(G.word))) H.to(id, { t:"close" }); }
      if(G.feed.length > 12) G.feed.shift(); G.dirty = true; }
  },
  rankOf(G){ const sc = {}, others = G.ids.filter(id => id !== G.drawer), n = others.filter(id => G.guessed[id] != null).length;
    others.forEach(id => sc[id] = G.guessed[id] != null ? 1000 - G.guessed[id] * 15 : 0); sc[G.drawer] = n ? 550 + 400 * n / Math.max(1, others.length) : 0;
    const ids = G.ids.slice().sort((a, b) => sc[b] - sc[a]), groups = []; ids.forEach(id => { const l = groups[groups.length - 1]; if(l && sc[l[0]] === sc[id]) l.push(id); else groups.push([id]); }); return groups; },
  timeout(G){ G.reveal = true; return this.rankOf(G); },
  bot(G, id, dt, H){ if(id === G.drawer || G.guessed[id] != null) return null; const B = G.bots[id] || (G.bots[id] = { at: rand() < .6 ? 10 + rand()*32 : 999, nx:5 + rand()*8 });
    if(G.t > B.at) this.onEvent(G, id, { e:"guess", text:G.word }, H); else if(G.t > B.nx){ B.nx = G.t + 6 + rand()*9; this.onEvent(G, id, { e:"guess", text:pick(WORDS) }, H); } return null; },
  drop(G, id){},
  snap(G){ return { d:G.drawer, n:G.word.length, w:G.reveal ? G.word : null, h:G.t > 22 ? G.word.length : 0, h1:G.t > 32 ? G.word[0] : "", g:G.guessed, feed:G.feed, t:+G.t.toFixed(1) }; },
  view(root, ctx){
    ctlShow(null); const meDraw = ctx.info.drawer === ctx.me, v = { word:null, strokes:{}, cur:null };
    root.innerHTML = `<div class="dg"><div class="dg-top" id="dgTop"></div><div class="dg-board"><canvas id="dgCan" width="1000" height="1000"></canvas>${meDraw ? `<div class="dg-pen">✏️ Draw here</div><div class="pad-tools" id="dgTools"></div>` : ""}</div>
      <div class="dg-side"><div class="dg-feed" id="dgFeed"></div>${meDraw ? "" : `<form class="dg-in" id="dgForm"><input id="dgGuess" placeholder="Type your guess…" autocomplete="off" maxlength="30"><button class="btn small">Guess</button></form>`}</div></div>`;
    const can = $("#dgCan"), pad = makePad(can, { edit:meDraw, send:ctx.input, can:() => CM.phase === "play", onStart:() => { const p = $(".dg-pen"); if(p) p.remove(); } });
    if(meDraw) pad.tools($("#dgTools"));
    else { $("#dgForm").onsubmit = e => { e.preventDefault(); const i = $("#dgGuess"), t = i.value.trim(); if(!t || CM.phase !== "play") return; ctx.input({ e:"guess", text:t }); i.value = ""; }; }
    v.ev = e => { if(e.t === "pts" && !meDraw){ if(e.clr) pad.clear(); else pad.seg("r" + e.s, e.p, e.m); } if(e.t === "word"){ v.word = e.w; sfx.ding(); } if(e.t === "ok"){ sfx.ding(); if(e.id === ctx.me){ sfx.win(); } } if(e.t === "close") toast("So close! 🔥"); };
    v.update = s => {
      const top = $("#dgTop"); if(!top) return;
      const hint = s.w ? `The word was <b>${esc(s.w)}</b>` : meDraw ? (v.word ? `Draw: <b class="dg-word">${esc(v.word)}</b>` : "Get ready…") :
        (s.g[ctx.me] != null ? `✅ You got it!` : `${esc(s.d)} is drawing · ${s.h ? `<span class="dg-blank">${Array.from({ length:s.n }, (_, i) => i === 0 && s.h1 ? s.h1.toUpperCase() : "_").join(" ")}</span>` : `${s.n} letters`}`);
      if(top.dataset.h !== hint){ top.dataset.h = hint; top.innerHTML = hint; }
      const fk = JSON.stringify(s.feed); if(v.fk !== fk){ v.fk = fk; $("#dgFeed").innerHTML = s.feed.map(f => `<div class="dgf ${f.ok ? "ok" : ""}">${beanSVG(playerOf(f.id)?.bean, 16)}<b>${esc(f.id)}</b> ${f.ok ? "guessed it! 🎉" : esc(f.text)}</div>`).join("") || `<div class="dgf muted">Guesses show up here</div>`; $("#dgFeed").scrollTop = 1e6; }
      if(s.g[ctx.me] != null && $("#dgGuess")) $("#dgGuess").disabled = true;
    };
    v.destroy = () => {}; return v;
  }
};

// ---------- TUG OF WAR ----------
GAMES.tug = {
  name:"Tug of War", icon:"🪢", cat:"mash", desc:"Mash as a team to pull the rope", dur:25, rate:12,
  how:["You're split into two teams","Tap <b>PULL!</b> as fast as you can (or mash <b>E</b>)","Drag the flag over your line to win"],
  init(ids){ const s = shuffle(ids), A = s.filter((_, i) => i % 2 === 0), B = s.filter((_, i) => i % 2 === 1), big = Math.max(A.length, B.length);
    return { A, B, p:0, taps:{}, mA:big / A.length, mB:big / B.length, info:{ A, B }, acc:{} }; },
  introNote(info, me){ return info.A.includes(me) ? "You're on the <b style='color:#ff4a8a'>PINK</b> team (left)" : info.B.includes(me) ? "You're on the <b style='color:#3a9aff'>BLUE</b> team (right)" : ""; },
  onEvent(G, id, d, H){ if(d.e !== "tap") return; const n = clamp(d.n | 0, 0, 20); G.taps[id] = (G.taps[id] || 0) + n; const k = .0105 * n * (G.A.includes(id) ? -G.mA : G.mB); G.p = clamp(G.p + k, -1, 1);
    if(Math.abs(G.p) >= 1 && !G.won){ G.won = G.p < 0 ? "A" : "B"; fxp(G, "w", G.won); H.end(this.rankOf(G)); } },
  tick(G, dt, inp, H){},
  rankOf(G){ const win = G.won || (G.p < 0 ? "A" : "B"), W = (win === "A" ? G.A : G.B).slice(), L = (win === "A" ? G.B : G.A).slice(), by = (a, b) => (G.taps[b] || 0) - (G.taps[a] || 0);
    if(Math.abs(G.p) < .02 && !G.won) return [G.ids]; return W.sort(by).map(i => [i]).concat(L.sort(by).map(i => [i])); },
  timeout(G){ return this.rankOf(G); },
  bot(G, id, dt, H){ const r = (G.acc[id] || 0) + dt * (5 + rand()*4); const n = Math.floor(r); G.acc[id] = r - n; if(n) this.onEvent(G, id, { e:"tap", n }, H); return null; },
  drop(G, id){ G.A = G.A.filter(x => x !== id); G.B = G.B.filter(x => x !== id); const big = Math.max(G.A.length, G.B.length, 1); G.mA = big / Math.max(1, G.A.length); G.mB = big / Math.max(1, G.B.length); },
  snap(G){ return { p:+G.p.toFixed(3), A:G.A, B:G.B, taps:G.taps, fx:G.fx }; },
  view(root, ctx){
    ctlShow(null); const v = { taps:0, pend:0, lastSend:0, fxSeen:0, imgs:{} }, myTeam = ctx.info.A.includes(ctx.me) ? "A" : ctx.info.B.includes(ctx.me) ? "B" : null;
    root.innerHTML = `<div class="tug"><canvas id="tugCan"></canvas><div class="tug-ui"><div class="tug-count" id="tugCount">0 taps</div>${myTeam ? `<button class="mash ${myTeam === "A" ? "pink" : "blue"}" id="tugBtn">PULL!</button>` : `<p class="muted">Watching</p>`}</div></div>`;
    const can = $("#tugCan"), x = can.getContext("2d");
    const imgOf = id => { if(v.imgs[id]) return v.imgs[id]; const im = new Image(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(beanSVG(playerOf(id)?.bean, 64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); return v.imgs[id] = im; };
    const tap = () => { if(CM.phase !== "play") return; v.taps++; v.pend++; sfx.mash(); const b = $("#tugBtn"); if(b){ b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit"); } $("#tugCount").textContent = `${v.taps} taps`; };
    if(myTeam){ $("#tugBtn").addEventListener("pointerdown", e => { e.preventDefault(); tap(); }); }
    const key = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat) tap(); } }; addEventListener("keydown", key);
    v.update = (s, dt, t) => {
      if(v.pend && Date.now() - v.lastSend > 90){ ctx.input({ e:"tap", n:v.pend }); v.pend = 0; v.lastSend = Date.now(); }
      newFx(v, s.fx, (type, w) => { if(type === "w"){ (w === myTeam) ? sfx.win() : sfx.lose(); } });
      const W = can.clientWidth, H = can.clientHeight; if(can.width !== W * 2){ can.width = W * 2; can.height = H * 2; } x.setTransform(2, 0, 0, 2, 0, 0);
      v.p = lerp(v.p || 0, s.p, Math.min(1, dt*12));
      const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#9ae0ff"); sky.addColorStop(1, "#ffe6f6"); x.fillStyle = sky; x.fillRect(0, 0, W, H);
      const gy = H * .62; x.fillStyle = "#7ad86a"; x.fillRect(0, gy, W, H - gy); x.fillStyle = "#9a6a3a"; x.beginPath(); x.ellipse(W/2, gy + 18, W*.12, 22, 0, 0, 7); x.fill();
      x.fillStyle = "#ff4a8a"; x.fillRect(W*.25 - 3, gy - 6, 6, 40); x.fillStyle = "#3a9aff"; x.fillRect(W*.75 - 3, gy - 6, 6, 40);
      const off = v.p * W * .25, ry = gy - 26; x.strokeStyle = "#c8964a"; x.lineWidth = 7; x.beginPath(); x.moveTo(0, ry); x.lineTo(W, ry); x.stroke();
      x.strokeStyle = "rgba(0,0,0,.15)"; x.lineWidth = 2; for(let i=-20;i<40;i++){ const rx = i*24 + off % 24; x.beginPath(); x.moveTo(rx, ry - 3); x.lineTo(rx + 8, ry + 3); x.stroke(); }
      const fx_ = W/2 + off; x.fillStyle = "#ffd23a"; x.beginPath(); x.moveTo(fx_, ry); x.lineTo(fx_ - 14, ry + 30); x.lineTo(fx_ + 14, ry + 30); x.fill(); x.fillStyle = "#e83a3a"; x.fillRect(fx_ - 2, ry - 30, 4, 30); x.beginPath(); x.moveTo(fx_ + 2, ry - 30); x.lineTo(fx_ + 22, ry - 22); x.lineTo(fx_ + 2, ry - 14); x.fill();
      const sz = Math.min(64, W / 9), lean = Math.sin(t*16)*2;
      [["A", s.A, -1], ["B", s.B, 1]].forEach(([tm, list, sd]) => list.forEach((id, i) => { const bx = W/2 + off + sd * (W*.2 + i * sz * .85) - sz/2, by = ry - sz*1.05 + (i % 2)*4;
        const im = imgOf(id); x.save(); x.translate(bx + sz/2, by + sz*.65); x.rotate(sd * (.25 + Math.abs(lean)*.02)); if(im.complete) x.drawImage(im, -sz/2, -sz*.65, sz, sz*1.3); x.restore();
        x.font = "bold 11px Nunito, sans-serif"; x.textAlign = "center"; x.fillStyle = id === ctx.me ? "#ffe23a" : "#fff"; x.strokeStyle = "rgba(0,0,0,.5)"; x.lineWidth = 3; x.strokeText(id, bx + sz/2, by - 2); x.fillText(id, bx + sz/2, by - 2); }));
    };
    v.destroy = () => removeEventListener("keydown", key); return v;
  }
};

// ---------- DON'T PRESS RED ----------
GAMES.red = {
  name:"Don't Press Red", icon:"🔴", cat:"react", desc:"Tap the greens. Never the reds.", dur:36, rate:4,
  how:["Lights pop up on your 3×3 grid","Tap <b style='color:#2ecc71'>GREEN</b> ones fast: quicker = more points","Tap a <b style='color:#ff3a3a'>RED</b> one and you're out. Miss 3 greens and you're out too"],
  init(ids, ctx){ const R = seeded(ctx.seed), seq = []; let t = 1.2;
    while(t < 34){ const k = Math.min(1, t / 34), life = 1.05 - k*.5, cell = Math.floor(R()*9); seq.push([+t.toFixed(2), cell, R() < .32 ? 1 : 0, +life.toFixed(2)]); if(R() < .3 + k*.3){ let c2 = Math.floor(R()*9); if(c2 === cell) c2 = (c2 + 4) % 9; seq.push([+(t + .05).toFixed(2), c2, R() < .5 ? 1 : 0, +life.toFixed(2)]); } t += .95 - k*.55; }
    const res = {}; ids.forEach(id => res[id] = { s:0, miss:0, out:null, hit:{} }); return { seq, res, info:{ seq }, bots:{} }; },
  onEvent(G, id, d){ const r = G.res[id]; if(!r || r.out != null) return; const L = G.seq[d.i | 0]; if(!L) return;
    if(d.e === "red" && L[2]){ r.out = G.t; r.why = "red"; G.dirty = true; }
    if(d.e === "hit" && !L[2] && !r.hit[d.i]){ r.hit[d.i] = 1; r.s += clamp(Math.round(100 - (+d.ms || 0) / 10), 10, 100); G.dirty = true; } },
  tick(G, dt, inp, H){
    for(const id of G.ids){ const r = G.res[id]; if(!r || r.out != null) continue; let miss = 0; G.seq.forEach((L, i) => { if(!L[2] && L[0] + L[3] + .35 < G.t && !r.hit[i]) miss++; });
      if(miss !== r.miss){ r.miss = miss; G.dirty = true; if(miss >= 3){ r.out = G.t; r.why = "miss"; } } }
    if(G.ids.every(id => !G.res[id] || G.res[id].out != null) && G.t > 1) H.end(this.rankOf(G)); },
  rankOf(G){ const ids = G.ids.filter(id => G.res[id]), key = id => { const r = G.res[id]; return (r.out == null ? 1e6 : r.out * 1000) + r.s; };
    const s = ids.sort((a, b) => key(b) - key(a)), groups = []; s.forEach(id => { const l = groups[groups.length - 1]; if(l && key(l[0]) === key(id)) l.push(id); else groups.push([id]); }); return groups; },
  timeout(G){ return this.rankOf(G); },
  bot(G, id){ const B = G.bots[id] || (G.bots[id] = { done:{} }), r = G.res[id]; if(!r || r.out != null) return null;
    G.seq.forEach((L, i) => { if(B.done[i] || G.t < L[0]) return; B.done[i] = 1; if(L[2]){ if(rand() < .035) setTimeout(() => this.onEvent(G, id, { e:"red", i }), 400); } else if(rand() < .9){ const ms = 280 + rand()*480; if(ms / 1000 < L[3]) setTimeout(() => this.onEvent(G, id, { e:"hit", i, ms }), ms); } });
    return null; },
  drop(G, id){ if(G.res[id] && G.res[id].out == null) G.res[id].out = G.t; },
  snap(G){ const o = {}; for(const id in G.res){ const r = G.res[id]; o[id] = [r.s, 3 - r.miss, r.out != null ? 1 : 0]; } return { r:o, t:+G.t.toFixed(1) }; },
  view(root, ctx){
    ctlShow(null); const seq = ctx.info.seq, v = { tapped:{}, out:false };
    root.innerHTML = `<div class="red"><div class="red-top"><span id="redScore">0</span><span id="redLives">❤️❤️❤️</span></div><div class="red-grid" id="redGrid">${Array.from({ length:9 }, (_, i) => `<button class="rb" data-c="${i}"></button>`).join("")}</div><div class="red-board" id="redBoard"></div><div class="red-out" id="redOut" hidden></div></div>`;
    const cells = $$("#redGrid .rb");
    const active = tt => { const a = {}; seq.forEach((L, i) => { if(tt >= L[0] && tt < L[0] + L[3]) a[L[1]] = i; }); return a; };
    cells.forEach(b => b.addEventListener("pointerdown", e => { e.preventDefault(); if(CM.phase !== "play" || v.out) return; const tt = now() - CM.playT, c = +b.dataset.c, i = active(tt)[c]; if(i == null || v.tapped[i]) return;
      v.tapped[i] = 1; const L = seq[i]; if(L[2]){ ctx.input({ e:"red", i }); b.classList.add("boom"); sfx.boom(); v.out = true; } else { const ms = Math.round((tt - L[0]) * 1000); ctx.input({ e:"hit", i, ms }); b.classList.add("good"); sfx.coin(); setTimeout(() => b.classList.remove("good"), 250); } }));
    v.update = s => {
      const tt = CM.phase === "play" ? now() - CM.playT : -1, a = active(tt);
      cells.forEach((b, c) => { const i = a[c], st = i == null || v.tapped[i] ? "" : seq[i][2] ? "r" : "g"; if(b.dataset.s !== st){ b.dataset.s = st; b.className = "rb" + (st === "g" ? " on-g" : st === "r" ? " on-r" : ""); } });
      const me = s.r && s.r[ctx.me]; if(me){ $("#redScore").textContent = me[0]; $("#redLives").textContent = "❤️".repeat(Math.max(0, me[1])) + "🖤".repeat(3 - Math.max(0, me[1]));
        if(me[2] && !v.shownOut){ v.shownOut = true; v.out = true; const o = $("#redOut"); o.hidden = false; o.innerHTML = `<b>OUT!</b><span>${me[1] <= 0 ? "Missed 3 greens" : "You pressed red"} · ${me[0]} pts</span>`; sfx.lose(); } }
      if(s.r){ const k = JSON.stringify(s.r); if(v.k !== k){ v.k = k; $("#redBoard").innerHTML = Object.entries(s.r).sort((x, y) => y[1][0] - x[1][0]).map(([id, r]) => `<span class="${r[2] ? "dead" : ""} ${id === ctx.me ? "me" : ""}">${beanSVG(playerOf(id)?.bean, 14)}${esc(id)} <b>${r[0]}</b></span>`).join(""); } }
    };
    v.destroy = () => {}; return v;
  }
};
