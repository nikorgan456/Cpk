// ===================== drop 3: Egg Scramble, Coin Rush, Hoop Dive, Team Tower, Darts, Penalty Shootout, Fishing, Relay Sprint =====================
const fitCan = (can, x) => { const W = can.clientWidth, H = can.clientHeight; if(can.width !== W*2 || can.height !== H*2){ can.width = W*2; can.height = H*2; } x.setTransform(2, 0, 0, 2, 0, 0); return [W, H]; };
const teamSpawn = (B, T, ids, sx, gap = 2.4) => [0, 1].forEach(t => { const m = ids.filter(id => T[id] === t); m.forEach((id, i) => Object.assign(B[id], { x:(t ? 1 : -1)*sx, z:(i - (m.length - 1)/2)*gap, f:t ? -Math.PI/2 : Math.PI/2 })); });
const sideTotals = (G, f) => { const s = [0, 0]; G.ids.forEach(id => s[G.T[id]] += f(id)); return s; };
const winOf = s => s[0] === s[1] ? -1 : s[0] > s[1] ? 0 : 1;

// ---------- EGG SCRAMBLE (teams) ----------
const NEST = 9.2, NR = 2.4;
GAMES.eggs = {
  name:"Egg Scramble", icon:"🥚", cat:"phys", desc:"Grab eggs, fill your nest, raid theirs", dur:50, team:true,
  how:["Run over an egg to pick it up and bring it to <b>your nest</b>","Steal eggs from the other team's nest! <b>DIVE</b> (E) into a carrier to make them drop it","Most eggs in your nest wins. <b>Golden eggs</b> count for 3"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, () => [0, 0]); teamSpawn(B, T, ids, 7); const eggs = []; for(let i=0;i<10;i++) eggs.push(this.newEgg(i === 4));
    const del = {}; ids.forEach(id => del[id] = 0); return { B, T, eggs, del, carry:{}, next:3, outs:[], info:{ T } }; },
  newEgg(gold){ const a = rand()*Math.PI*2, r = rand()*4.5; return { x:Math.cos(a)*r, z:Math.sin(a)*r*.8, st:"free", by:null, team:-1, gold:!!gold }; },
  introNote(info, me){ const t = info.T[me]; return t == null ? "" : `${teamNote(info, me)}. Your nest is on the <b>${t ? "RIGHT" : "LEFT"}</b>`; },
  tick(G, dt, inp, H){
    if(G.t > G.next && G.eggs.filter(e => e.st === "free").length < 8){ G.next = G.t + 2.2; G.eggs.push(this.newEgg(rand() < .15)); }
    G.ids.forEach(id => G.B[id].boost = G.carry[id] != null ? .86 : 1);
    physStep(G, dt, inp, { wall:{ w:24, h:18 }, speed:7, dash:13, floorH:() => 0, jumpV:9,
      onTouch:(a, b) => { [[a, b], [b, a]].forEach(([x, y]) => { if(G.B[x].dash > 0 && G.carry[y] != null && G.T[x] !== G.T[y]){ const e = G.eggs[G.carry[y]]; e.st = "free"; e.by = null; e.x = G.B[y].x + (rand() - .5)*2; e.z = G.B[y].z + (rand() - .5)*2; delete G.carry[y]; fxp(G, "drop", y, x); } }); } });
    G.ids.forEach(id => { const b = G.B[id], t = G.T[id];
      if(G.carry[id] != null){ const e = G.eggs[G.carry[id]], nx = t ? NEST : -NEST; e.x = b.x; e.z = b.z;
        if(Math.hypot(b.x - nx, b.z) < NR){ const a = rand()*Math.PI*2, r = rand()*(NR - .6); e.st = "nest"; e.team = t; e.by = null; e.x = nx + Math.cos(a)*r; e.z = Math.sin(a)*r; delete G.carry[id]; G.del[id] += e.gold ? 3 : 1; fxp(G, "nest", id); G.dirty = true; } return; }
      if(b.air || b.y > .5) return;
      for(let k=0;k<G.eggs.length;k++){ const e = G.eggs[k]; if(e.st === "held" || e.st === "nest" && e.team === t) continue; if(Math.hypot(e.x - b.x, e.z - b.z) < .9){ if(e.st === "nest") fxp(G, "steal", id); e.st = "held"; e.by = id; e.team = -1; G.carry[id] = k; G.dirty = true; break; } } });
  },
  count(G){ const c = [0, 0]; G.eggs.forEach(e => { if(e.st === "nest") c[e.team] += e.gold ? 3 : 1; }); return c; },
  timeout(G){ return teamRank(G, winOf(this.count(G)), id => G.del[id]); },
  drop(G, id){ if(G.carry[id] != null){ const e = G.eggs[G.carry[id]]; e.st = "free"; e.by = null; delete G.carry[id]; } },
  bot(G, id){ const b = G.B[id]; if(!b) return null; const t = G.T[id], home = t ? NEST : -NEST;
    if(G.carry[id] != null) return toward(b, home, 0);
    const [en, de] = nearest(G, id, k => G.T[k] !== t && G.carry[k] != null); if(en && de < 3){ const c = G.B[en], r = toward(b, c.x, c.z); r.a = de < 2.2 && rand() < .15 ? 1 : 0; return r; }
    let best = null, bd = 1e9; G.eggs.forEach(e => { if(e.st === "held" || e.st === "nest" && e.team === t) return; const d = Math.hypot(e.x - b.x, e.z - b.z) - (e.gold ? 3 : 0) + (e.st === "nest" ? 2 : 0); if(d < bd){ bd = d; best = e; } });
    return best ? toward(b, best.x, best.z) : toward(b, 0, 0, .5); },
  snap(G){ return { B:physSnap(G.B), e:G.eggs.map(e => [+e.x.toFixed(2), +e.z.toFixed(2), e.st === "held" ? 2 : e.st === "nest" ? 1 : 0, e.gold ? 1 : 0]), c:this.count(G), fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T; return physView(root, ctx, { rot:true, sky:"#a8e8ff", sky2:"#fff8d8", goo:"#9ad86a", fog:"#fff8d8", cam:[0, 21, 15], jump:true, pred:{ speed:7 } }, (S, v) => {
    floorBox(S, 24, 18, new THREE.MeshStandardMaterial({ map:stripeTex("#a8e08a", "#98d07a", 10, [1, 1]), roughness:.85 })); wallRing(S, 24, 18, "#c88a4a");
    [0, 1].forEach(t => { const n = new THREE.Mesh(new THREE.TorusGeometry(NR, .35, 10, 32), new THREE.MeshStandardMaterial({ color:"#d8a050", roughness:.9 })); n.rotation.x = Math.PI/2; n.position.set(t ? NEST : -NEST, .2, 0); S.scene.add(n);
      const f = new THREE.Mesh(new THREE.CircleGeometry(NR, 32), new THREE.MeshStandardMaterial({ color:TEAM_COL[t], transparent:true, opacity:.45 })); f.rotation.x = -Math.PI/2; f.position.set(t ? NEST : -NEST, .02, 0); S.scene.add(f); });
    const eg = new THREE.SphereGeometry(.32, 14, 10), em = new THREE.MeshStandardMaterial({ color:"#fff6ea", roughness:.4 }), gm = new THREE.MeshStandardMaterial({ color:"#ffd23a", metalness:.7, roughness:.25, emissive:"#a86a00", emissiveIntensity:.25 }), meshes = [], hud = scoreHud(root);
    v.extra = (id, b) => teamMark(S, id, b, T[id]);
    v.tick = (s, dt, t) => { s.e.forEach((e, i) => { const m = meshes[i] || (meshes[i] = (() => { const q = new THREE.Mesh(eg, em); q.scale.set(1, 1.3, 1); q.castShadow = true; S.scene.add(q); return q; })()); m.material = e[3] ? gm : em;
        if(e[2] === 2){ const holder = Object.entries(s.B).find(([, b]) => Math.abs(b[0] - e[0]) < .01 && Math.abs(b[1] - e[1]) < .01); const bb = holder ? S.bean(holder[0]) : null; if(bb) m.position.set(bb.position.x, bb.position.y + 1.7, bb.position.z); else m.position.set(e[0], 1.7, e[1]); }
        else { m.position.x = lerp(m.position.x, e[0], .3); m.position.z = lerp(m.position.z, e[1], .3); m.position.y = .4 + (e[2] ? 0 : Math.abs(Math.sin(t*3 + i))*.15); } m.visible = true; });
      for(let i = s.e.length; i < meshes.length; i++) meshes[i].visible = false; hud.innerHTML = teamScoreHTML(s.c[0] + " 🥚", s.c[1] + " 🥚"); };
    v.onFx = (type, a, b) => { if(type === "nest"){ sfx.coin(); if(a === ctx.me) toast("🥚 Delivered!", 800); } else if(type === "drop"){ sfx.bump(); if(a === ctx.me) toast(`💥 ${b} made you drop it!`, 1100); } else if(type === "steal"){ sfx.pop(); } else if(type === "j"){ if(a === ctx.me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- COIN RUSH (teams) ----------
GAMES.coins = {
  name:"Coin Rush", icon:"🪙", cat:"phys", desc:"Grab falling coins, knock theirs loose", dur:45, team:true,
  how:["Coins rain from the sky. Grab them before the other team!","<b>DIVE</b> (E) into an enemy to knock 3 of their coins loose","Team with the most coins wins. <b>Big coins</b> are worth 5"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, () => [0, 0]); teamSpawn(B, T, ids, 5); const have = {}; ids.forEach(id => have[id] = 0); return { B, T, have, coins:[], next:.5, outs:[], info:{ T } }; },
  introNote:teamNote,
  tick(G, dt, inp, H){
    if(G.t > G.next){ G.next = G.t + Math.max(.22, .65 - G.t*.008); G.coins.push({ x:(rand() - .5)*19, z:(rand() - .5)*13, at:G.t, big:rand() < .08, v:1 }); }
    G.coins = G.coins.filter(c => G.t - c.at < 7);
    physStep(G, dt, inp, { wall:{ w:22, h:16 }, speed:7.2, dash:14,
      onTouch:(a, b) => { [[a, b], [b, a]].forEach(([x, y]) => { if(G.B[x].dash > 0 && G.T[x] !== G.T[y] && G.have[y] > 0 && (G.B[y].kn || 0) < G.t){ const n = Math.min(3, G.have[y]); G.have[y] -= n; G.B[y].kn = G.t + .8; for(let i=0;i<n;i++){ const a2 = rand()*Math.PI*2; G.coins.push({ x:clamp(G.B[y].x + Math.cos(a2)*2, -10.5, 10.5), z:clamp(G.B[y].z + Math.sin(a2)*2, -7.5, 7.5), at:G.t - .6, big:false, v:1 }); } fxp(G, "spill", y, x); G.dirty = true; } }); } });
    G.ids.forEach(id => { const b = G.B[id]; G.coins = G.coins.filter(c => { if(G.t - c.at < .6) return true; if(Math.hypot(c.x - b.x, c.z - b.z) < .9){ G.have[id] += c.big ? 5 : 1; fxp(G, "c", id, c.big ? 1 : 0); G.dirty = true; return false; } return true; }); }); },
  timeout(G){ return teamRank(G, winOf(sideTotals(G, id => G.have[id])), id => G.have[id]); },
  drop(G, id){},
  bot(G, id){ const b = G.B[id]; if(!b) return null; const [en, de] = nearest(G, id, k => G.T[k] !== G.T[id] && G.have[k] >= 3);
    if(en && de < 2.6){ const c = G.B[en], r = toward(b, c.x, c.z); r.a = rand() < .12 ? 1 : 0; return r; }
    let best = null, bd = 1e9; G.coins.forEach(c => { const land = Math.max(0, .6 - (G.t - c.at)), d = Math.hypot(c.x - b.x, c.z - b.z) - (c.big ? 4 : 0) + land*3; if(d < bd){ bd = d; best = c; } });
    return best ? toward(b, best.x, best.z) : { x:0, y:0 }; },
  snap(G){ const s = sideTotals(G, id => G.have[id]); return { B:physSnap(G.B), c:G.coins.map(c => [+c.x.toFixed(1), +c.z.toFixed(1), +Math.min(.6, G.t - c.at).toFixed(2), c.big ? 1 : 0]), s, h:G.have, fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T; return physView(root, ctx, { rot:true, sky:"#ffd88a", sky2:"#fff4e0", goo:"#ffb03a", fog:"#fff0d8", cam:[0, 19, 14], pred:{ speed:7.2 } }, (S, v) => {
    floorBox(S, 22, 16, new THREE.MeshStandardMaterial({ map:cTex(256, 256, (x, w) => { for(let i=0;i<8;i++) for(let j=0;j<8;j++){ x.fillStyle = (i + j) % 2 ? "#ffe8b0" : "#ffd890"; x.fillRect(i*32, j*32, 32, 32); } }, [3, 2]), roughness:.6 })); wallRing(S, 22, 16, "#ff8a3a");
    const cg = new THREE.CylinderGeometry(.32, .32, .08, 18), cm = new THREE.MeshStandardMaterial({ color:"#ffd23a", metalness:.8, roughness:.25, emissive:"#a87000", emissiveIntensity:.3 }), meshes = [], hud = scoreHud(root);
    v.extra = (id, b) => teamMark(S, id, b, T[id]);
    v.tick = (s, dt, t) => { s.c.forEach((c, i) => { const m = meshes[i] || (meshes[i] = (() => { const q = new THREE.Mesh(cg, cm); q.castShadow = true; S.scene.add(q); return q; })()); m.visible = true; const k = c[3] ? 2 : 1; m.scale.set(k, k, k);
        m.position.set(c[0], c[2] < .6 ? .5 + (.6 - c[2]) * 14 : .5 + Math.sin(t*4 + i)*.08, c[1]); m.rotation.x = Math.PI/2; m.rotation.z = t*3 + i; });
      for(let i = s.c.length; i < meshes.length; i++) meshes[i].visible = false; hud.innerHTML = teamScoreHTML(s.s[0], s.s[1], `You: ${s.h[ctx.me] || 0} 🪙`); };
    v.onFx = (type, a, b) => { if(type === "c"){ if(a === ctx.me) b ? sfx.win() : sfx.coin(); } else if(type === "spill"){ sfx.bump(); if(a === ctx.me) toast(`💸 ${b} knocked your coins loose!`, 1100); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- HOOP DIVE (teams) ----------
function newHoop(old){ let x, z, ok, k = 0; do { x = (rand() - .5)*18; z = (rand() - .5)*12; ok = !old || old.every(h => Math.hypot(h.x - x, h.z - z) > 3.5); } while(!ok && ++k < 30);
  return { x, z, a:rand()*Math.PI, h:1.25 + rand()*.75, gold:rand() < .15, cd:0 }; }
GAMES.hoops = {
  name:"Hoop Dive", icon:"⭕", cat:"phys", desc:"Jump through floating hoops", dur:45, team:true,
  how:["Hoops float in the air. <b>JUMP</b> (Space) and fly through them!","<b>DIVE</b> (E) in mid-air to go further. Each hoop scores for your team","Gold hoops are worth 3. Most points wins"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, () => [0, 0]); teamSpawn(B, T, ids, 6); const hoops = []; for(let i=0;i<6;i++) hoops.push(newHoop(hoops)); const pts = {}; ids.forEach(id => pts[id] = 0); return { B, T, hoops, pts, outs:[], info:{ T } }; },
  introNote:teamNote,
  tick(G, dt, inp, H){ const prev = {}; G.ids.forEach(id => prev[id] = [G.B[id].x, G.B[id].z]);
    physStep(G, dt, inp, { wall:{ w:22, h:16 }, speed:7, dash:11, dashT:.3, floorH:() => 0, jumpV:10.5 });
    G.hoops.forEach((h, k) => { if(h.cd > G.t) return; const nx = Math.cos(h.a), nz = Math.sin(h.a);
      G.ids.forEach(id => { const b = G.B[id], [px, pz] = prev[id], s0 = (px - h.x)*nx + (pz - h.z)*nz, s1 = (b.x - h.x)*nx + (b.z - h.z)*nz; if(s0 * s1 > 0 || s0 === s1) return;
        const lat = Math.abs(-(b.x - h.x)*nz + (b.z - h.z)*nx), cy = b.y + .65; if(Math.hypot(lat, cy - h.h) < 1.05 && h.cd <= G.t){ G.pts[id] += h.gold ? 3 : 1; fxp(G, "hoop", id, k, h.gold ? 1 : 0); h.cd = G.t + 1e9; G.dirty = true; G.hoops[k] = Object.assign(newHoop(G.hoops), { cd:G.t + 1 }); } }); }); },
  timeout(G){ return teamRank(G, winOf(sideTotals(G, id => G.pts[id])), id => G.pts[id]); },
  drop(G, id){},
  bot(G, id){ const b = G.B[id]; if(!b) return null; let best = null, bd = 1e9; G.hoops.forEach(h => { if(h.cd > G.t) return; const d = Math.hypot(h.x - b.x, h.z - b.z) - (h.gold ? 3 : 0); if(d < bd){ bd = d; best = h; } }); if(!best) return { x:0, y:0 };
    const nx = Math.cos(best.a), nz = Math.sin(best.a), s = (b.x - best.x)*nx + (b.z - best.z)*nz, side = s >= 0 ? 1 : -1, lat = -(b.x - best.x)*nz + (b.z - best.z)*nx;
    if(Math.abs(s) < 1.2 && Math.abs(lat) < .6 && b.air){ return { x:-nx*side, y:-nz*side }; }
    const ax = best.x + nx*side*3, az = best.z + nz*side*3; if(Math.hypot(ax - b.x, az - b.z) > .7 && !(Math.abs(lat) < .5 && Math.abs(s) < 3.2)) return toward(b, ax, az);
    const r = { x:-nx*side, y:-nz*side }; r.j = !b.air && Math.abs(s) < 2.1 && Math.abs(s) > 1.2 ? 1 : 0; r.a = b.air && b.vy < 2 && Math.abs(s) > .8 && b.cd <= 0 && rand() < .3 ? 1 : 0; return r; },
  snap(G){ return { B:physSnap(G.B), h:G.hoops.map(h => [+h.x.toFixed(2), +h.z.toFixed(2), +h.a.toFixed(2), +h.h.toFixed(2), h.gold ? 1 : 0, h.cd > G.t ? 1 : 0]), s:sideTotals(G, id => G.pts[id]), fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T; return physView(root, ctx, { rot:true, sky:"#7ad0ff", sky2:"#f0e0ff", goo:"#9a6aff", fog:"#f0e8ff", cam:[0, 17, 15], jump:true, pred:{ speed:7 } }, (S, v) => {
    floorBox(S, 22, 16, new THREE.MeshStandardMaterial({ map:cTex(256, 256, (x, w) => { x.fillStyle = "#e8dcff"; x.fillRect(0, 0, w, w); x.strokeStyle = "#d4c4f4"; x.lineWidth = 6; for(let r=20;r<w*.8;r+=40){ x.beginPath(); x.arc(w/2, w/2, r, 0, 7); x.stroke(); } }, [2, 1.5]), roughness:.6 })); wallRing(S, 22, 16, "#9a6aff");
    const rg = new THREE.TorusGeometry(1.05, .1, 10, 36), rm = new THREE.MeshStandardMaterial({ color:"#ff4ab8", emissive:"#ff4ab8", emissiveIntensity:.35 }), gm = new THREE.MeshStandardMaterial({ color:"#ffd23a", emissive:"#ffb000", emissiveIntensity:.5, metalness:.6 }), pm = new THREE.MeshStandardMaterial({ color:"#ffffff" }), hoops = [], hud = scoreHud(root);
    const mk = () => { const g = new THREE.Group(), r = new THREE.Mesh(rg, rm); r.castShadow = true; g.add(r); const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 6), pm); g.add(p); g.userData = { r, p }; S.scene.add(g); return g; };
    v.extra = (id, b) => teamMark(S, id, b, T[id]);
    v.tick = (s, dt, t) => { s.h.forEach((h, i) => { const g = hoops[i] || (hoops[i] = mk()); g.visible = !h[5]; g.position.set(h[0], h[3], h[1]); g.rotation.y = -h[2] + Math.PI/2; g.userData.r.material = h[4] ? gm : rm; g.userData.r.rotation.z = t*.6; const p = g.userData.p; p.scale.y = Math.max(.1, h[3] - 1.05); p.position.y = -(1.05 + p.scale.y/2); });
      hud.innerHTML = teamScoreHTML(s.s[0], s.s[1]); };
    v.onFx = (type, a, b, c) => { if(type === "hoop"){ c ? sfx.win() : sfx.ding(); if(a === ctx.me) toast(c ? "⭐ Gold hoop! +3" : "⭕ +1", 700); } else if(type === "j"){ if(a === ctx.me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- TEAM TOWER (teams) ----------
const TB = 2.6, TBH = .55;
const towerX = (st, t) => Math.sin((t - st.ts) * st.sp) * 4.2;
GAMES.tower = {
  name:"Team Tower", icon:"🏗️", cat:"mash", desc:"Take turns stacking the tallest tower", dur:45, team:true, rate:10,
  how:["Your team takes turns dropping blocks onto your tower","When it's <b>your turn</b>, tap <b>DROP</b> (or <b>E</b>) when the block is lined up. Overhang gets chopped off!","Tallest tower when time's up wins"],
  init(ids){ const T = teamSplit(ids), S = [0, 1].map(t => { const m = shuffle(ids.filter(id => T[id] === t)); return { m, ti:0, top:[0, TB], h:0, ts:.5, sp:1.6, fall:null }; }), n = {}; ids.forEach(id => n[id] = 0); return { T, S, n, bots:{}, info:{ T, order:S.map(s => s.m) } }; },
  introNote:teamNote,
  place(G, t, x){ const st = G.S[t], L = Math.max(x - st.top[1]/2, st.top[0] - st.top[1]/2), R = Math.min(x + st.top[1]/2, st.top[0] + st.top[1]/2), who = st.m[st.ti % st.m.length];
    if(R - L > .08){ const perfect = Math.abs(x - st.top[0]) < .12; st.top = perfect ? st.top : [(L + R)/2, R - L]; st.h++; G.n[who]++; fxp(G, perfect ? "perfect" : "place", t, who); }
    else { fxp(G, "miss", t, who); }
    st.ti++; st.ts = G.t + .45; st.sp = Math.min(3.6, 1.6 + st.h*.09); G.dirty = true; },
  onEvent(G, id, d){ if(d.e !== "drop") return; const t = G.T[id], st = G.S[t]; if(st.m[st.ti % st.m.length] !== id || G.t < st.ts) return; this.place(G, t, clamp(+d.x || 0, -5, 5)); },
  tick(G, dt){ [0, 1].forEach(t => { const st = G.S[t], cur = st.m[st.ti % st.m.length]; if(!cur || !playerOf(cur)){ if(cur) st.ti++; return; }
      if(G.t - st.ts > 6 && !playerOf(cur)?.bot){ st.ti++; st.ts = G.t + .3; fxp(G, "skip", t, cur); G.dirty = true; return; }
      if(playerOf(cur)?.bot && G.t > st.ts){ const B = G.bots[t] || (G.bots[t] = {}); if(B.ti !== st.ti){ B.ti = st.ti; B.err = (rand() - .5) * (rand() < .7 ? .5 : 1.4); }
        const x = towerX(st, G.t); if(Math.abs(x - (st.top[0] + B.err)) < .15) this.place(G, t, x); } }); },
  timeout(G){ return teamRank(G, winOf([G.S[0].h, G.S[1].h]), id => G.n[id]); },
  bot(){ return null; }, drop(G, id){},
  snap(G){ return { S:G.S.map(st => ({ top:st.top.map(v => +v.toFixed(2)), h:st.h, ts:+st.ts.toFixed(2), sp:+st.sp.toFixed(2), cur:st.m[st.ti % st.m.length] })), fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const T = ctx.info.T, me = ctx.me, myT = T[me], v = { fxSeen:0, stacks:[[], []], imgs:{} };
    root.innerHTML = `<div class="tw"><canvas id="twCan"></canvas><div class="team-hud" id="twHud"></div><div class="tw-ui"><div class="tw-turn" id="twTurn"></div><button class="mash pink" id="twBtn">DROP</button></div></div>`;
    const can = $("#twCan"), x = can.getContext("2d"), btn = $("#twBtn"); let S = null;
    const drop = () => { if(!S || CM.phase !== "play") return; const st = S.S[myT]; if(!st || st.cur !== me) return; const tt = now() - CM.playT; if(tt < st.ts) return; ctx.input({ e:"drop", x:+towerX(st, tt).toFixed(3) }); sfx.click(); };
    tapBtn(btn, drop); const key = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat) drop(); } }; addEventListener("keydown", key);
    v.update = (s, dt, t) => { S = s; const tt = CM.phase === "play" ? now() - CM.playT : 0;
      newFx(v, s.fx, (type, tm, who) => { const st = s.S[tm]; if(type === "place" || type === "perfect"){ v.stacks[tm].push(st.top.slice()); type === "perfect" ? sfx.win() : sfx.pop(); if(who === me && type === "perfect") toast("✨ PERFECT!", 800); } if(type === "miss"){ sfx.wrong(); if(who === me) toast("❌ Missed!", 800); } });
      [0, 1].forEach(tm => { const st = s.S[tm]; while(v.stacks[tm].length < st.h) v.stacks[tm].push(st.top.slice()); });
      const my = myT != null ? s.S[myT] : null, mine = my && my.cur === me; btn.disabled = !mine || tt < (my ? my.ts : 0);
      $("#twTurn").innerHTML = my ? (mine ? `<b>YOUR TURN!</b> Drop it!` : `${nameChip(my.cur)} is dropping…`) : "Watching";
      $("#twHud").innerHTML = teamScoreHTML(s.S[0].h + "🧱", s.S[1].h + "🧱");
      const [W, H] = fitCan(can, x), ppu = Math.min(W / 22, 34), maxH = Math.max(s.S[0].h, s.S[1].h), camY = Math.max(0, maxH*TBH - 6), base = H*.72 + camY*ppu;
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#8ad0ff"); g.addColorStop(1, "#ffe0f0"); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = "#8ad86a"; x.fillRect(0, base, W, H - base);
      [0, 1].forEach(tm => { const cx = W/2 + (tm ? 1 : -1) * W*.24, st = s.S[tm], col = TEAM_COL[tm];
        x.fillStyle = "#9a7a5a"; x.fillRect(cx - TB/2*ppu - 6, base - 6, TB*ppu + 12, 10);
        v.stacks[tm].forEach((b, i) => { const y = base - (i + 1)*TBH*ppu; x.fillStyle = i % 2 ? col : shade(col, .25); x.fillRect(cx + (b[0] - b[1]/2)*ppu, y, b[1]*ppu, TBH*ppu - 1); });
        if(CM.phase === "play" && tt >= st.ts){ const bx = towerX(st, tt), y = base - (st.h + 1)*TBH*ppu - 26; x.fillStyle = "#555"; x.fillRect(cx + bx*ppu - 1, y - 40, 2, 40); x.globalAlpha = .9; x.fillStyle = col; x.fillRect(cx + (bx - st.top[1]/2)*ppu, y, st.top[1]*ppu, TBH*ppu); x.globalAlpha = 1;
          const im = beanImg(v.imgs, st.cur); if(im.complete) x.drawImage(im, cx + bx*ppu - 12, y - 64, 24, 31); }
        x.font = "bold 12px Nunito, sans-serif"; x.textAlign = "center"; x.fillStyle = "#fff"; x.strokeStyle = "rgba(0,0,0,.4)"; x.lineWidth = 3; const lab = `${TEAM_NAME[tm]}: ${st.cur || ""}`; x.strokeText(lab, cx, base + 22); x.fillText(lab, cx, base + 22); }); };
    v.destroy = () => removeEventListener("keydown", key); return v; }
};

// ---------- DARTS ----------
const DART_N = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5], DARTS = 5;
function dartScore(x, y){ const r = Math.hypot(x, y); if(r < .055) return 50; if(r < .11) return 25; if(r > 1) return 0; let a = Math.atan2(x, -y) * 180 / Math.PI; a = (a + 360 + 9) % 360; const n = DART_N[Math.floor(a / 18)]; return r > .93 ? n*2 : r > .55 && r < .62 ? n*3 : n; }
GAMES.darts = {
  name:"Darts", icon:"🎯", cat:"react", desc:"Steady your shaky aim and throw", dur:40, rate:5,
  how:["Your aim wobbles around the board","<b>HOLD</b> the button (or E) to steady your arm, <b>let go</b> to throw. Hold too long and it shakes again!","5 darts each. Highest total wins. Bullseye = 50"],
  init(ids){ const d = {}; ids.forEach(id => d[id] = []); return { d, bots:{} }; },
  onEvent(G, id, ev){ if(ev.e !== "dart" || !G.d[id] || G.d[id].length >= DARTS) return; const x = clamp(+ev.x || 0, -1.4, 1.4), y = clamp(+ev.y || 0, -1.4, 1.4); G.d[id].push([+x.toFixed(3), +y.toFixed(3), dartScore(x, y)]); G.dirty = true; },
  tick(G, dt, inp, H){ if(G.ids.every(id => !playerOf(id) || G.d[id].length >= DARTS) && G.t > 1) H.end(this.timeout(G)); },
  tot(G, id){ return G.d[id].reduce((s, d) => s + d[2], 0); },
  timeout(G){ return byScore(G.ids, id => this.tot(G, id)); },
  bot(G, id){ const B = G.bots[id] || (G.bots[id] = { nx:2 + rand()*3 }); if(G.t < B.nx || G.d[id].length >= DARTS) return null; B.nx = G.t + 3 + rand()*4;
    const tg = rand() < .5 ? [0, -.585] : [0, 0], g = () => (rand() + rand() + rand() - 1.5) * .22; this.onEvent(G, id, { e:"dart", x:tg[0] + g(), y:tg[1] + g() }); return null; },
  drop(G, id){ if(G.d[id]) while(G.d[id].length < DARTS) G.d[id].push([9, 9, 0]); },
  snap(G){ return { d:G.d }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, v = { hold:0, held:false, ax:0, ay:0, ph:rand()*9, sent:0 };
    root.innerHTML = `<div class="dt"><canvas id="dtCan"></canvas><div class="dt-ui"><div class="dt-left" id="dtLeft"></div><button class="mash pink" id="dtBtn">HOLD & RELEASE</button></div><div class="red-board" id="dtBoard"></div></div>`;
    const can = $("#dtCan"), x = can.getContext("2d"), btn = $("#dtBtn");
    const press = () => { if(CM.phase !== "play" || v.held) return; v.held = true; v.hold = 0; btn.classList.add("on"); };
    const release = () => { if(!v.held) return; v.held = false; btn.classList.remove("on"); if(CM.phase !== "play" || v.sent >= DARTS) return; v.sent++; ctx.input({ e:"dart", x:+v.ax.toFixed(3), y:+v.ay.toFixed(3) }); sfx.whoosh(); setTimeout(() => sfx.whack(), 120); };
    btn.addEventListener("pointerdown", e => { e.preventDefault(); press(); }); ["pointerup", "pointercancel", "pointerleave"].forEach(ev => btn.addEventListener(ev, release));
    const kd = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat) press(); } }, ku = e => { if(actKey(e)) release(); }; addEventListener("keydown", kd); addEventListener("keyup", ku);
    v.update = (s, dt, t) => { v.ph += dt;
      if(v.held) v.hold += dt; const steady = v.held ? (v.hold < 1.3 ? 1 - v.hold / 1.3 * .82 : .18 + (v.hold - 1.3) * 1.2) : 1, amp = .55 * Math.min(1.6, steady);
      v.ax = Math.sin(v.ph*1.7) * amp*.8 + Math.sin(v.ph*3.1 + 1) * amp*.35; v.ay = Math.cos(v.ph*1.3 + .5) * amp*.7 + Math.sin(v.ph*2.7) * amp*.3;
      const [W, H] = fitCan(can, x), R = Math.min(W * .4, H * .3), cx = W/2, cy = H*.5;
      x.fillStyle = "#3a2a4a"; x.fillRect(0, 0, W, H); x.fillStyle = "#5a3a2a"; x.beginPath(); x.arc(cx, cy, R*1.18, 0, 7); x.fill();
      for(let i=0;i<20;i++){ const a0 = (i*18 - 9 - 90) * Math.PI/180, a1 = a0 + 18*Math.PI/180, dark = i % 2 === 0;
        [[1, .93, dark ? "#e83a3a" : "#2a9a4a"], [.93, .62, dark ? "#1a1a1a" : "#f4e8c8"], [.62, .55, dark ? "#e83a3a" : "#2a9a4a"], [.55, .11, dark ? "#1a1a1a" : "#f4e8c8"]].forEach(([r0, r1, c]) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, R*r0, a0, a1); x.arc(cx, cy, R*r1, a1, a0, true); x.fill(); });
        x.fillStyle = "#fff"; x.font = `bold ${Math.round(R*.09)}px Nunito, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; const am = (a0 + a1)/2; x.fillText(DART_N[i], cx + Math.cos(am)*R*1.09, cy + Math.sin(am)*R*1.09); }
      x.fillStyle = "#2a9a4a"; x.beginPath(); x.arc(cx, cy, R*.11, 0, 7); x.fill(); x.fillStyle = "#e83a3a"; x.beginPath(); x.arc(cx, cy, R*.055, 0, 7); x.fill();
      (s.d[me] || []).forEach(d => { if(d[0] > 5) return; const px = cx + d[0]*R, py = cy + d[1]*R; x.fillStyle = "#ffd23a"; x.strokeStyle = "#000"; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill(); x.stroke(); x.fillStyle = "#fff"; x.font = "bold 11px Nunito, sans-serif"; x.fillText(d[2], px, py - 12); });
      if(CM.phase === "play" && v.sent < DARTS){ const px = cx + v.ax*R, py = cy + v.ay*R; x.strokeStyle = v.held ? (v.hold > 1.3 ? "#ff3a3a" : "#5aff7a") : "#fff"; x.lineWidth = 2.5; x.beginPath(); x.arc(px, py, 11, 0, 7); x.moveTo(px - 18, py); x.lineTo(px + 18, py); x.moveTo(px, py - 18); x.lineTo(px, py + 18); x.stroke(); }
      const mine = s.d[me] || [], tot = mine.reduce((a, d) => a + d[2], 0); $("#dtLeft").innerHTML = `🎯 <b>${tot}</b> pts · ${"➶".repeat(Math.max(0, DARTS - mine.length))}${mine.length >= DARTS ? "Done!" : ""}`; btn.disabled = mine.length >= DARTS;
      const k = JSON.stringify(s.d); if(v.k !== k){ v.k = k; const ids = Object.keys(s.d), tt2 = id => s.d[id].reduce((a, d) => a + d[2], 0); $("#dtBoard").innerHTML = boardRow(ids.sort((a, b) => tt2(b) - tt2(a)), id => `${tt2(id)} <small>(${s.d[id].length}/${DARTS})</small>`, me); } };
    v.destroy = () => { removeEventListener("keydown", kd); removeEventListener("keyup", ku); }; return v; }
};

// ---------- PENALTY SHOOTOUT (teams) ----------
const PK_PICK = 4.5, PK_SHOW = 2.6, PK_N = 3;
GAMES.penalty = {
  name:"Penalty Shootout", icon:"🥅", cat:"react", desc:"Shooters pick a corner, keepers guess", dur:PK_N*2*(PK_PICK + PK_SHOW) + 2, team:true, rate:6, noClock:true,
  how:["Teams take turns: one player shoots, someone from the other team saves","Shooter: tap <b>left, middle or right</b>. Keeper: tap where you'll dive. You've got 4 seconds!","Keeper guesses right = saved. Most goals after 3 kicks each wins"],
  init(ids){ const T = teamSplit(ids), m = [0, 1].map(t => shuffle(ids.filter(id => T[id] === t))), kicks = []; for(let i=0;i<PK_N*2;i++){ const st = i % 2, n = Math.floor(i / 2); kicks.push({ sh:m[st][n % m[st].length], kp:m[1 - st][n % m[1 - st].length], st }); }
    const g = {}; ids.forEach(id => g[id] = 0); return { T, kicks, ki:0, ph:"pick", pend:PK_PICK, s:null, k:null, goals:[0, 0], g, res:[], info:{ T } }; },
  introNote:teamNote,
  onEvent(G, id, d){ if(d.e !== "pick" || G.ph !== "pick") return; const K = G.kicks[G.ki], z = clamp(d.z | 0, 0, 2); if(id === K.sh && G.s == null) G.s = z; if(id === K.kp && G.k == null) G.k = z; G.dirty = true; },
  tick(G, dt, inp, H){ const K = G.kicks[G.ki]; if(!K) return;
    [["sh", "s"], ["kp", "k"]].forEach(([r, f]) => { const id = K[r]; if(G[f] == null && playerOf(id)?.bot && G.t > G.pend - PK_PICK + 1 + rand()*2.5) G[f] = Math.floor(rand()*3); });
    if(G.ph === "pick" && (G.t >= G.pend || G.s != null && G.k != null)){ if(G.s == null) G.s = Math.floor(rand()*3); if(G.k == null) G.k = Math.floor(rand()*3); const goal = G.s !== G.k; if(goal){ G.goals[K.st]++; G.g[K.sh] += 2; } else G.g[K.kp] += 2;
      G.res.push({ st:K.st, goal, s:G.s, k:G.k, sh:K.sh, kp:K.kp }); G.ph = "show"; G.pend = G.t + PK_SHOW; fxp(G, "kick", goal ? 1 : 0); G.dirty = true; }
    else if(G.ph === "show" && G.t >= G.pend){ G.ki++; G.s = G.k = null; G.ph = "pick"; G.pend = G.t + PK_PICK; G.dirty = true; if(G.ki >= G.kicks.length) H.end(this.timeout(G)); } },
  timeout(G){ return teamRank(G, winOf(G.goals), id => G.g[id]); },
  bot(){ return null; }, drop(G, id){},
  snap(G){ const K = G.kicks[G.ki] || {}; return { ki:G.ki, n:G.kicks.length, ph:G.ph, pe:+G.pend.toFixed(1), sh:K.sh, kp:K.kp, st:K.st, ready:[G.s != null, G.k != null], last:G.res[G.res.length - 1] || null, goals:G.goals, res:G.res.map(r => [r.st, r.goal ? 1 : 0]), fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const T = ctx.info.T, me = ctx.me, v = { fxSeen:0, picked:-1, ki:-1, imgs:{} };
    root.innerHTML = `<div class="pk"><div class="team-hud" id="pkHud"></div><div class="pk-who" id="pkWho"></div><div class="pk-goal" id="pkGoal"><div class="pk-net"></div>${[0, 1, 2].map(z => `<button class="pk-z" data-z="${z}"></button>`).join("")}<div class="pk-keeper" id="pkKeep"></div><div class="pk-ball" id="pkBall">⚽</div></div><div class="pk-msg" id="pkMsg"></div><div class="pk-dots" id="pkDots"></div></div>`;
    $("#pkGoal").onclick = e => { const b = e.target.closest("[data-z]"); if(!b || v.picked >= 0 || CM.phase !== "play") return; const S = v.S; if(!S || S.ph !== "pick" || (S.sh !== me && S.kp !== me)) return; v.picked = +b.dataset.z; ctx.input({ e:"pick", z:v.picked }); sfx.vote(); b.classList.add("mine"); };
    v.update = s => { v.S = s; const tt = CM.phase === "play" ? now() - CM.playT : 0;
      if(s.ki !== v.ki){ v.ki = s.ki; v.picked = -1; $$(".pk-z").forEach(b => b.classList.remove("mine")); $("#pkBall").className = "pk-ball"; $("#pkKeep").className = "pk-keeper"; $("#pkKeep").innerHTML = s.kp ? beanSVG(playerOf(s.kp)?.bean, 46) : ""; }
      newFx(v, s.fx, (type, goal) => { if(type !== "kick") return; const L = s.last; $("#pkBall").className = "pk-ball z" + L.s; $("#pkKeep").className = "pk-keeper z" + L.k; setTimeout(() => { goal ? (sfx.crown(), SND.say("Goal!")) : (sfx.whack(), SND.say("Saved!")); }, 450); });
      const role = s.sh === me ? "sh" : s.kp === me ? "kp" : "", left = Math.max(0, Math.ceil(s.pe - tt));
      $("#pkWho").innerHTML = s.sh ? `<span style="color:${TEAM_COL[s.st]}">⚽ ${esc(s.sh)}</span> vs <span style="color:${TEAM_COL[1 - s.st]}">🧤 ${esc(s.kp)}</span> <small>Kick ${Math.min(s.ki + 1, s.n)}/${s.n}</small>` : "";
      $("#pkMsg").innerHTML = s.ph === "show" && s.last ? (s.last.goal ? `<b class="pk-g">GOAL! ⚽</b>` : `<b class="pk-s">SAVED! 🧤</b>`) : role === "sh" ? (v.picked >= 0 ? "Locked in… 🤫" : `<b>You're shooting!</b> Tap where to aim · ${left}s`) : role === "kp" ? (v.picked >= 0 ? "Locked in… 🤫" : `<b>You're in goal!</b> Tap where to dive · ${left}s`) : `Waiting for them to pick… ${left}s ${s.ready[0] ? "⚽✓" : ""} ${s.ready[1] ? "🧤✓" : ""}`;
      $("#pkGoal").classList.toggle("can", s.ph === "pick" && !!role && v.picked < 0);
      $("#pkHud").innerHTML = teamScoreHTML(s.goals[0], s.goals[1]); $("#pkDots").innerHTML = [0, 1].map(t => `<span style="color:${TEAM_COL[t]}">${TEAM_NAME[t]} ${s.res.filter(r => r[0] === t).map(r => r[1] ? "⚽" : "❌").join("")}</span>`).join(""); };
    v.destroy = () => {}; return v; }
};

// ---------- FISHING ----------
const FISH = [["🐟", "Sardine", .4, 1.2], ["🐠", "Clownfish", .6, 2], ["🐡", "Pufferfish", 1, 3.5], ["🦑", "Squid", 2, 5], ["🐙", "Octopus", 3, 7], ["🦈", "Shark", 8, 16], ["🥾", "Old boot", 0, 0]];
GAMES.fishing = {
  name:"Fishing", icon:"🎣", cat:"react", desc:"Wait for the bite, then reel it in", dur:40, rate:5,
  how:["Watch your float. When it dips and shows <b>!</b>, tap <b>REEL</b> fast to hook it","Then <b>hold</b> REEL (or E) to pull it in. Let go if the line gets too tight or it snaps!","Heaviest total catch wins"],
  init(ids){ const c = {}; ids.forEach(id => c[id] = []); return { c, bots:{} }; },
  onEvent(G, id, d){ if(d.e !== "catch" || !G.c[id]) return; const f = FISH[clamp(d.f | 0, 0, FISH.length - 1)], kg = clamp(+d.kg || 0, f[2], f[3]); G.c[id].push([d.f | 0, +kg.toFixed(1)]); G.dirty = true; },
  tick(){}, kg(G, id){ return G.c[id].reduce((s, c) => s + c[1], 0); },
  timeout(G){ return byScore(G.ids, id => Math.round(this.kg(G, id) * 10)); },
  bot(G, id){ const B = G.bots[id] || (G.bots[id] = { nx:4 + rand()*5 }); if(G.t < B.nx) return null; B.nx = G.t + 4.5 + rand()*5; if(rand() < .25) return null; const f = this.pickFish(); this.onEvent(G, id, { e:"catch", f, kg:FISH[f][2] + rand()*(FISH[f][3] - FISH[f][2]) }); return null; },
  pickFish(){ const r = rand(); return r < .3 ? 0 : r < .52 ? 1 : r < .68 ? 2 : r < .8 ? 3 : r < .88 ? 4 : r < .93 ? 5 : 6; },
  drop(G, id){}, snap(G){ return { c:G.c }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, g = this, v = { st:"wait", t:2 + rand()*3, ten:0, prog:0, fish:null, held:false, pull:0 };
    root.innerHTML = `<div class="fs"><canvas id="fsCan"></canvas><div class="fs-ui"><div class="fs-bar" id="fsBar" hidden><i id="fsTen"></i><b id="fsProg"></b></div><div class="fs-msg" id="fsMsg"></div><button class="mash blue" id="fsBtn">REEL</button></div><div class="red-board" id="fsBoard"></div></div>`;
    const can = $("#fsCan"), x = can.getContext("2d"), btn = $("#fsBtn");
    const press = () => { if(CM.phase !== "play") return; v.held = true; btn.classList.add("on");
      if(v.st === "bite"){ v.st = "reel"; v.fish = g.pickFish(); const F = FISH[v.fish]; v.kg = F[2] + rand()*(F[3] - F[2]); v.prog = .15; v.ten = .3; v.str = v.fish === 6 ? .3 : .45 + F[3] / 16 * .8; sfx.ding(); }
      else if(v.st === "wait"){ v.t += .8; sfx.wrong(); toast("Too early! Wait for the !", 900); } };
    const release = () => { v.held = false; btn.classList.remove("on"); };
    btn.addEventListener("pointerdown", e => { e.preventDefault(); press(); }); ["pointerup", "pointercancel", "pointerleave"].forEach(ev => btn.addEventListener(ev, release));
    const kd = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat) press(); } }, ku = e => { if(actKey(e)) release(); }; addEventListener("keydown", kd); addEventListener("keyup", ku);
    v.update = (s, dt, t) => { if(CM.phase === "play"){
        if(v.st === "wait"){ v.t -= dt; if(v.t <= 0){ v.st = "bite"; v.bt = .75 + rand()*.35; sfx.beep(); } }
        else if(v.st === "bite"){ v.bt -= dt; if(v.bt <= 0){ v.st = "wait"; v.t = 1.5 + rand()*3; toast("It got away! 🐟💨", 900); } }
        else if(v.st === "reel"){ v.pull = Math.max(0, v.pull - dt); if(v.pull <= 0 && rand() < dt*1.2){ v.pull = .4 + rand()*.6; } const surge = v.pull > 0 ? v.str * 1.5 : 0;
          v.ten = clamp(v.ten + (v.held ? .55 + surge : -.9 + surge*.6) * dt, 0, 1.05); if(v.held) v.prog += dt * (.32 - v.str*.12) * (v.pull > 0 ? .4 : 1); else v.prog -= dt*.05;
          if(v.ten >= 1){ v.st = "wait"; v.t = 1.5 + rand()*2.5; sfx.slip(); toast("💥 SNAP! The line broke", 1100); }
          else if(v.prog >= 1){ ctx.input({ e:"catch", f:v.fish, kg:+v.kg.toFixed(1) }); const F = FISH[v.fish]; v.fish === 6 ? sfx.lose() : sfx.win(); toast(`${F[0]} ${F[1]}${v.fish === 6 ? "… 🙄" : ` · ${v.kg.toFixed(1)}kg!`}`, 1600); v.st = "wait"; v.t = 2 + rand()*3; }
          else if(v.prog <= 0){ v.st = "wait"; v.t = 2; toast("It swam off 🐟", 900); } } }
      $("#fsBar").hidden = v.st !== "reel"; if(v.st === "reel"){ $("#fsTen").style.width = Math.min(100, v.ten*100) + "%"; $("#fsTen").style.background = v.ten > .8 ? "#ff3a3a" : v.ten > .55 ? "#ffb03a" : "#5ae07a"; $("#fsProg").style.left = (v.prog*100) + "%"; }
      $("#fsMsg").textContent = v.st === "wait" ? "Waiting for a bite…" : v.st === "bite" ? "❗ BITE! TAP REEL!" : v.pull > 0 ? "🐟 It's pulling! Ease off!" : "Hold to reel, watch the tension";
      const [W, H] = fitCan(can, x), wy = H*.38; const sky = x.createLinearGradient(0, 0, 0, wy); sky.addColorStop(0, "#ffb88a"); sky.addColorStop(1, "#ffe8c8"); x.fillStyle = sky; x.fillRect(0, 0, W, wy);
      const sea = x.createLinearGradient(0, wy, 0, H); sea.addColorStop(0, "#3ab8e8"); sea.addColorStop(1, "#1a5a9a"); x.fillStyle = sea; x.fillRect(0, wy, W, H - wy);
      x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 2; for(let i=0;i<8;i++){ const y = wy + 14 + i*22, o = (t*20 + i*37) % 60; x.beginPath(); for(let X = -60 + o; X < W; X += 60){ x.moveTo(X, y); x.quadraticCurveTo(X + 15, y - 4, X + 30, y); } x.stroke(); }
      const bx = W*.62, dip = v.st === "bite" ? 8 + Math.sin(t*30)*4 : v.st === "reel" ? 10 : Math.sin(t*2)*2, by = wy + 30 + dip;
      x.strokeStyle = "#5a3a1a"; x.lineWidth = 5; x.beginPath(); x.moveTo(W*.1, H*.95); x.lineTo(W*.32, wy - 60); x.stroke(); x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 1; x.beginPath(); x.moveTo(W*.32, wy - 60); x.quadraticCurveTo(bx - 40, wy - 40 + (v.st === "reel" ? 30 : 0), bx, by); x.stroke();
      x.fillStyle = "#ff3a3a"; x.beginPath(); x.arc(bx, by, 8, Math.PI, 0); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(bx, by, 8, 0, Math.PI); x.fill();
      if(v.st === "bite"){ x.fillStyle = "#ffe23a"; x.font = "bold 34px Lilita One, sans-serif"; x.textAlign = "center"; x.fillText("!", bx, by - 18); }
      const mine = s.c[me] || []; x.font = "bold 14px Nunito, sans-serif"; x.textAlign = "left"; x.fillStyle = "#fff"; x.fillText(`🪣 ${mine.map(c => FISH[c[0]][0]).join(" ") || "empty"}`, 10, H - 12);
      const k = JSON.stringify(s.c); if(v.k !== k){ v.k = k; const ids = Object.keys(s.c), kg = id => s.c[id].reduce((a, c) => a + c[1], 0); $("#fsBoard").innerHTML = boardRow(ids.sort((a, b) => kg(b) - kg(a)), id => kg(id).toFixed(1) + "kg", me); } };
    v.destroy = () => { removeEventListener("keydown", kd); removeEventListener("keyup", ku); }; return v; }
};

// ---------- RELAY SPRINT (teams) ----------
const LEG = 50, LEGS = 4;
GAMES.relay = {
  name:"Relay Sprint", icon:"🏃‍♀️", cat:"mash", desc:"Mash your leg, pass the baton", dur:45, team:true, rate:12,
  how:["Each team runs a 4-leg relay. Wait for the baton!","On <b>your leg</b>, tap <b>LEFT</b> and <b>RIGHT</b> one after the other (A/D or ←/→). Same foot twice = stumble","First team to the finish wins"],
  init(ids){ const T = teamSplit(ids), R = [0, 1].map(t => { const m = shuffle(ids.filter(id => T[id] === t)), legs = []; for(let i=0;i<LEGS;i++) legs.push(m[i % m.length]); return { legs, li:0, d:0, v:0, foot:-1, fz:0, done:false, ft:0 }; }), lt = {}; ids.forEach(id => lt[id] = 0);
    return { T, R, lt, fin:[], bots:{}, info:{ T, legs:R.map(r => r.legs) } }; },
  introNote(info, me){ const t = info.T[me]; if(t == null) return ""; const legs = info.legs[t].map((id, i) => id === me ? i + 1 : 0).filter(Boolean); return `${teamNote(info, me)}. You run leg${legs.length > 1 ? "s" : ""} <b>${legs.join(" & ")}</b>`; },
  onEvent(G, id, d){ if(d.e !== "step") return; const t = G.T[id], r = G.R[t]; if(r.done || r.legs[r.li] !== id || G.t < r.fz) return; const f = d.f ? 1 : 0;
    if(f === r.foot){ r.v *= .45; r.fz = G.t + .22; fxp(G, "st", id); } else r.v = Math.min(11.5, r.v + 1.05); r.foot = f; },
  tick(G, dt, inp, H){ [0, 1].forEach(t => { const r = G.R[t]; if(r.done) return; const cur = r.legs[r.li]; if(!playerOf(cur)) r.v = 6; r.v = Math.max(0, r.v - 3*dt); r.d += r.v*dt; G.lt[cur] += dt;
      if(r.d >= LEG*(r.li + 1)){ r.li++; r.v *= .5; r.foot = -1; if(r.li >= LEGS){ r.done = true; r.d = LEG*LEGS; G.fin.push(t); fxp(G, "fin", t); if(G.fin.length === 1) G.endAt = G.t + 2.5; } else fxp(G, "pass", t, r.legs[r.li]); G.dirty = true; } });
    if(G.endAt && G.t >= G.endAt || G.fin.length === 2) H.end(this.timeout(G)); },
  timeout(G){ const w = G.fin.length ? G.fin[0] : winOf([G.R[0].d, G.R[1].d]); return teamRank(G, w, id => -G.lt[id]); },
  bot(G, id){ const t = G.T[id], r = G.R[t]; if(r.done || r.legs[r.li] !== id) return null; const B = G.bots[id] || (G.bots[id] = { nx:0, rate:7 + rand()*3 }); if(G.t < B.nx) return null; B.nx = G.t + 1 / B.rate * (.8 + rand()*.4);
    this.onEvent(G, id, { e:"step", f:rand() < .05 ? r.foot : 1 - r.foot }); return null; },
  drop(G, id){},
  snap(G){ return { R:G.R.map(r => ({ d:+r.d.toFixed(2), v:+r.v.toFixed(1), li:r.li, cur:r.legs[Math.min(r.li, LEGS - 1)], done:r.done })), fin:G.fin, fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const T = ctx.info.T, me = ctx.me, myT = T[me], v = { imgs:{}, fxSeen:0, dd:[0, 0] };
    root.innerHTML = `<div class="sp"><canvas id="rlCan"></canvas><div class="team-hud" id="rlHud"></div><div class="sp-call" id="rlCall"></div><div class="sp-btns"><button class="mash pink" id="rlL">LEFT</button><button class="mash blue" id="rlR">RIGHT</button></div></div>`;
    const can = $("#rlCan"), x = can.getContext("2d"); let S = null;
    const step = f => { if(CM.phase !== "play" || !S || myT == null) return; const r = S.R[myT]; if(r.cur !== me || r.done) return; ctx.input({ e:"step", f }); sfx.step(); };
    tapBtn($("#rlL"), () => step(0)); tapBtn($("#rlR"), () => step(1));
    const key = e => { if(e.repeat || e.target.closest("input")) return; if(["KeyA", "ArrowLeft", "KeyQ"].includes(e.code)){ e.preventDefault(); step(0); } if(["KeyD", "ArrowRight", "KeyE"].includes(e.code)){ e.preventDefault(); step(1); } }; addEventListener("keydown", key);
    v.update = (s, dt, t) => { S = s; newFx(v, s.fx, (type, a, b) => { if(type === "pass"){ sfx.pass(); if(b === me){ toast("🏃 BATON! Your leg, GO GO GO!", 1500); SND.say("Go!"); } } if(type === "fin") sfx.win(); if(type === "st" && a === me) sfx.slip(); });
      const mine = myT != null && s.R[myT].cur === me && !s.R[myT].done; $$("#rlL,#rlR").forEach(b => b.disabled = !mine);
      $("#rlCall").textContent = mine ? "YOUR LEG! MASH!" : ""; $("#rlHud").innerHTML = teamScoreHTML(Math.floor(s.R[0].d) + "m", Math.floor(s.R[1].d) + "m", `/ ${LEG*LEGS}m`);
      [0, 1].forEach(tm => v.dd[tm] = lerp(v.dd[tm], s.R[tm].d, Math.min(1, dt*10)));
      const [W, H] = fitCan(can, x), total = LEG*LEGS, pad = 30, ppm = (W - pad*2) / total, top = H*.3, lh = H*.22;
      x.fillStyle = "#9ad8ff"; x.fillRect(0, 0, W, top); x.fillStyle = "#7ad86a"; x.fillRect(0, top - 10, W, 10);
      [0, 1].forEach(tm => { const y = top + tm*lh; x.fillStyle = tm ? "#3a7ad8" : "#d84a7a"; x.fillRect(0, y, W, lh); x.fillStyle = "rgba(255,255,255,.7)"; x.fillRect(0, y, W, 2);
        for(let l=1;l<=LEGS;l++){ const px = pad + l*LEG*ppm; x.fillStyle = l === LEGS ? "#fff" : "rgba(255,255,255,.5)"; x.fillRect(px - 1, y, l === LEGS ? 4 : 2, lh); }
        const r = s.R[tm], px = pad + v.dd[tm]*ppm, sz = Math.min(lh*.9, 52), bob = r.v > .5 ? Math.abs(Math.sin(t*r.v*1.6))*sz*.12 : 0, im = beanImg(v.imgs, r.cur);
        if(im.complete){ x.drawImage(im, px - sz/2, y + lh*.5 - sz*.75 - bob, sz, sz*1.3); } x.fillStyle = "#ffd23a"; x.fillRect(px + sz*.3, y + lh*.5 - 4 - bob, 14, 6);
        x.font = "bold 12px Nunito, sans-serif"; x.fillStyle = "#fff"; x.textAlign = "left"; x.fillText(`${TEAM_NAME[tm]} · leg ${Math.min(r.li + 1, LEGS)}/${LEGS}: ${r.cur}${r.done ? " 🏁" : ""}`, 6, y + 14); });
      x.fillStyle = "#e8d8b0"; x.fillRect(0, top + lh*2, W, H - top - lh*2); };
    v.destroy = () => removeEventListener("keydown", key); return v; }
};
