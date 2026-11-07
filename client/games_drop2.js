// ===================== drop 2: Tail Tag, Floor is Lava, Spin Cycle, Musical Chairs, Infection, Bean Football, Paint Wars, Snowball Fight =====================
// ---------- team helpers ----------
const TEAM_COL = ["#ff3a8a", "#2a8aff"], TEAM_NAME = ["PINK", "BLUE"];
function teamSplit(ids){ const s = shuffle(ids), T = {}; s.forEach((id, i) => T[id] = i % 2); return T; }
const teamNote = (info, me) => info && info.T && info.T[me] != null ? `You're on the <b style="color:${TEAM_COL[info.T[me]]}">${TEAM_NAME[info.T[me]]}</b> team` : "";
// winners first (best player first), then the losing team; a draw is everyone ranked by what they did
function teamRank(G, win, score){ if(win == null || win < 0) return byScore(G.ids, id => Math.round(score(id) * 10));
  const side = t => byScore(G.ids.filter(id => G.T[id] === t), id => Math.round(score(id) * 10)); return side(win).concat(side(1 - win)); }
function teamMark(S, id, b, t){ if(t == null || b.userData.tm != null) return; b.userData.tm = t;
  const r = new THREE.Mesh(new THREE.RingGeometry(.52, .72, 28), new THREE.MeshBasicMaterial({ color:TEAM_COL[t], side:THREE.DoubleSide, transparent:true, opacity:.95, depthWrite:false })); r.rotation.x = -Math.PI/2; r.position.y = .04; b.add(r);
  const tag = S.tags.get(id); if(tag){ tag.style.background = TEAM_COL[t]; tag.style.color = "#fff"; } }
const scoreHud = (root) => { const h = document.createElement("div"); h.className = "team-hud"; root.appendChild(h); return h; };
const teamScoreHTML = (a, b, mid = "") => `<span class="th-p">${TEAM_NAME[0]} <b>${a}</b></span><i>${mid || "–"}</i><span class="th-b"><b>${b}</b> ${TEAM_NAME[1]}</span>`;
const floorBox = (S, w, h, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .6, h), mat); m.position.y = -.3; m.receiveShadow = true; S.scene.add(m); return m; };
const wallRing = (S, w, h, col = "#ffffff") => { const wm = new THREE.MeshStandardMaterial({ color:col, roughness:.4 }); [[0, h/2 + .2, w + .8, .4], [0, -h/2 - .2, w + .8, .4], [w/2 + .2, 0, .4, h], [-w/2 - .2, 0, .4, h]].forEach(([x, z, a, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(a, .9, d), wm); m.position.set(x, .45, z); m.castShadow = true; S.scene.add(m); }); };
const stripeTex = (a, b, n = 8, rep) => cTex(256, 256, (x, w) => { for(let i=0;i<n;i++){ x.fillStyle = i % 2 ? a : b; x.fillRect(i*w/n, 0, w/n, w); } }, rep);
const nearest = (G, id, f) => { const b = G.B[id]; let best = null, bd = 1e9; for(const k of G.ids){ if(k === id) continue; const c = G.B[k]; if(!c.alive || c.fall || !f(k, c)) continue; const d = Math.hypot(c.x - b.x, c.z - b.z); if(d < bd){ bd = d; best = k; } } return [best, bd]; };
const toward = (b, x, z, s = 1) => { const dx = x - b.x, dz = z - b.z, m = Math.hypot(dx, dz) || 1; return { x:dx/m*s, y:dz/m*s }; };
const pushOutBox = (b, bx, bz, hw, hd, r = .5) => { const dx = b.x - bx, dz = b.z - bz, ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz); if(ox > 0 && oz > 0){ if(ox < oz){ b.x += Math.sign(dx || 1)*ox; b.vx = 0; } else { b.z += Math.sign(dz || 1)*oz; b.vz = 0; } return true; } return false; };
const pushOutCirc = (b, cx, cz, r) => { const dx = b.x - cx, dz = b.z - cz, d = Math.hypot(dx, dz); if(d < r && d > 1e-4){ b.x = cx + dx/d*r; b.z = cz + dz/d*r; return true; } return false; };

// ---------- TAIL TAG (teams) ----------
GAMES.tailtag = {
  name:"Tail Tag", icon:"🦊", cat:"phys", desc:"Steal tails from the other team", dur:45, team:true,
  how:["Some beans start with a fluffy tail. Grab them off the <b>other team</b>!","Tap <b>GRAB</b> (or <b>E</b>) next to an enemy with a tail. <b>JUMP</b> (Space) to dodge","When time's up, the team holding the most tails wins"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, (i, n) => [0, 0]), tail = {}, hold = {};
    [0, 1].forEach(t => { const m = ids.filter(id => T[id] === t); m.forEach((id, i) => { B[id].x = (t ? 6 : -6) + (i % 2)*1.5; B[id].z = (i - (m.length - 1)/2) * 2.2; B[id].f = t ? -Math.PI/2 : Math.PI/2; tail[id] = i < Math.ceil(m.length / 2); hold[id] = 0; }); });
    return { B, T, tail, hold, imm:{}, outs:[], info:{ T } }; },
  introNote:teamNote,
  tick(G, dt, inp, H){
    G.ids.forEach(id => { G.B[id].boost = G.tail[id] ? .94 : 1; if(G.tail[id]) G.hold[id] += dt; });
    physStep(G, dt, inp, { wall:{ w:22, h:16 }, speed:7.2, floorH:() => 0, act:(id, b) => { if(b.cd > 0) return; b.cd = .45; b.vx += Math.sin(b.f)*4; b.vz += Math.cos(b.f)*4; if(G.tail[id]) return;
      for(const k of G.ids){ const c = G.B[k]; if(G.T[k] === G.T[id] || !G.tail[k] || (G.imm[k] || 0) > G.t || Math.abs(c.y - b.y) > 1.2) continue; if(Math.hypot(c.x - b.x, c.z - b.z) < 1.55){ G.tail[k] = false; G.tail[id] = true; G.imm[id] = G.t + 1.3; fxp(G, "grab", id, k); G.dirty = true; return; } }
      fxp(G, "miss", id); } }); },
  count(G){ const c = [0, 0]; G.ids.forEach(id => { if(G.tail[id]) c[G.T[id]]++; }); return c; },
  timeout(G){ const c = this.count(G); return teamRank(G, c[0] === c[1] ? -1 : c[0] > c[1] ? 0 : 1, id => G.hold[id]); },
  drop(G, id){ G.tail[id] = false; },
  bot(G, id){ const b = G.B[id]; if(!b) return null;
    if(!G.tail[id]){ const [k, d] = nearest(G, id, (k) => G.T[k] !== G.T[id] && G.tail[k]); if(!k) return { x:(rand() - .5)*.4, y:(rand() - .5)*.4 }; const c = G.B[k], r = toward(b, c.x + c.vx*.3, c.z + c.vz*.3); r.a = d < 1.45 && rand() < .25 ? 1 : 0; return r; }
    const [k, d] = nearest(G, id, (k) => G.T[k] !== G.T[id] && !G.tail[k]); if(!k || d > 6.5) return { x:-b.x*.08 + (rand() - .5)*.5, y:-b.z*.08 + (rand() - .5)*.5 };
    const c = G.B[k]; let r = toward(b, b.x - (c.x - b.x), b.z - (c.z - b.z)); if(Math.abs(b.x) > 8.5) r.x = -Math.sign(b.x); if(Math.abs(b.z) > 5.5) r.y = -Math.sign(b.z); r.j = d < 1.8 && rand() < .12 ? 1 : 0; return r; },
  snap(G){ return { B:physSnap(G.B), tail:G.ids.filter(id => G.tail[id]), fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T; return physView(root, ctx, { sky:"#9ae0ff", sky2:"#fff4d8", goo:"#7ad86a", fog:"#fff4d8", cam:[0, 19, 15], btn:"GRAB", jump:true, pred:{ speed:7.2 } }, (S, v) => {
    floorBox(S, 22, 16, new THREE.MeshStandardMaterial({ map:stripeTex("#8ae07a", "#7ad06a", 8, [1, 1]), roughness:.8 })); wallRing(S, 22, 16, "#ffd23a");
    const tails = {}, tm = new THREE.MeshStandardMaterial({ color:"#ffb03a", roughness:.9 }), tw = new THREE.MeshStandardMaterial({ color:"#fff", roughness:.9 }), hud = scoreHud(root);
    const mkTail = () => { const g = new THREE.Group(); [[0, 0, 0, .26, tm], [0, .12, -.25, .22, tm], [0, .28, -.42, .16, tw]].forEach(([x, y, z, r, m]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m); s.position.set(x, y, z); s.castShadow = true; g.add(s); }); g.position.set(0, .45, -.55); return g; };
    v.extra = (id, b) => { teamMark(S, id, b, T[id]); if(!tails[id]){ tails[id] = mkTail(); b.add(tails[id]); } };
    v.tick = (s, dt, t) => { const has = new Set(s.tail), c = [0, 0]; for(const id in tails){ tails[id].visible = has.has(id); tails[id].rotation.y = Math.sin(t*8 + id.length)*.3; } s.tail.forEach(id => c[T[id]]++);
      hud.innerHTML = teamScoreHTML(c[0] + " 🦊", c[1] + " 🦊", has.has(ctx.me) ? "You have a tail!" : ""); };
    v.onFx = (type, a, b) => { if(type === "grab"){ sfx.pop(); sfx.coin(); if(b === ctx.me) toast(`😱 ${a} stole your tail!`, 1200); if(a === ctx.me) toast("🦊 Got one!", 900); } else if(type === "miss"){ if(a === ctx.me) sfx.whoosh(); } else if(type === "j"){ if(a === ctx.me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- FLOOR IS LAVA ----------
function lavaPlats(seed){ const R = seeded(seed), P = [{ x:0, z:0, r:3.2, h:0 }]; let a = R()*6;
  for(let i=1;i<=24;i++){ a += .6 + R()*.12; const rad = 3.9 + i*.24; P.push({ x:+(Math.cos(a)*rad).toFixed(2), z:+(Math.sin(a)*rad).toFixed(2), r:+(1.55 - i*.012).toFixed(2), h:+(i*.52).toFixed(2) }); }
  for(let i=0;i<7;i++){ const b = 2 + Math.floor(R()*20), p = P[b], aa = Math.atan2(p.z, p.x) + (R() < .5 ? .5 : -.5), rad = Math.hypot(p.x, p.z) + 2.6; P.push({ x:+(Math.cos(aa)*rad).toFixed(2), z:+(Math.sin(aa)*rad).toFixed(2), r:1.2, h:+(p.h - .3).toFixed(2) }); }
  return P; }
const lavaAt = t => t < 4 ? -1 : -1 + (t - 4) * .24;
GAMES.lava = {
  name:"Floor is Lava", icon:"🌋", cat:"phys", desc:"The lava's rising. Climb!", dur:55,
  how:["Lava is rising! Climb the candy pillars","<b>JUMP</b> (Space) between them, and <b>DIVE</b> (E) in mid-air for extra distance","Touch the lava and you're out. Highest/last bean wins"],
  init(ids, ctx){ const P = lavaPlats(ctx.seed); return { P, B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*1.8, Math.sin(a)*1.8]; }), outs:[], info:{ seed:ctx.seed } }; },
  floorH(G, x, z){ let h = null; for(const p of G.P){ const R = p.r + .32; if((x - p.x)**2 + (z - p.z)**2 < R*R && (h == null || p.h > h)) h = p.h; } return h; },
  tick(G, dt, inp, H){ G.lava = lavaAt(G.t);
    physStep(G, dt, inp, { floorH:(x, z) => this.floorH(G, x, z), speed:6.6, dash:10, dashT:.3, jumpV:10.5, outY:-30 });
    G.ids.forEach(id => { const b = G.B[id]; if(b.alive && b.y < G.lava){ b.alive = false; G.outs.push(id); fxp(G, "burn", id, +b.x.toFixed(1), +b.z.toFixed(1)); } });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(this.timeout(G)); },
  timeout(G){ const alive = G.ids.filter(id => G.B[id].alive); return byScore(alive, id => Math.round(G.B[id].y * 10)).concat(G.outs.slice().reverse().map(id => [id])); },
  drop(G, id){ const b = G.B[id]; if(b && b.alive){ b.alive = false; G.outs.push(id); } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive) return null; const cur = this.floorH(G, b.x, b.z);
    if(!b.air && (b.goal == null || rand() < .01 || (cur != null && Math.abs(cur - G.P[b.goal].h) < .05 && Math.hypot(b.x - G.P[b.goal].x, b.z - G.P[b.goal].z) < G.P[b.goal].r))){
      let best = -1, bd = 1e9; G.P.forEach((p, i) => { const dh = p.h - (cur == null ? b.y : cur), d = Math.hypot(p.x - b.x, p.z - b.z) - p.r; if(dh > .1 && dh < 1.1){ const sc = d - dh*2 + rand() + (d < 4.2 ? 0 : 50); if(sc < bd){ bd = sc; best = i; } } }); if(best >= 0) b.goal = best; }
    if(b.goal == null) return { x:(rand() - .5)*.3, y:(rand() - .5)*.3 }; const p = G.P[b.goal], d = Math.hypot(p.x - b.x, p.z - b.z), r = toward(b, p.x, p.z, d < p.r*.6 ? .3 : 1);
    const curP = cur == null ? null : G.P.find(q => q.h === cur && (b.x - q.x)**2 + (b.z - q.z)**2 < q.r*q.r), edge = curP ? curP.r - Math.hypot(b.x - curP.x, b.z - curP.z) : 0;
    r.j = !b.air && p.h > (cur || 0) + .1 && (d - p.r < 1.5 || edge < .5 && d - p.r < 3.8) ? 1 : 0; r.a = b.air && b.vy < -1 && d - p.r > .9 && b.y > p.h - .3 && b.cd <= 0 && rand() < .3 ? 1 : 0; if(!b.air && !r.j && cur != null && edge < .35 && d - p.r >= 3.8){ r.x = (curP.x - b.x); r.y = (curP.z - b.z); b.goal = null; } return r; },
  snap(G){ return { B:physSnap(G.B), L:+(G.lava || -1).toFixed(2), fx:G.fx }; },
  view(root, ctx){ const P = lavaPlats(ctx.info.seed); return physView(root, ctx, { sky:"#ff9a5a", sky2:"#ffd0e0", goo:"#ff5a1a", fog:"#ffb8a0", cam:[0, 21, 8], look:[0, 0, 0], fogAdd:25, jump:true, pred:{ speed:6.6 } }, (S, v) => {
    S.goo.visible = false; const cols = ["#ff7ab8", "#ffd23a", "#7ae0ff", "#9aff8a", "#c79aff", "#ffffff"];
    const pil = P.map((p, i) => { const len = p.h + 14, mats = [new THREE.MeshStandardMaterial({ map:stripeTex(cols[i % 6], "#ffffff", 12, [1, len/3]), roughness:.4, transparent:true }), new THREE.MeshStandardMaterial({ color:cols[i % 6], roughness:.35, transparent:true }), new THREE.MeshStandardMaterial({ color:"#fff" })], m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, len, 28), mats);
      m.position.set(p.x, p.h - len/2, p.z); m.receiveShadow = true; m.castShadow = true; S.scene.add(m); return { p, mats }; });
    const lavaT = cTex(256, 256, (x, w) => { x.fillStyle = "#e83a00"; x.fillRect(0, 0, w, w); for(let i=0;i<45;i++){ x.fillStyle = pick(["#ff6a10", "#ff5a00", "#ff8a20", "#c82a00"]); x.globalAlpha = .6; x.beginPath(); x.arc(rand()*w, rand()*w, 8 + rand()*20, 0, 7); x.fill(); } x.globalAlpha = 1; }, [6, 6]);
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map:lavaT, emissive:"#ff3a00", emissiveIntensity:.35, roughness:.6 })); lava.rotation.x = -Math.PI/2; S.scene.add(lava);
    const hud = raceHud(root); let fy = 0;
    v.tick = (s, dt, t) => { lava.position.y = lerp(lava.position.y, s.L, Math.min(1, dt*5)); lavaT.offset.set(t*.02, t*.013);
      const me = s.B[ctx.me] && s.B[ctx.me][4] ? s.B[ctx.me] : Object.values(s.B).filter(b => b[4]).sort((a, b) => b[2] - a[2])[0]; if(me) fy = lerp(fy, Math.max(0, me[2]), Math.min(1, dt*3)); S.fy = fy;
      pil.forEach(q => { const o = q.p.h > fy + 3.2 ? .22 : 1; if(q.o !== o){ q.o = o; q.mats[0].opacity = q.mats[1].opacity = o; q.mats[0].depthWrite = q.mats[1].depthWrite = o === 1; } }); S.fx = lerp(S.fx, me ? me[0] : 0, .08); S.fz = lerp(S.fz, me ? me[1] : 0, .08); S.place();
      const my = s.B[ctx.me]; hud.innerHTML = my ? (my[4] ? `<b>${Math.max(0, my[2] - s.L).toFixed(1)}m</b><span>above the lava</span>` : `<b>🔥 Toasted</b>`) : ""; };
    v.extra = (id, b, s) => { if(!s[4]) b.visible = false; };
    v.onFx = (type, a) => { if(type === "burn"){ sfx.boom(); if(a === ctx.me) SND.say("Too hot!"); } else if(type === "j"){ if(a === ctx.me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- SPIN CYCLE ----------
// both bars turn together a quarter turn apart, getting faster: jump the pink one, then stay down for the blue one
const spinAng = (t, k) => 1.2 + t*1 + t*t*.02 + (k ? Math.PI/2 : 0);
GAMES.spin = {
  name:"Spin Cycle", icon:"🌀", cat:"phys", desc:"Jump the low bar, stay down for the high one", dur:50,
  how:["Two giant bars spin around the platform, getting faster","<b>JUMP</b> (Space) over the <b style='color:#ff4a8a'>low pink bar</b>. Stay on the ground when the <b style='color:#3a9aff'>high blue bar</b> comes!","Get hit and you go flying. Last bean on wins"],
  init(ids){ const hits = {}; ids.forEach(id => hits[id] = 0); return { B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2 + .4; return [Math.cos(a)*5, Math.sin(a)*5]; }), outs:[], hits, R:9.4 }; },
  tick(G, dt, inp, H){ G.R = G.t < 22 ? 9.4 : Math.max(5.5, 9.4 - (G.t - 22) * .14);
    physStep(G, dt, inp, { floorH:(x, z) => Math.hypot(x, z) < G.R ? 0 : null, speed:6.4, jumpV:10.5, outY:-8, dash:11 });
    [0, 1].forEach(k => { const a = spinAng(G.t, k), a2 = spinAng(G.t + .02, k), w = (a2 - a) / .02, dx = Math.cos(a), dz = Math.sin(a);
      G.ids.forEach(id => { const b = G.B[id]; if(!b.alive || (b.wh || 0) > G.t) return; const hitY = k ? b.y > .55 : b.y < .45; if(!hitY) return;
        const along = b.x*dx + b.z*dz, px = b.x - dx*along, pz = b.z - dz*along, d = Math.hypot(px, pz); if(d > .7 || Math.abs(along) > 9.6) return;
        const tx = -dz*Math.sign(w*along), tz = dx*Math.sign(w*along), sp = Math.abs(w*along) + 5; b.vx = tx*sp + dx*Math.sign(along)*4; b.vz = tz*sp + dz*Math.sign(along)*4; b.stun = .38; b.wh = G.t + .9; b.air = true; b.vy = 5; G.hits[id]++; fxp(G, "hit", id, k); }); });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout(G){ const alive = G.ids.filter(id => G.B[id].alive); return byScore(alive, id => G.hits[id], true).concat(G.outs.slice().reverse().map(id => [id])); },
  drop(G, id){ killOut(G)(id); },
  // seconds until a bar's arm sweeps over angle th (two arms, so it comes round every half turn)
  arrive(t, k, th){ const a = spinAng(t, k), w = (spinAng(t + .02, k) - a) / .02; let d = (th - a) * Math.sign(w); d = ((d % Math.PI) + Math.PI) % Math.PI; return d / Math.abs(w); },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive) return null; const rr = Math.hypot(b.x, b.z), want = b.want || (b.want = 3.5 + rand()*2.5), sk = b.skill || (b.skill = .6 + rand()*.3);
    const wnt = Math.min(want, G.R - 1.8), r = toward(b, b.x / (rr || 1) * wnt, b.z / (rr || 1) * wnt, Math.abs(rr - wnt) > .5 ? .8 : 0); if(rr < .5){ r.x = 1; r.y = 0; }
    const th = Math.atan2(b.z, b.x), tl = this.arrive(G.t, 0, th), thi = this.arrive(G.t, 1, th);
    if(!b.air && tl > .22 && tl < .4 && !(thi < .75) && (b.tried || 0) < G.t){ b.tried = G.t + .5; if(rand() < sk) r.j = 1; } else r.j = 0; return r; },
  snap(G){ return { B:physSnap(G.B), R:+G.R.toFixed(2), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#a8a0ff", sky2:"#ffe0f8", goo:"#9a6aff", fog:"#ffe0f8", cam:[0, 18, 15], jump:true, btn:"DIVE", pred:{ speed:6.4 } }, (S, v) => {
    const top = new THREE.MeshStandardMaterial({ map:icingTex("#ffe86a", ["#fff", "#ff7ab8", "#7ad8ff", "#9a6aff"]), roughness:.5 });
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.4, 1, 64), [new THREE.MeshStandardMaterial({ color:"#e8a860" }), top, new THREE.MeshStandardMaterial({ color:"#e8a860" })]); pl.position.y = -.5; pl.receiveShadow = true; S.scene.add(pl);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, 2.4, 16), new THREE.MeshStandardMaterial({ color:"#fff" })); pole.position.y = 1.2; S.scene.add(pole);
    const bar = (col, y) => { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, 19, 16), new THREE.MeshStandardMaterial({ color:col, roughness:.3, emissive:col, emissiveIntensity:.15 })); m.rotation.z = Math.PI/2; m.position.y = y; m.castShadow = true; g.add(m); S.scene.add(g); return g; };
    const low = bar("#ff4a8a", .38), high = bar("#3a9aff", 1.75);
    v.tick = s => { const t = CM.phase === "play" ? now() - CM.playT : 0; low.rotation.y = -spinAng(t, 0); high.rotation.y = -spinAng(t, 1); const k = (s.R || 9.4) / 9.4; pl.scale.set(k, 1, k); };
    v.onFx = (type, a, b) => { if(type === "hit"){ sfx.whack(); if(a === ctx.me) toast(b ? "Stay down for the blue bar!" : "Jump the pink bar!", 1200); } else if(type === "j"){ if(a === ctx.me) sfx.boing(); } else physFx(type, a); };
  }); }
};

// ---------- MUSICAL CHAIRS ----------
GAMES.chairs = {
  name:"Musical Chairs", icon:"🪑", cat:"phys", desc:"When the music stops, grab a cushion!", dur:60,
  how:["Keep moving while the music plays","When it <b>STOPS</b>, run to a cushion. There's one fewer than players!","No cushion = out. <b>DIVE</b> (E) to knock people away. Last bean wins"],
  init(ids){ return { B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*4.5, Math.sin(a)*4.5]; }), outs:[], ph:"walk", pend:4 + rand()*3, cush:[], seat:{} }; },
  tick(G, dt, inp, H){ const alive = G.ids.filter(id => G.B[id].alive);
    if(G.ph === "walk" && G.t >= G.pend){ G.ph = "grab"; G.pend = G.t + 4; G.seat = {}; const n = alive.length - 1; G.cush = [];
      for(let i=0;i<n;i++){ let x, z, ok, k = 0; do { const a = rand()*Math.PI*2, r = 1.5 + rand()*5; x = Math.cos(a)*r; z = Math.sin(a)*r; ok = G.cush.every(c => Math.hypot(c.x - x, c.z - z) > 2); } while(!ok && ++k < 40); G.cush.push({ x, z, by:null }); }
      fxp(G, "stop"); G.dirty = true; }
    const frozen = new Set(Object.keys(G.seat));
    physStep(G, dt, inp, { wall:{ r:8.5 }, speed:7, dash:13 });
    frozen.forEach(id => { const b = G.B[id], c = G.cush[G.seat[id]]; b.x = c.x; b.z = c.z; b.vx = b.vz = 0; });
    if(G.ph === "grab"){ G.cush.forEach((c, i) => { if(c.by) return; for(const id of alive){ if(G.seat[id] != null) continue; const b = G.B[id]; if(Math.hypot(b.x - c.x, b.z - c.z) < .85){ c.by = id; G.seat[id] = i; fxp(G, "sit", id); G.dirty = true; break; } } });
      if(G.cush.every(c => c.by) && G.pend > G.t + .8) G.pend = G.t + .8;
      if(G.t >= G.pend){ alive.forEach(id => { if(G.seat[id] == null){ G.B[id].alive = false; G.outs.push(id); fxp(G, "out", id); } }); G.ph = "walk"; G.pend = G.t + 3 + rand()*3.5; G.cush = []; G.seat = {}; G.dirty = true; } }
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout:outRank, drop(G, id){ killOut(G)(id); },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive) return null;
    if(G.ph === "walk"){ b.react = .25 + rand()*.55; const a = Math.atan2(b.z, b.x) + .9, r = 4.5; return toward(b, Math.cos(a)*r, Math.sin(a)*r, .7); }
    if(G.seat[id] != null) return { x:0, y:0 }; if(G.t < G.pend - 4 + (b.react || .4)) return null;
    let best = null, bd = 1e9; G.cush.forEach(c => { if(c.by) return; const d = Math.hypot(c.x - b.x, c.z - b.z); if(d < bd){ bd = d; best = c; } }); if(!best) return { x:0, y:0 };
    const r = toward(b, best.x, best.z); r.a = bd > 1.5 && bd < 3.2 && rand() < .08 ? 1 : 0; return r; },
  snap(G){ return { B:physSnap(G.B), ph:G.ph, c:G.cush.map(c => [+c.x.toFixed(2), +c.z.toFixed(2), c.by ? 1 : 0]), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#ffd0f0", sky2:"#d8f0ff", goo:"#ff9ad8", fog:"#e8e0ff", cam:[0, 17, 14] }, (S, v) => {
    const top = new THREE.MeshStandardMaterial({ map:cTex(512, 512, (x, w) => { x.fillStyle = "#c8a0ff"; x.fillRect(0, 0, w, w); x.strokeStyle = "#e8d8ff"; x.lineWidth = 14; for(let r=40;r<w/2;r+=50){ x.beginPath(); x.arc(w/2, w/2, r, 0, 7); x.stroke(); } }), roughness:.5 });
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, .6, 64), [new THREE.MeshStandardMaterial({ color:"#9a6aff" }), top, top]); fl.position.y = -.3; fl.receiveShadow = true; S.scene.add(fl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.7, .25, 10, 64), new THREE.MeshStandardMaterial({ color:"#ffd23a" })); rim.rotation.x = Math.PI/2; rim.position.y = .1; S.scene.add(rim);
    const cm = new THREE.MeshStandardMaterial({ color:"#ff4a8a", roughness:.6 }), cm2 = new THREE.MeshStandardMaterial({ color:"#ffd23a", roughness:.6 }), cush = [];
    const getC = i => cush[i] || (cush[i] = (() => { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(.75, .8, .3, 20), cm); m.position.y = .15; m.castShadow = true; g.add(m); const b = new THREE.Mesh(new THREE.TorusGeometry(.72, .07, 8, 20), cm2); b.rotation.x = Math.PI/2; b.position.y = .3; g.add(b); S.scene.add(g); return g; })());
    const hud = hudEl(root, "chairs-hud"), notes = []; let ph = "";
    v.tick = (s, dt, t) => { cush.forEach(c => c.visible = false); s.c.forEach((c, i) => { const g = getC(i); g.visible = true; g.position.set(c[0], 0, c[1]); if(!g.userData.t0 || g.userData.st !== s.ph){ g.userData.t0 = t; g.userData.st = s.ph; } g.scale.setScalar(Math.min(1, (t - g.userData.t0) * 6)); });
      if(s.ph !== ph){ ph = s.ph; if(ph === "walk"){ SND.music("chairs"); hud.innerHTML = "🎵 Keep moving…"; hud.className = "chairs-hud"; } else { SND.music(""); sfx.whistle(); SND.say("Grab a cushion!"); hud.innerHTML = "🛑 STOP! GRAB A CUSHION!"; hud.className = "chairs-hud stop"; } } };
    v.onFx = (type, a) => { if(type === "sit"){ sfx.pop(); if(a === ctx.me) toast("🪑 Safe!", 900); } else if(type === "out"){ sfx.lose(); if(a === ctx.me) SND.say("You're out!"); } else if(type === "stop"){} else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); SND.music("game"); d0(); };
  }); }
};

// ---------- INFECTION ----------
const INF_PILLARS = [[-6, -3.5], [6, 3.5], [-6, 3.5], [6, -3.5], [0, 0], [-2.5, -5.2], [2.5, 5.2]];
GAMES.infect = {
  name:"Infection", icon:"🧟", cat:"phys", desc:"Humans vs zombies. Don't get tagged!", dur:50,
  how:["One or two beans start as <b>zombies</b> 🧟 (they wake up after 2 seconds). Their touch turns you into one","Humans: run, <b>JUMP</b> and hide behind the pillars. Zombies: hunt them down (<b>LUNGE</b> with E)","Survive till the end to win. Zombies score for every tag"],
  init(ids){ const z = {}, n = ids.length >= 6 ? 2 : 1; shuffle(ids).slice(0, n).forEach(id => z[id] = 0); const B = physInit(ids, (i, k) => { const a = i / k * Math.PI * 2; return [Math.cos(a)*8, Math.sin(a)*5.5]; });
    Object.keys(z).forEach((id, i) => { B[id].x = (i ? 2 : -2); B[id].z = 0; }); const ht = {}, tags = {}; ids.forEach(id => { ht[id] = 0; tags[id] = 0; }); return { B, z, ht, tags, outs:[], info:{ z:Object.keys(z) } }; },
  introNote(info, me){ return info.z.includes(me) ? "🧟 <b>You start as a ZOMBIE!</b> Tag everyone" : `🧍 You're human. Watch out for <b>${info.z.map(esc).join(" & ")}</b>`; },
  tick(G, dt, inp, H){ G.ids.forEach(id => { const isZ = G.z[id] != null; G.B[id].boost = isZ ? .85 : 1; if(!isZ) G.ht[id] += dt; });
    const I = G.t < 2.5 ? Object.fromEntries(G.ids.map(id => [id, G.z[id] != null ? {} : inp[id] || {}])) : inp;
    physStep(G, dt, I, { wall:{ w:26, h:18 }, speed:7, dash:11.5, dashCd:2.2, floorH:() => 0, jumpV:9,
      onTouch:(a, b) => { const za = G.z[a] != null, zb = G.z[b] != null; if(za === zb) return; const zid = za ? a : b, hid = za ? b : a; if((G.z[zid] || 0) > G.t) return; G.z[hid] = G.t + .6; G.tags[zid]++; fxp(G, "inf", hid, zid); G.dirty = true; } });
    G.ids.forEach(id => INF_PILLARS.forEach(([x, z]) => pushOutCirc(G.B[id], x, z, 1.5)));
    if(G.ids.every(id => G.z[id] != null) && G.t > 1) H.end(this.timeout(G)); },
  timeout(G){ return byScore(G.ids, id => Math.round((G.ht[id] + G.tags[id]*5 + (G.z[id] == null ? 100 : 0)) * 10)); },
  drop(G, id){ G.z[id] = G.t; },
  bot(G, id){ const b = G.B[id]; if(!b) return null; const isZ = G.z[id] != null;
    if(isZ){ const [k, d] = nearest(G, id, k => G.z[k] == null); if(!k) return { x:0, y:0 }; const c = G.B[k], r = toward(b, c.x + c.vx*.35, c.z + c.vz*.35); r.a = d < 2.6 && rand() < .07 ? 1 : 0; return r; }
    // try 12 directions: pick the one that keeps us furthest from zombies a moment from now, without running into walls
    const Z = G.ids.filter(k => G.z[k] != null).map(k => G.B[k]); let best = null, bs = -1e9;
    for(let i=0;i<12;i++){ const a = i / 12 * Math.PI * 2 + (b.ph || (b.ph = rand())), px = b.x + Math.cos(a)*4, pz = b.z + Math.sin(a)*4;
      let sc = Math.min(...Z.map(c => Math.hypot(c.x + c.vx*.5 - px, c.z + c.vz*.5 - pz))); sc -= Math.max(0, Math.abs(px) - 11.5)*3 + Math.max(0, Math.abs(pz) - 7.5)*3; sc -= INF_PILLARS.some(([x, z]) => Math.hypot(x - px, z - pz) < 1.6) ? 2 : 0; if(sc > bs){ bs = sc; best = a; } }
    const [, d] = nearest(G, id, k => G.z[k] != null); if(d > 9) return { x:(rand() - .5)*.3, y:(rand() - .5)*.3 }; return { x:Math.cos(best), y:Math.sin(best), j:d < 1.6 && rand() < .1 ? 1 : 0 }; },
  snap(G){ return { B:physSnap(G.B), z:Object.keys(G.z), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#4a3a6a", sky2:"#b8e0a0", goo:"#5ac85a", fog:"#a8c8a0", cam:[0, 20, 15], jump:true, btn:"LUNGE", pred:{ speed:7 } }, (S, v) => {
    floorBox(S, 26, 18, new THREE.MeshStandardMaterial({ map:cTex(256, 256, (x, w) => { x.fillStyle = "#9ad08a"; x.fillRect(0, 0, w, w); for(let i=0;i<300;i++){ x.fillStyle = pick(["#8ac07a", "#aae09a", "#7ab06a"]); x.fillRect(rand()*w, rand()*w, 4, 10); } }, [3, 2]), roughness:.9 })); wallRing(S, 26, 18, "#6a5a8a");
    INF_PILLARS.forEach(([x, z], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 2.6, 18), new THREE.MeshStandardMaterial({ map:stripeTex(["#ff7ab8", "#7ad8ff", "#ffd23a"][i % 3], "#fff", 10, [2, 1]) })); m.position.set(x, 1.3, z); m.castShadow = true; S.scene.add(m); });
    const hud = raceHud(root), zMat = new THREE.MeshStandardMaterial({ color:"#7ad83a", roughness:.6, emissive:"#2a6a0a", emissiveIntensity:.35 });
    v.tick = s => { const Z = new Set(s.z); S.beans.forEach((b, id) => { const isZ = Z.has(id); if(b.userData.isZ === isZ) return; b.userData.isZ = isZ; const body = b.userData.body.children[0]; if(!b.userData.orig) b.userData.orig = body.material; body.material = isZ ? zMat : b.userData.orig; const tag = S.tags.get(id); if(tag) tag.textContent = (isZ ? "🧟 " : "") + id; });
      const humans = Object.keys(s.B).filter(id => !Z.has(id)).length; hud.innerHTML = Z.has(ctx.me) ? `<b>🧟 ZOMBIE</b><span>${humans} human${humans === 1 ? "" : "s"} left</span>` : `<b>🧍 Human</b><span>${humans} left. Stay alive!</span>`; };
    v.onFx = (type, a, b) => { if(type === "inf"){ sfx.wrong(); sfx.bump(); if(a === ctx.me){ toast(`🧟 ${b} got you! Now tag the others`, 1800); SND.say("Braaains"); } } else if(type === "j"){ if(a === ctx.me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- BEAN FOOTBALL (teams) ----------
const FW = 26, FH = 16, GOAL = 2.7;
GAMES.football = {
  name:"Bean Football", icon:"⚽", cat:"phys", desc:"Pink vs Blue. Score in their goal!", dur:55, team:true,
  how:["Push the giant ball into the other team's goal","Tap <b>KICK</b> (or <b>E</b>) when the ball's in front of you for a big shot","Most goals when time's up wins"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, () => [0, 0]); const G = { B, T, ball:{ x:0, z:0, vx:0, vz:0 }, goals:[0, 0], sc:{}, touch:{}, last:null, pause:0, outs:[], info:{ T } }; ids.forEach(id => { G.sc[id] = 0; }); this.reset(G); return G; },
  introNote(info, me){ const t = info.T[me]; return t == null ? "" : `${teamNote(info, me)}. Score in the <b>${t ? "LEFT" : "RIGHT"}</b> goal!`; },
  reset(G){ [0, 1].forEach(t => { const m = G.ids ? G.ids.filter(id => G.T[id] === t) : Object.keys(G.T).filter(id => G.T[id] === t); m.forEach((id, i) => { const b = G.B[id]; Object.assign(b, { x:(t ? 1 : -1) * (4 + (i % 2)*3.5), z:(i - (m.length - 1)/2) * 2.6, vx:0, vz:0, f:t ? -Math.PI/2 : Math.PI/2, stun:0 }); }); });
    Object.assign(G.ball, { x:0, z:0, vx:0, vz:0 }); },
  tick(G, dt, inp, H){ if(G.pause > G.t){ return; }
    physStep(G, dt, inp, { wall:{ w:FW, h:FH }, speed:7.2, act:(id, b) => { if(b.cd > 0) return; b.cd = .5; const bl = G.ball, dx = bl.x - b.x, dz = bl.z - b.z, d = Math.hypot(dx, dz);
      if(d < 1.9 && (dx*Math.sin(b.f) + dz*Math.cos(b.f)) / (d || 1) > .2){ bl.vx = Math.sin(b.f)*17 + dx/d*3; bl.vz = Math.cos(b.f)*17 + dz/d*3; G.last = id; G.touch[id] = (G.touch[id] || 0) + 1; fxp(G, "kick", id); } else { b.vx += Math.sin(b.f)*5; b.vz += Math.cos(b.f)*5; } } });
    const bl = G.ball, R = .8; bl.x += bl.vx*dt; bl.z += bl.vz*dt; const fr = Math.max(0, 1 - .75*dt); bl.vx *= fr; bl.vz *= fr;
    G.ids.forEach(id => { const b = G.B[id], dx = bl.x - b.x, dz = bl.z - b.z, d = Math.hypot(dx, dz); if(d < R + .5 && d > 1e-4){ const nx = dx/d, nz = dz/d; bl.x = b.x + nx*(R + .5); bl.z = b.z + nz*(R + .5); const vn = (b.vx - bl.vx)*nx + (b.vz - bl.vz)*nz; if(vn > 0){ bl.vx += nx*vn*1.3; bl.vz += nz*vn*1.3; } G.last = id; } });
    if(Math.abs(bl.z) > FH/2 - R){ bl.z = Math.sign(bl.z)*(FH/2 - R); bl.vz *= -.8; }
    if(Math.abs(bl.x) > FW/2 - R){ if(Math.abs(bl.z) < GOAL){ if(Math.abs(bl.x) > FW/2 + .6){ const t = bl.x > 0 ? 0 : 1; G.goals[t]++; if(G.last && G.T[G.last] === t) G.sc[G.last] += 3; fxp(G, "goal", t, G.last || ""); G.pause = G.t + 1.6; G.dirty = true; this.reset(G); } }
      else { bl.x = Math.sign(bl.x)*(FW/2 - R); bl.vx *= -.8; } }
    if(Math.abs(bl.x) > FW/2 - R && Math.abs(bl.z) < GOAL + R && Math.abs(bl.z) > GOAL - .2){ bl.z = Math.sign(bl.z)*(GOAL + R); bl.vz *= -.6; } },
  timeout(G){ const g = G.goals; return teamRank(G, g[0] === g[1] ? -1 : g[0] > g[1] ? 0 : 1, id => G.sc[id] + (G.touch[id] || 0)*.2); },
  drop(G, id){},
  bot(G, id){ const b = G.B[id]; if(!b) return null; const t = G.T[id], bl = G.ball, gx = t ? -FW/2 : FW/2, own = -gx, mates = G.ids.filter(k => G.T[k] === t), role = mates.indexOf(id);
    if(mates.length >= 3 && role === mates.length - 1 && Math.sign(bl.x) !== Math.sign(gx)){ return toward(b, own*.78, clamp(bl.z*.5, -3, 3), Math.hypot(b.x - own*.78, b.z - bl.z*.5) > .6 ? 1 : 0); }
    const ax = gx - bl.x, az = -bl.z, am = Math.hypot(ax, az) || 1, px = bl.x - ax/am*1.5, pz = bl.z - az/am*1.5, dP = Math.hypot(px - b.x, pz - b.z), dB = Math.hypot(bl.x - b.x, bl.z - b.z);
    if(dP > 1.1 && dB > 1.6 || (b.x - bl.x)*Math.sign(gx) > 0){ const side = (b.x - bl.x)*Math.sign(gx) > 0 ? (b.z > bl.z ? 1.6 : -1.6) : 0; return toward(b, px, pz + side); }
    const r = toward(b, bl.x, bl.z); r.a = dB < 1.8 && rand() < .12 ? 1 : 0; return r; },
  snap(G){ return { B:physSnap(G.B), b:[+G.ball.x.toFixed(2), +G.ball.z.toFixed(2)], g:G.goals, fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T; return physView(root, ctx, { sky:"#7ac8ff", sky2:"#e8f8ff", goo:"#3a9a4a", fog:"#e0f0ff", cam:[0, 21, 15], btn:"KICK", portrait:{ cam:[-20, 24, 0], look:[1.5, 0, 0], a:.62 }, pred:{ speed:7.2 } }, (S, v) => {
    floorBox(S, FW + 3, FH, new THREE.MeshStandardMaterial({ map:cTex(512, 320, (x, w, h) => { for(let i=0;i<10;i++){ x.fillStyle = i % 2 ? "#5ac85a" : "#4ab84a"; x.fillRect(i*w/10, 0, w/10, h); } x.strokeStyle = "#fff"; x.lineWidth = 4; const m = 12; x.strokeRect(m, 4, w - 2*m, h - 8); x.beginPath(); x.moveTo(w/2, 4); x.lineTo(w/2, h - 4); x.stroke(); x.beginPath(); x.arc(w/2, h/2, 36, 0, 7); x.stroke(); x.strokeRect(m, h/2 - 60, 40, 120); x.strokeRect(w - m - 40, h/2 - 60, 40, 120); }), roughness:.85 }));
    const wm = new THREE.MeshStandardMaterial({ color:"#fff", roughness:.4 }); [[0, FH/2 + .2, FW + .8, .4], [0, -FH/2 - .2, FW + .8, .4]].forEach(([x, z, a, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(a, .9, d), wm); m.position.set(x, .45, z); S.scene.add(m); });
    [-1, 1].forEach(sd => { const len = FH/2 - GOAL; [1, -1].forEach(zs => { const m = new THREE.Mesh(new THREE.BoxGeometry(.4, .9, len), wm); m.position.set(sd*(FW/2 + .2), .45, zs*(GOAL + len/2)); S.scene.add(m); });
      const col = TEAM_COL[sd > 0 ? 1 : 0], gm = new THREE.MeshStandardMaterial({ color:col, roughness:.4 }), net = new THREE.MeshStandardMaterial({ color:"#fff", transparent:true, opacity:.35, side:THREE.DoubleSide });
      [GOAL, -GOAL].forEach(z => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 2.2, 10), gm); p.position.set(sd*FW/2, 1.1, z); S.scene.add(p); }); const cb = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, GOAL*2, 10), gm); cb.rotation.x = Math.PI/2; cb.position.set(sd*FW/2, 2.2, 0); S.scene.add(cb);
      const n = new THREE.Mesh(new THREE.PlaneGeometry(GOAL*2, 2.2), net); n.rotation.y = Math.PI/2; n.position.set(sd*(FW/2 + 1.4), 1.1, 0); S.scene.add(n); });
    const ballT = cTex(256, 128, (x, w, h) => { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.fillStyle = "#222"; for(let i=0;i<8;i++) for(let j=0;j<4;j++) if((i + j) % 2){ x.beginPath(); x.arc(i*32 + 16, j*32 + 16, 10, 0, 7); x.fill(); } });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.8, 24, 18), new THREE.MeshStandardMaterial({ map:ballT, roughness:.4 })); ball.castShadow = true; ball.position.y = .8; S.scene.add(ball);
    const hud = scoreHud(root), big = document.createElement("div"); big.className = "goal-pop"; root.appendChild(big); let lx = 0, lz = 0;
    v.extra = (id, b) => teamMark(S, id, b, T[id]);
    v.tick = (s, dt) => { const k = Math.min(1, dt*14); ball.position.x = lerp(ball.position.x, s.b[0], k); ball.position.z = lerp(ball.position.z, s.b[1], k); const dx = ball.position.x - lx, dz = ball.position.z - lz; lx = ball.position.x; lz = ball.position.z; ball.rotation.z -= dx / .8; ball.rotation.x += dz / .8;
      hud.innerHTML = teamScoreHTML(s.g[0], s.g[1]); CTL.map = root.clientWidth < root.clientHeight ? (x, y) => [-y, x] : null; };
    v.onFx = (type, a, b) => { if(type === "kick"){ sfx.whack(); } else if(type === "goal"){ sfx.crown(); SND.say("Goal!"); big.innerHTML = `GOAL!<small>${TEAM_NAME[a]}${b ? " · " + esc(b) : ""}</small>`; big.style.color = TEAM_COL[a]; big.classList.remove("on"); void big.offsetWidth; big.classList.add("on"); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); big.remove(); d0(); };
  }); }
};

// ---------- PAINT WARS (teams) ----------
const PN = 24, PS = 20 / 24;
const paintIdx = (x, z) => { const i = Math.floor((x + 10) / PS), j = Math.floor((z + 10) / PS); return i < 0 || j < 0 || i >= PN || j >= PN ? -1 : j*PN + i; };
GAMES.paint = {
  name:"Paint Wars", icon:"🎨", cat:"phys", desc:"Cover the floor in your team's colour", dur:45, team:true,
  how:["Everywhere you walk gets painted your team's colour","<b>SPLAT</b> (or <b>E</b>) to dive and paint a big blob","Most floor painted when time's up wins. Paint over theirs!"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, () => [0, 0]), n = {}; [0, 1].forEach(t => { const m = ids.filter(id => T[id] === t); m.forEach((id, i) => { B[id].x = (t ? 7 : -7); B[id].z = (i - (m.length - 1)/2)*2.4; }); }); ids.forEach(id => n[id] = 0);
    return { B, T, grid:Array(PN*PN).fill(0), n, outs:[], info:{ T } }; },
  introNote:teamNote,
  paintAt(G, id, x, z, r){ const t = G.T[id] + 1; for(let dz = -r; dz <= r + 1e-6; dz += PS) for(let dx = -r; dx <= r + 1e-6; dx += PS){ if(dx*dx + dz*dz > r*r + .01) continue; const k = paintIdx(x + dx, z + dz); if(k >= 0 && G.grid[k] !== t){ G.grid[k] = t; G.n[id]++; G.dirty = true; } } },
  tick(G, dt, inp, H){
    physStep(G, dt, inp, { wall:{ w:20, h:20 }, speed:7.4, dash:14, act:(id, b) => { if(b.cd > 0) return; b.cd = 1; b.dash = .3; b.vx = Math.sin(b.f)*14; b.vz = Math.cos(b.f)*14; b.splat = G.t + .3; fxp(G, "d", id); } });
    G.ids.forEach(id => { const b = G.B[id]; this.paintAt(G, id, b.x, b.z, b.dash > 0 ? .9 : .45); if(b.splat && G.t >= b.splat){ b.splat = 0; this.paintAt(G, id, b.x, b.z, 2.1); fxp(G, "splat", id, +b.x.toFixed(1), +b.z.toFixed(1)); } }); },
  count(G){ const c = [0, 0]; G.grid.forEach(v => { if(v) c[v - 1]++; }); return c; },
  timeout(G){ const c = this.count(G); return teamRank(G, c[0] === c[1] ? -1 : c[0] > c[1] ? 0 : 1, id => G.n[id]); },
  drop(G, id){},
  bot(G, id){ const b = G.B[id]; if(!b) return null; const mine = G.T[id] + 1;
    if(b.tg == null || G.grid[b.tg] === mine || rand() < .008){ let best = -1, bs = 1e9; for(let k=0;k<20;k++){ const c = Math.floor(rand()*PN*PN); if(G.grid[c] === mine) continue; const x = (c % PN + .5)*PS - 10, z = (Math.floor(c / PN) + .5)*PS - 10, d = Math.hypot(x - b.x, z - b.z) + (G.grid[c] ? -2 : 0); if(d < bs){ bs = d; best = c; } } b.tg = best; }
    if(b.tg < 0) return { x:(rand() - .5), y:(rand() - .5) }; const x = (b.tg % PN + .5)*PS - 10, z = (Math.floor(b.tg / PN) + .5)*PS - 10, r = toward(b, x, z); r.a = rand() < .015 ? 1 : 0; return r; },
  snap(G){ return { B:physSnap(G.B), g:G.grid.join(""), fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T; return physView(root, ctx, { sky:"#ffe8a0", sky2:"#e0f0ff", goo:"#ffd23a", fog:"#fff0d0", cam:[0, 21, 15], btn:"SPLAT", pred:{ speed:7.4 } }, (S, v) => {
    const cv = document.createElement("canvas"); cv.width = cv.height = PN*12; const cx = cv.getContext("2d"); cx.fillStyle = "#f4f0ff"; cx.fillRect(0, 0, cv.width, cv.height); cx.strokeStyle = "#e4dcf4"; for(let i=0;i<=PN;i++){ cx.beginPath(); cx.moveTo(i*12, 0); cx.lineTo(i*12, cv.height); cx.moveTo(0, i*12); cx.lineTo(cv.width, i*12); cx.stroke(); }
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; const fl = new THREE.Mesh(new THREE.BoxGeometry(20, .6, 20), [0, 0, new THREE.MeshStandardMaterial({ map:tex, roughness:.6 }), 0, 0, 0].map(m => m || new THREE.MeshStandardMaterial({ color:"#d8d0e8" }))); fl.position.y = -.3; fl.receiveShadow = true; S.scene.add(fl);
    wallRing(S, 20, 20, "#ffffff"); let last = "", hud = scoreHud(root);
    v.extra = (id, b) => teamMark(S, id, b, T[id]);
    v.tick = s => { if(s.g !== last){ for(let k=0;k<s.g.length;k++){ if(s.g[k] === last[k]) continue; const i = k % PN, j = Math.floor(k / PN); cx.fillStyle = s.g[k] === "1" ? TEAM_COL[0] : s.g[k] === "2" ? TEAM_COL[1] : "#f4f0ff"; cx.fillRect(i*12, j*12, 12, 12); } last = s.g; tex.needsUpdate = true;
        let a = 0, b = 0; for(const c of s.g){ if(c === "1") a++; else if(c === "2") b++; } const tot = PN*PN; hud.innerHTML = teamScoreHTML(Math.round(a / tot * 100) + "%", Math.round(b / tot * 100) + "%", `<span class="th-bar"><i style="width:${a / tot * 100}%;background:${TEAM_COL[0]}"></i><i style="width:${b / tot * 100}%;background:${TEAM_COL[1]};margin-left:auto"></i></span>`); } };
    v.onFx = (type, a) => { if(type === "splat") sfx.splash(); else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- SNOWBALL FIGHT (teams) ----------
const SNW = 24, SNH = 16, SNOW_WALLS = [[-5, -3, 1.6, .5], [5, 3, 1.6, .5], [-5, 3.6, .5, 1.4], [5, -3.6, .5, 1.4], [0, 0, .5, 2]];
GAMES.snowball = {
  name:"Snowball Fight", icon:"☃️", cat:"phys", desc:"Freeze the other team with snowballs", dur:50, team:true,
  how:["Tap <b>THROW</b> (or <b>E</b>) to throw a snowball the way you're facing","Get hit and you're frozen solid! A teammate can <b>touch you to thaw you</b>","Freeze the whole other team to win instantly, or most hits when time's up"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, () => [0, 0]), hits = {}; [0, 1].forEach(t => { const m = ids.filter(id => T[id] === t); m.forEach((id, i) => { Object.assign(B[id], { x:(t ? 9.5 : -9.5), z:(i - (m.length - 1)/2)*2.4, f:t ? -Math.PI/2 : Math.PI/2 }); }); }); ids.forEach(id => hits[id] = 0);
    return { B, T, hits, fr:{}, balls:[], outs:[], won:null, info:{ T } }; },
  introNote:teamNote,
  tick(G, dt, inp, H){ const frozen = id => (G.fr[id] || 0) > G.t;
    const I = {}; G.ids.forEach(id => I[id] = frozen(id) ? {} : inp[id] || {});
    physStep(G, dt, I, { wall:{ w:SNW, h:SNH }, speed:7, act:(id, b) => { if(b.cd > 0 || frozen(id)) return; b.cd = .55; G.balls.push({ x:b.x + Math.sin(b.f)*.7, z:b.z + Math.cos(b.f)*.7, vx:Math.sin(b.f)*18, vz:Math.cos(b.f)*18, own:id, life:1 }); fxp(G, "t", id); } });
    G.ids.forEach(id => { const b = G.B[id]; if(frozen(id)){ b.vx = b.vz = 0; } SNOW_WALLS.forEach(([x, z, w, d]) => pushOutBox(b, x, z, w, d)); });
    G.ids.forEach(id => { if(!frozen(id)) return; const b = G.B[id]; for(const k of G.ids){ if(k === id || G.T[k] !== G.T[id] || frozen(k)) continue; const c = G.B[k]; if(Math.hypot(c.x - b.x, c.z - b.z) < 1.25){ G.fr[id] = 0; fxp(G, "thaw", id, k); G.dirty = true; break; } } });
    G.balls = G.balls.filter(s => { s.x += s.vx*dt; s.z += s.vz*dt; s.life -= dt; if(s.life <= 0 || Math.abs(s.x) > SNW/2 || Math.abs(s.z) > SNH/2) return false;
      if(SNOW_WALLS.some(([x, z, w, d]) => Math.abs(s.x - x) < w + .15 && Math.abs(s.z - z) < d + .15)){ fxp(G, "poof", +s.x.toFixed(1), +s.z.toFixed(1)); return false; }
      for(const id of G.ids){ if(G.T[id] === G.T[s.own] || frozen(id)) continue; const b = G.B[id]; if(Math.hypot(b.x - s.x, b.z - s.z) < .8){ G.fr[id] = G.t + 3.2; G.hits[s.own]++; b.vx = s.vx*.3; b.vz = s.vz*.3; fxp(G, "hit", id, s.own); G.dirty = true; return false; } }
      return true; });
    [0, 1].forEach(t => { const m = G.ids.filter(id => G.T[id] === t && playerOf(id)); if(m.length && m.every(frozen) && G.won == null){ G.won = 1 - t; H.end(this.timeout(G)); } }); },
  timeout(G){ let w = G.won; if(w == null){ const s = [0, 0]; G.ids.forEach(id => s[G.T[id]] += G.hits[id]); w = s[0] === s[1] ? -1 : s[0] > s[1] ? 0 : 1; } return teamRank(G, w, id => G.hits[id]); },
  drop(G, id){ G.fr[id] = 1e9; },
  bot(G, id){ const b = G.B[id]; if(!b || (G.fr[id] || 0) > G.t) return null; const t = G.T[id];
    const [ice, di] = nearest(G, id, k => G.T[k] === t && (G.fr[k] || 0) > G.t); if(ice && di < 7) return toward(b, G.B[ice].x, G.B[ice].z);
    const [en, de] = nearest(G, id, k => G.T[k] !== t && !((G.fr[k] || 0) > G.t)); if(!en) return { x:(rand() - .5)*.3, y:(rand() - .5)*.3 };
    const c = G.B[en], lead = de / 18, ax = c.x + c.vx*lead + (rand() - .5)*1.4 - b.x, az = c.z + c.vz*lead + (rand() - .5)*1.4 - b.z, am = Math.hypot(ax, az) || 1;
    if(de > 9) return { x:ax/am, y:az/am }; if(de < 5) return { x:-ax/am*.6 + az/am*.4, y:-az/am*.6 - ax/am*.4 }; return { x:ax/am*.25, y:az/am*.25, a:b.cd <= 0 && rand() < .1 ? 1 : 0 }; },
  snap(G){ const fr = G.ids.filter(id => (G.fr[id] || 0) > G.t); return { B:physSnap(G.B), s:G.balls.map(s => [+s.x.toFixed(1), +s.z.toFixed(1)]), fr, h:G.hits, fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T; return physView(root, ctx, { sky:"#a8d8ff", sky2:"#ffffff", goo:"#bfe8ff", fog:"#eaf6ff", cam:[0, 21, 15], btn:"THROW", pred:{ speed:7 } }, (S, v) => {
    floorBox(S, SNW, SNH, new THREE.MeshStandardMaterial({ map:cTex(256, 256, (x, w) => { x.fillStyle = "#f6fbff"; x.fillRect(0, 0, w, w); for(let i=0;i<200;i++){ x.fillStyle = pick(["#e4f0fa", "#ffffff", "#dbe9f6"]); x.beginPath(); x.arc(rand()*w, rand()*w, 3 + rand()*8, 0, 7); x.fill(); } }, [3, 2]), roughness:.95 })); wallRing(S, SNW, SNH, "#dceeff");
    const sm = new THREE.MeshStandardMaterial({ color:"#ffffff", roughness:.9 }); SNOW_WALLS.forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w*2, 1.1, d*2), sm); m.position.set(x, .55, z); m.castShadow = true; m.receiveShadow = true; S.scene.add(m); });
    const ballG = new THREE.SphereGeometry(.22, 10, 8), balls = [], ice = {}, iceM = new THREE.MeshStandardMaterial({ color:"#9ad8ff", transparent:true, opacity:.55, roughness:.05, metalness:.2 }), hud = scoreHud(root);
    v.extra = (id, b) => { teamMark(S, id, b, T[id]); if(!ice[id]){ ice[id] = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.6, 1.25), iceM); ice[id].position.y = .78; ice[id].visible = false; b.add(ice[id]); } };
    v.tick = s => { s.s.forEach((p, i) => { const m = balls[i] || (balls[i] = (() => { const q = new THREE.Mesh(ballG, sm); q.castShadow = true; S.scene.add(q); return q; })()); m.visible = true; m.position.set(p[0], .9, p[1]); }); for(let i = s.s.length; i < balls.length; i++) balls[i].visible = false;
      const F = new Set(s.fr); for(const id in ice) ice[id].visible = F.has(id); const sc = [0, 0]; for(const id in s.h) sc[T[id]] += s.h[id];
      hud.innerHTML = teamScoreHTML(sc[0] + " ❄️", sc[1] + " ❄️", F.has(ctx.me) ? "🥶 Frozen! Wait for a teammate" : ""); };
    v.onFx = (type, a, b) => { if(type === "t"){ if(a === ctx.me) sfx.whoosh(); } else if(type === "hit"){ sfx.whack(); if(a === ctx.me) toast(`🥶 ${b} froze you!`, 1300); if(b === ctx.me) sfx.coin(); } else if(type === "thaw"){ sfx.ding(); if(a === ctx.me) toast(`🔥 ${b} thawed you!`, 1100); } else if(type === "poof"){ } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};
