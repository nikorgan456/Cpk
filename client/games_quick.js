// ===================== quick games: Balloon Pump, Sprint 100m, Stop at 10.00, Whack-a-Mole, Quick Draw =====================
const byScore = (ids, f, asc) => { const s = ids.slice().sort((a, b) => asc ? f(a) - f(b) : f(b) - f(a)), gs = []; s.forEach(id => { const l = gs[gs.length - 1]; if(l && f(l[0]) === f(id)) l.push(id); else gs.push([id]); }); return gs; };
const beanImg = (cache, id, sz = 64) => cache[id] || (cache[id] = Object.assign(new Image(), { src:"data:image/svg+xml;charset=utf-8," + encodeURIComponent(beanSVG(playerOf(id)?.bean, sz).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')) }));
function tapBtn(btn, fn){ btn.addEventListener("pointerdown", e => { e.preventDefault(); fn(); btn.classList.remove("hit"); void btn.offsetWidth; btn.classList.add("hit"); }); }
function boardRow(ids, val, me){ return ids.map(id => `<span class="${id === me ? "me" : ""}">${beanSVG(playerOf(id)?.bean, 14)}${esc(id)} <b>${val(id)}</b></span>`).join(""); }

// ---------- BALLOON PUMP ----------
function balloonRed(seed){ const R = seeded(seed), w = []; let t = 3 + R()*2; while(t < 34){ const l = .8 + R()*.9; w.push([+t.toFixed(2), +l.toFixed(2)]); t += l + 1.6 + R()*2.8; } return w; }
const isRed = (W, t) => W.some(([a, l]) => t >= a && t < a + l);
GAMES.balloon = {
  name:"Balloon Pump", icon:"🎈", cat:"mash", desc:"Pump till it pops. Stop on red!", dur:36, rate:10,
  how:["Mash <b>PUMP!</b> (or press <b>E</b>) to blow up your balloon","It slowly leaks if you stop, so keep going","When the light goes <b style='color:#ff3a3a'>RED</b>, stop! Pumping on red lets loads of air out. First to POP wins"],
  init(ids, ctx){ const sz = {}; ids.forEach(id => sz[id] = 0); return { sz, fin:[], W:balloonRed(ctx.seed), bots:{}, info:{ seed:ctx.seed } }; },
  onEvent(G, id, d){ if(d.e !== "pump" || G.fin.includes(id)) return; const n = clamp(d.n | 0, 0, 20), r = clamp(d.r | 0, 0, 20);
    G.sz[id] = clamp(G.sz[id] + n*1.3 - r*8, 0, 100); if(r) fxp(G, "hiss", id); if(G.sz[id] >= 100){ G.fin.push(id); fxp(G, "pop", id); } G.dirty = true; },
  tick(G, dt, inp, H){ G.ids.forEach(id => { if(!G.fin.includes(id)) G.sz[id] = Math.max(0, G.sz[id] - 2.4*dt); });
    if(G.fin.length === G.ids.length || G.fin.length >= Math.max(1, G.ids.length - 1) && G.ids.length > 1 && G.fin.length >= 3) H.end(this.timeout(G)); },
  timeout(G){ return G.fin.map(id => [id]).concat(byScore(G.ids.filter(id => !G.fin.includes(id)), id => Math.round(G.sz[id]))); },
  bot(G, id, dt){ const B = G.bots[id] || (G.bots[id] = { acc:0, r:5.5 + rand()*2.5 }); if(G.fin.includes(id)) return null; const red = isRed(G.W, G.t - .3);
    if(red && rand() < .992) return null; B.acc += dt*B.r; const n = Math.floor(B.acc); if(n){ B.acc -= n; this.onEvent(G, id, { e:"pump", n:red ? 0 : n, r:red ? n : 0 }); } return null; },
  drop(G, id){},
  snap(G){ const s = {}; for(const id in G.sz) s[id] = +G.sz[id].toFixed(1); return { sz:s, fin:G.fin, fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const W = balloonRed(ctx.info.seed), me = ctx.me, v = { n:0, r:0, last:0, fxSeen:0 };
    root.innerHTML = `<div class="bl"><div class="bl-row" id="blRow"></div><div class="bl-light" id="blLight">PUMP!</div><div class="bl-big"><svg viewBox="0 0 100 130" id="blSvg"><path d="M50 108 Q46 118 52 128" stroke="#888" stroke-width="2" fill="none"/><g id="blB"><ellipse cx="50" cy="55" rx="40" ry="48" fill="${hashCol(me)}"/><ellipse cx="36" cy="34" rx="9" ry="14" fill="#fff" opacity=".45" transform="rotate(-25 36 34)"/><path d="M45 102 L55 102 L50 108 Z" fill="${hashCol(me)}"/></g></svg><div class="bl-pct" id="blPct">0%</div></div><button class="mash pink" id="blBtn">PUMP!</button></div>`;
    const pump = () => { if(CM.phase !== "play") return; const red = isRed(W, now() - CM.playT); if(red){ v.r++; sfx.slip(); $(".bl").classList.add("shake"); setTimeout(() => $(".bl") && $(".bl").classList.remove("shake"), 300); } else { v.n++; sfx.pump(); } };
    tapBtn($("#blBtn"), pump); const key = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat){ pump(); } } }; addEventListener("keydown", key);
    v.update = (s, dt) => { if((v.n || v.r) && Date.now() - v.last > 90){ ctx.input({ e:"pump", n:v.n, r:v.r }); v.n = v.r = 0; v.last = Date.now(); }
      const red = CM.phase === "play" && isRed(W, now() - CM.playT), L = $("#blLight"); if(L.dataset.r !== String(red)){ L.dataset.r = red; L.textContent = red ? "✋ STOP!" : "PUMP!"; L.className = "bl-light" + (red ? " red" : ""); if(red) sfx.wrong(); }
      newFx(v, s.fx, (type, a) => { if(type === "pop"){ sfx.boom(); if(a === me){ SND.say("Pop!"); $("#blB").style.display = "none"; } } });
      const my = s.sz[me] || 0, done = s.fin.includes(me); v.sc = lerp(v.sc || 0, my, Math.min(1, dt*12)); $("#blB").setAttribute("transform", `translate(50 108) scale(${.35 + v.sc/100*.75}) translate(-50 -108)`);
      $("#blPct").textContent = done ? `💥 POP! ${ordinal(s.fin.indexOf(me) + 1)}` : Math.round(my) + "%";
      const ids = Object.keys(s.sz); $("#blRow").innerHTML = ids.map(id => `<div class="bl-mini ${id === me ? "me" : ""}"><div class="bl-mb" style="--s:${s.fin.includes(id) ? 0 : .3 + s.sz[id]/100*.7};--c:${hashCol(id)}">${s.fin.includes(id) ? "💥" : ""}</div>${beanSVG(playerOf(id)?.bean, 22)}<small>${esc(id)}</small></div>`).join(""); };
    v.destroy = () => removeEventListener("keydown", key); return v; }
};

// ---------- SPRINT 100m ----------
const bangAt = seed => 2.4 + seeded(seed)()*2;
GAMES.sprint = {
  name:"Sprint 100m", icon:"🏃‍♂️", cat:"mash", desc:"Wait for the gun, then mash left-right", dur:30, rate:12,
  how:["Wait for the <b>BANG!</b> Go early and you're frozen for a bit","Tap <b>LEFT</b> and <b>RIGHT</b> one after the other (keys: A/D or ←/→)","Same foot twice = stumble! First to 100m wins"],
  init(ids, ctx){ const R = {}; ids.forEach(id => R[id] = { d:0, v:0, foot:-1, fz:0, fs:false }); return { R, fin:[], bang:bangAt(ctx.seed), bots:{}, info:{ seed:ctx.seed } }; },
  onEvent(G, id, d){ const r = G.R[id]; if(!r || d.e !== "step" || G.fin.includes(id)) return; const f = d.f ? 1 : 0;
    if(G.t < G.bang - .05){ if(!r.fs){ r.fs = true; r.fz = G.bang + 1.4; fxp(G, "fs", id); G.dirty = true; } return; }
    if(G.t < r.fz) return; if(f === r.foot){ r.v *= .45; r.fz = G.t + .25; fxp(G, "st", id); } else r.v = Math.min(11.6, r.v + 1.05); r.foot = f; },
  tick(G, dt, inp, H){ for(const id of G.ids){ const r = G.R[id]; if(G.fin.includes(id)) continue; r.v = Math.max(0, r.v - 3.2*dt); r.d += r.v*dt; if(r.d >= 100){ r.d = 100; G.fin.push(id); fxp(G, "fin", id); G.dirty = true; } }
    raceEnd(G, H, () => this.timeout(G)); },
  timeout(G){ return raceRank(G, id => G.R[id].d); },
  bot(G, id, dt){ const B = G.bots[id] || (G.bots[id] = { nx:0, react:.18 + rand()*.25, rate:7.5 + rand()*3 }); if(G.t < G.bang + B.react || G.t < B.nx) return null; B.nx = G.t + 1 / B.rate * (.8 + rand()*.4);
    const r = G.R[id]; this.onEvent(G, id, { e:"step", f:rand() < .05 ? r.foot : 1 - r.foot }); return null; },
  drop(G, id){},
  snap(G){ const o = {}; for(const id in G.R){ const r = G.R[id]; o[id] = [+r.d.toFixed(2), +r.v.toFixed(1), r.fs ? 1 : 0]; } return { R:o, fin:G.fin, fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, bang = bangAt(ctx.info.seed), v = { imgs:{}, fxSeen:0, said:0 };
    root.innerHTML = `<div class="sp"><canvas id="spCan"></canvas><div class="race-hud" id="spHud"></div><div class="sp-call" id="spCall"></div><div class="sp-btns"><button class="mash pink" id="spL">LEFT</button><button class="mash blue" id="spR">RIGHT</button></div></div>`;
    const can = $("#spCan"), x = can.getContext("2d");
    const step = f => { if(CM.phase !== "play") return; ctx.input({ e:"step", f }); sfx.step(); };
    tapBtn($("#spL"), () => step(0)); tapBtn($("#spR"), () => step(1));
    const key = e => { if(e.repeat || e.target.closest("input")) return; if(["KeyA", "ArrowLeft", "KeyQ"].includes(e.code)){ e.preventDefault(); step(0); } if(["KeyD", "ArrowRight", "KeyE"].includes(e.code)){ e.preventDefault(); step(1); } }; addEventListener("keydown", key);
    v.update = (s, dt, t) => { const tt = CM.phase === "play" ? now() - CM.playT : 0, call = $("#spCall");
      const c = CM.phase !== "play" ? "" : tt < 1.1 ? "On your marks…" : tt < bang ? "Set…" : tt < bang + .9 ? "💥 BANG!" : "";
      if(call.textContent !== c){ call.textContent = c; call.className = "sp-call" + (c.includes("BANG") ? " bang" : ""); if(c.includes("BANG")) sfx.bang(); else if(c) sfx.beep(); }
      newFx(v, s.fx, (type, a) => { if(type === "fs" && a === me){ toast("🚫 False start! Frozen", 1600); sfx.wrong(); } if(type === "st" && a === me) sfx.slip(); if(type === "fin"){ sfx.win(); } });
      for(const id in s.R){ const r = s.R[id]; v[id] = lerp(v[id] || 0, r[0], Math.min(1, dt*10)); }
      const W = can.clientWidth, H = can.clientHeight; if(can.width !== W*2){ can.width = W*2; can.height = H*2; } x.setTransform(2, 0, 0, 2, 0, 0);
      const ids = Object.keys(s.R), camD = clamp(v[me] != null ? v[me] : Math.max(...ids.map(i => v[i] || 0)), 0, 100), ppm = W / 22, ox = W*.3 - camD*ppm;
      x.fillStyle = "#9ad8ff"; x.fillRect(0, 0, W, H*.35); x.fillStyle = "#ffd6ec"; x.fillRect(0, H*.25, W, H*.1); for(let i=0;i<30;i++){ x.fillStyle = ["#ff7ab8", "#ffd23a", "#7ad8ff", "#9a6aff"][i % 4]; x.beginPath(); x.arc((i*47 + ox*.3) % (W + 40) - 20, H*.3, 10, 0, 7); x.fill(); }
      const top = H*.35, lh = (H*.65 - 10) / Math.max(ids.length, 1); x.fillStyle = "#e85a3a"; x.fillRect(0, top, W, H - top);
      ids.forEach((id, i) => { const y = top + i*lh; x.fillStyle = i % 2 ? "#d84a2a" : "#e85a3a"; x.fillRect(0, y, W, lh); x.fillStyle = "rgba(255,255,255,.8)"; x.fillRect(0, y, W, 2); });
      for(let m=0;m<=100;m+=10){ const px = ox + m*ppm; if(px < -20 || px > W + 20) continue; x.fillStyle = "rgba(255,255,255,.6)"; x.fillRect(px, top, 2, H - top); x.fillStyle = "#fff"; x.font = "bold 12px Nunito, sans-serif"; x.textAlign = "center"; x.fillText(m + "m", px, top - 4); }
      const fx = ox + 100*ppm; x.fillStyle = "#fff"; x.fillRect(fx - 3, top, 6, H - top); for(let j=0;j<(H - top)/8;j++){ x.fillStyle = j % 2 ? "#222" : "#fff"; x.fillRect(fx - 3, top + j*8, 6, 8); }
      ids.forEach((id, i) => { const r = s.R[id], y = top + i*lh + lh*.5, px = ox + v[id]*ppm, sz = Math.min(lh*1.1, 54), bob = r[1] > .5 ? Math.abs(Math.sin(t*r[1]*1.6))*sz*.15 : 0, im = beanImg(v.imgs, id);
        if(im.complete){ x.save(); x.translate(px, y - bob); x.rotate(r[1] > 1 ? .18 : 0); x.drawImage(im, -sz/2, -sz*.95, sz, sz*1.3); x.restore(); }
        x.font = "bold 11px Nunito, sans-serif"; x.textAlign = "left"; x.fillStyle = id === me ? "#ffe23a" : "#fff"; x.fillText((r[2] ? "🚫 " : "") + id, 6, top + i*lh + 13); });
      const my = s.R[me]; if(my){ const prog = id => s.fin.includes(id) ? 1e4 - s.fin.indexOf(id) : s.R[id][0], place = ids.filter(id => prog(id) > prog(me)).length + 1;
        $("#spHud").innerHTML = s.fin.includes(me) ? `<b>🏁 ${ordinal(s.fin.indexOf(me) + 1)}!</b>` : `<b>${ordinal(place)}</b><span>${Math.floor(my[0])}m · ${(my[1]*3.6).toFixed(0)} km/h</span>`; } };
    v.destroy = () => removeEventListener("keydown", key); return v; }
};

// ---------- STOP AT 10.00 ----------
const stopPlan = seed => { const R = seeded(seed); return [{ at:1, target:10 }, { at:16.5, target:+(5 + Math.floor(R()*8)*.5).toFixed(2) }]; };
GAMES.stop10 = {
  name:"Stop at 10.00", icon:"⏱️", cat:"react", desc:"Stop the clock exactly on time, blind", dur:32, rate:5,
  how:["A stopwatch starts counting up","After 3 seconds it goes <b>invisible</b>, so count in your head!","Tap <b>STOP</b> (or press <b>E</b>) as close to the target as you can. Two tries, closest total wins"],
  init(ids, ctx){ const res = {}; ids.forEach(id => res[id] = [null, null]); return { res, plan:stopPlan(ctx.seed), info:{ seed:ctx.seed } }; },
  onEvent(G, id, d){ const r = G.res[id]; if(!r || d.e !== "stop") return; const a = d.a ? 1 : 0, P = G.plan[a]; if(r[a] != null || G.t < P.at) return; r[a] = clamp(Math.round(+d.ms || 0), 0, 30000); G.dirty = true; },
  err(G, id){ return G.plan.reduce((s, P, a) => s + (G.res[id][a] == null ? 5000 : Math.abs(G.res[id][a] - P.target*1000)), 0); },
  tick(G, dt, inp, H){ G.ids.forEach(id => G.plan.forEach((P, a) => { if(G.res[id][a] == null && G.t > P.at + P.target + 4.5){ G.res[id][a] = Math.round((P.target + 4.5)*1000); G.dirty = true; } }));
    if(G.ids.every(id => G.res[id][1] != null) && G.t > G.plan[1].at + 1) H.end(this.timeout(G)); },
  timeout(G){ return byScore(G.ids, id => this.err(G, id), true); },
  bot(G, id){ G.plan.forEach((P, a) => { const r = G.res[id]; if(r[a] != null || G.t < P.at) return; const b = (G.bots = G.bots || {})[id + a] || (G.bots[id + a] = P.target + (rand() - .5)*.7*(1 + rand())); if(G.t - P.at >= b){ r[a] = Math.round(b*1000); G.dirty = true; } }); return null; },
  drop(G, id){},
  snap(G){ return { res:G.res }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, plan = stopPlan(ctx.info.seed), v = { done:[false, false] };
    root.innerHTML = `<div class="st"><div class="st-try" id="stTry"></div><div class="st-clock" id="stClock">0.00</div><div class="st-msg" id="stMsg"></div><button class="mash red-btn" id="stBtn">STOP</button><div class="red-board" id="stBoard"></div></div>`;
    const cur = () => { const tt = now() - CM.playT; return tt >= plan[1].at ? 1 : 0; };
    const stop = () => { if(CM.phase !== "play") return; const a = cur(), tt = now() - CM.playT - plan[a].at; if(tt < 0 || v.done[a]) return; v.done[a] = true; const ms = Math.round(tt*1000); ctx.input({ e:"stop", a, ms }); v.mine = v.mine || []; v.mine[a] = ms; sfx.ding(); };
    tapBtn($("#stBtn"), stop); const key = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat) stop(); } }; addEventListener("keydown", key);
    v.update = s => { const tt = CM.phase === "play" ? now() - CM.playT : 0, a = cur(), P = plan[a], el = tt - P.at;
      $("#stTry").innerHTML = `Try ${a + 1}/2 · Target <b>${P.target.toFixed(2)}</b>`;
      const clk = $("#stClock"); if(el < 0){ clk.textContent = "0.00"; clk.className = "st-clock"; $("#stMsg").textContent = a ? "Next try… get ready" : "Get ready…"; }
      else if(v.done[a]){ const ms = v.mine[a], err = (ms / 1000 - P.target); clk.textContent = (ms / 1000).toFixed(2); clk.className = "st-clock done"; $("#stMsg").innerHTML = Math.abs(err) < .05 ? "🎯 PERFECT!" : `${err > 0 ? "+" : ""}${err.toFixed(2)}s off`; }
      else { const show = el < 3; clk.textContent = show ? el.toFixed(2) : "?.??"; clk.className = "st-clock" + (show ? "" : " blind"); $("#stMsg").textContent = show ? "Watch it…" : "Count in your head… tap STOP!"; }
      $("#stBtn").disabled = el < 0 || v.done[a];
      const k = JSON.stringify(s.res); if(v.k !== k){ v.k = k; const ids = Object.keys(s.res); $("#stBoard").innerHTML = ids.map(id => { const r = s.res[id]; return `<span class="${id === me ? "me" : ""}">${beanSVG(playerOf(id)?.bean, 14)}${esc(id)} <b>${r.map((x, i) => x == null ? "…" : (x / 1000).toFixed(2)).join(" · ")}</b></span>`; }).join(""); } };
    v.destroy = () => removeEventListener("keydown", key); return v; }
};

// ---------- WHACK-A-MOLE ----------
function moleSeq(seed){ const R = seeded(seed), M = []; let t = 1; while(t < 29){ const k = Math.min(1, t / 29), n = R() < .25 + k*.35 ? 2 : 1, used = [];
  for(let i=0;i<n;i++){ let h; do { h = Math.floor(R()*12); } while(used.includes(h)); used.push(h); const r = R(); M.push([+(t + i*.15).toFixed(2), h, r < .12 ? 1 : r < .27 ? 2 : 0, +(1.25 - k*.45).toFixed(2)]); }
  t += .75 - k*.3 + R()*.3; } return M; }
GAMES.whack = {
  name:"Whack-a-Mole", icon:"🔨", cat:"react", desc:"Everyone whacks the same moles. Be fastest", dur:32, rate:8,
  how:["Moles pop up on everyone's screen at the same time","First to tap one gets it! <b>⭐ Gold</b> = 3 points","Don't hit the <b>💣 bombs</b> (−3). Most points wins"],
  init(ids, ctx){ const sc = {}; ids.forEach(id => sc[id] = 0); return { sc, M:moleSeq(ctx.seed), took:{}, bots:{}, info:{ seed:ctx.seed } }; },
  onEvent(G, id, d, H){ if(d.e !== "whack") return; const i = d.i | 0, m = G.M[i]; if(!m || G.took[i] || G.t < m[0] - .1 || G.t > m[0] + m[3] + .35) return;
    G.took[i] = id; G.sc[id] += m[2] === 1 ? 3 : m[2] === 2 ? -3 : 1; H.ev({ t:"took", i, id }); G.dirty = true; },
  tick(G){},
  timeout(G){ return byScore(G.ids, id => G.sc[id]); },
  bot(G, id, dt, H){ const B = G.bots[id] || (G.bots[id] = { seen:{}, sp:.4 + rand()*.35 });
    G.M.forEach((m, i) => { if(B.seen[i] || G.t < m[0]) return; B.seen[i] = 1; if(m[2] === 2 ? rand() < .07 : rand() < .7){ const at = B.sp + rand()*.4; setTimeout(() => { if(HM && HM.G === G) this.onEvent(G, id, { e:"whack", i }, H); }, at*1000); } }); return null; },
  drop(G, id){},
  snap(G){ return { sc:G.sc, took:G.took }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, M = moleSeq(ctx.info.seed), v = { took:{}, mine:{} };
    root.innerHTML = `<div class="wm"><div class="wm-score" id="wmScore">0</div><div class="wm-grid" id="wmGrid">${Array.from({ length:12 }, (_, i) => `<button class="wm-h" data-h="${i}"><span class="wm-m"></span></button>`).join("")}</div><div class="red-board" id="wmBoard"></div></div>`;
    const holes = $$("#wmGrid .wm-h"), act = tt => { const a = {}; M.forEach((m, i) => { if(tt >= m[0] && tt < m[0] + m[3]) a[m[1]] = i; }); return a; };
    holes.forEach(h => h.addEventListener("pointerdown", e => { e.preventDefault(); if(CM.phase !== "play") return; const i = act(now() - CM.playT)[+h.dataset.h]; if(i == null || v.took[i] || v.mine[i]) return; v.mine[i] = 1; ctx.input({ e:"whack", i }); sfx.whack(); h.classList.add("bonk"); setTimeout(() => h.classList.remove("bonk"), 150); }));
    v.ev = e => { if(e.t === "took"){ v.took[e.i] = e.id; if(e.id === me){ const m = M[e.i]; m[2] === 2 ? sfx.boom() : m[2] === 1 ? sfx.coin() : sfx.pop(); } } };
    v.update = s => { const tt = CM.phase === "play" ? now() - CM.playT : -1, a = act(tt);
      holes.forEach((h, k) => { const i = a[k], m = i == null ? null : M[i], who = i == null ? null : v.took[i] || (s.took && s.took[i]);
        const st = m == null ? "" : who ? "got:" + who : ["m", "g", "b"][m[2]]; if(h.dataset.s === st) return; h.dataset.s = st;
        const sp = h.firstChild; h.className = "wm-h" + (m && !who ? " up t" + m[2] : "") + (who ? " got" : "");
        sp.innerHTML = !m ? "" : who ? `<i class="wm-who">${beanSVG(playerOf(who)?.bean, 30, { mood:"happy" })}</i>` : m[2] === 1 ? "⭐" : m[2] === 2 ? "💣" : `<i class="wm-face"></i>`; });
      $("#wmScore").textContent = (s.sc[me] || 0) + " pts";
      const k = JSON.stringify(s.sc); if(v.k !== k){ v.k = k; const ids = Object.keys(s.sc).sort((x, y) => s.sc[y] - s.sc[x]); $("#wmBoard").innerHTML = boardRow(ids, id => s.sc[id], me); } };
    v.destroy = () => {}; return v; }
};

// ---------- QUICK DRAW ----------
const duelPlan = seed => { const R = seeded(seed); return [0, 1, 2].map(k => { const st = 1 + k*8; return { st, sig:+(st + 1.6 + R()*3.2).toFixed(2), end:st + 7.6 }; }); };
GAMES.quick = {
  name:"Quick Draw", icon:"🤠", cat:"react", desc:"Wait for DRAW!, then shoot first", dur:26, rate:6,
  how:["Three showdowns. Wait for it…","When it says <b>DRAW!</b> tap <b>FIRE</b> (or press <b>E</b>) as fast as you can","Shoot too early and you get a big time penalty. Fastest total wins"],
  init(ids, ctx){ const r = {}; ids.forEach(id => r[id] = [null, null, null]); return { r, P:duelPlan(ctx.seed), bots:{}, info:{ seed:ctx.seed } }; },
  onEvent(G, id, d){ const r = G.r[id]; if(!r || d.e !== "shot") return; const k = d.k | 0, P = G.P[k]; if(!P || r[k] != null || G.t < P.st - .2 || G.t > P.end + .5) return; r[k] = clamp(Math.round(+d.ms || 0), -5000, 5000); G.dirty = true; },
  total(G, id){ return G.r[id].reduce((s, x) => s + (x == null ? 1500 : x < 0 ? 1200 : x), 0); },
  tick(G, dt, inp, H){ if(G.t > G.P[2].end) H.end(this.timeout(G)); },
  timeout(G){ return byScore(G.ids, id => this.total(G, id), true); },
  bot(G, id){ G.P.forEach((P, k) => { const r = G.r[id]; if(r[k] != null) return; const B = G.bots[id + k] || (G.bots[id + k] = rand() < .06 ? -(.2 + rand()*.6) : .21 + rand()*.22); if(G.t >= P.sig + B){ r[k] = Math.round(B*1000); G.dirty = true; } }); return null; },
  drop(G, id){},
  snap(G){ return { r:G.r }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, P = duelPlan(ctx.info.seed), v = { shot:{}, saidK:-1, sigK:-1 };
    root.innerHTML = `<div class="qd"><div class="qd-sky"></div><div class="qd-sun"></div><div class="qd-ground"></div><div class="qd-k" id="qdK"></div><div class="qd-call" id="qdCall"></div><div class="qd-me" id="qdMe">${beanSVG(playerOf(me)?.bean, 90)}<span class="qd-hat">🤠</span></div><button class="mash" id="qdBtn">FIRE!</button><div class="red-board" id="qdBoard"></div></div>`;
    const cur = tt => P.findIndex(p => tt >= p.st && tt < p.end);
    const fire = () => { if(CM.phase !== "play") return; const tt = now() - CM.playT, k = cur(tt); if(k < 0 || v.shot[k] != null) return; const ms = Math.round((tt - P[k].sig)*1000); v.shot[k] = ms; ctx.input({ e:"shot", k, ms }); sfx.bang(); if(ms < 0) toast("🚫 Too early! +1.2s penalty", 1500); };
    tapBtn($("#qdBtn"), fire); const key = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat) fire(); } }; addEventListener("keydown", key);
    v.update = s => { const tt = CM.phase === "play" ? now() - CM.playT : -1, k = cur(tt), call = $("#qdCall"), q = $(".qd");
      $("#qdK").textContent = k >= 0 ? `Showdown ${k + 1}/3` : "";
      let txt = "", cls = ""; if(k >= 0){ const p = P[k]; if(v.shot[k] != null){ txt = v.shot[k] < 0 ? "Too early! 😬" : `${v.shot[k]} ms`; cls = v.shot[k] < 0 ? "bad" : "good"; } else if(tt < p.sig){ txt = "Wait for it…"; cls = "wait"; } else { txt = "DRAW!"; cls = "draw"; } }
      if(call.textContent !== txt){ call.textContent = txt; call.className = "qd-call " + cls; if(cls === "draw"){ sfx.go(); } if(cls === "wait" && v.saidK !== k){ v.saidK = k; sfx.whistle(); } }
      q.classList.toggle("go", cls === "draw");
      const kk = JSON.stringify(s.r); if(v.k !== kk){ v.k = kk; const ids = Object.keys(s.r), tot = id => s.r[id].reduce((a, x) => a + (x == null ? 0 : x < 0 ? 1200 : x), 0);
        $("#qdBoard").innerHTML = ids.sort((a, b) => tot(a) - tot(b)).map(id => `<span class="${id === me ? "me" : ""}">${beanSVG(playerOf(id)?.bean, 14)}${esc(id)} <b>${s.r[id].map(x => x == null ? "…" : x < 0 ? "🚫" : x).join(" · ")}</b></span>`).join(""); } };
    v.destroy = () => removeEventListener("keydown", key); return v; }
};
