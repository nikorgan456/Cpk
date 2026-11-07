// ===================== racing: Obstacle Dash, Kart Sprint, Slide Race, Climb Race =====================
// finish order first, then whoever got furthest
function raceRank(G, prog){ const fin = G.fin.slice(), rest = G.ids.filter(id => !fin.includes(id)).sort((a, b) => prog(b) - prog(a)); return fin.map(id => [id]).concat(rest.map(id => [id])); }
function raceEnd(G, H, rank){ const humans = G.ids.filter(id => !playerOf(id)?.bot);
  if(G.fin.length && G.firstFin == null) G.firstFin = G.t;
  if(G.fin.length === G.ids.length || humans.every(id => G.fin.includes(id)) && G.fin.length || G.firstFin != null && G.t - G.firstFin > 12) H.end(rank()); }
function placeOf(G, id, prog){ if(G.fin.includes(id)) return G.fin.indexOf(id) + 1; return G.fin.length + 1 + G.ids.filter(k => !G.fin.includes(k) && prog(k) > prog(id)).length; }
const raceHud = (root) => { const h = document.createElement("div"); h.className = "race-hud"; root.appendChild(h); return h; };
const myOrLead = (s, me, key) => s.B[me] ? me : Object.keys(s.B).sort((a, b) => key(s, a) - key(s, b))[0];

// ---------- OBSTACLE DASH ----------
const OL = 125, OW = 5;
function obstLayout(seed){ const R = seeded(seed), L = []; let z = -9; const kinds = ["bar", "wall", "gap", "pins", "bar", "wall", "gap", "bump"];
  while(z > -OL + 6){ const k = kinds[Math.floor(R()*kinds.length)];
    if(k === "bar") L.push({ k, z, w:(R() < .5 ? -1 : 1)*(1.3 + R()*.8), p:R()*6 });
    if(k === "wall") L.push({ k, z, w:1.1 + R()*.9, p:R()*6, n:R() < .5 ? 1 : 2 });
    if(k === "gap") L.push({ k, z, d:1.9 + R()*.5 });
    if(k === "pins"){ const free = Math.floor(R()*3), xs = [-3.2, 0, 3.2].filter((_, i) => i !== free).map(x => +(x + (R() - .5)*.6).toFixed(2)); L.push({ k, z, xs }); }
    if(k === "bump") L.push({ k, z, xs:[-2.8, 0, 2.8].map(x => +(x + (R() - .5)*.4).toFixed(2)), zs:[0, 1.9, 0] });
    z -= 6.5 + R()*2; }
  return L; }
const wallX = (o, t) => Math.sin(t*o.w + o.p) * 3.2;
const barAng = (o, t) => o.p + o.w*t;
GAMES.obst = {
  name:"Obstacle Dash", icon:"🏃", cat:"race", desc:"Sprint through a candy obstacle course", dur:55,
  how:["Run to the finish line at the far end","Dodge spinning bars and sliding walls. <b>DIVE</b> (or <b>E</b>) to jump gaps","Fall and you go back to your last checkpoint. First across the line wins"],
  init(ids, ctx){ const L = obstLayout(ctx.seed), B = physInit(ids, (i, n) => [(i - (n - 1)/2) * 1.15, 2.2 + (i % 2)*.8]); ids.forEach(id => B[id].f = Math.PI); return { B, L, fin:[], resp:{}, cp:{}, outs:[], info:{ seed:ctx.seed } }; },
  tick(G, dt, inp, H){
    const t = G.t, inGap = (x, z) => G.L.some(o => o.k === "gap" && Math.abs(z - o.z) < o.d/2);
    physStep(G, dt, inp, { ground:(x, z, b) => Math.abs(x) < OW && z < 4.2 && z > -OL - 6 && (b.dash > 0 || !inGap(x, z)), speed:7.4, dash:12.5, dashT:.4, onOut:id => { G.resp[id] = G.t + 1.1; } });
    for(const id of G.ids){ const b = G.B[id]; if(!b.alive || b.fall) continue;
      G.L.forEach(o => { if(Math.abs(b.z - o.z) > 5.5) return;
        if(o.k === "bar"){ const a = barAng(o, t), dx = Math.cos(a), dz = Math.sin(a), rx = b.x, rz = b.z - o.z, along = clamp(rx*dx + rz*dz, -4.7, 4.7), px = rx - dx*along, pz = rz - dz*along, d = Math.hypot(px, pz);
          if(d < .72){ const nx = px/(d || 1), nz = pz/(d || 1), sp = Math.abs(o.w*along) + 4; b.x += nx*(.72 - d); b.z += nz*(.72 - d); const sg = Math.sign(o.w*along*(-dz*nx + dx*nz)) || 1; b.vx = nx*sp*.95; b.vz = nz*sp*.95; b.hit = .4; b.stun = .18; if((b.bh || 0) < t){ b.bh = t + .4; fxp(G, "b", id); } } }
        if(o.k === "wall"){ const xs = o.n === 2 ? [wallX(o, t) * .55 - 2.2, -wallX(o, t) * .55 + 2.2] : [wallX(o, t)]; xs.forEach(wx => { const hx = 1.6 + .5, hz = .5 + .5, dx = b.x - wx, dz = b.z - o.z;
            if(Math.abs(dx) < hx && Math.abs(dz) < hz){ if(hx - Math.abs(dx) < hz - Math.abs(dz)){ b.x = wx + Math.sign(dx)*hx; b.vx = Math.sign(dx)*9; } else { b.z = o.z + Math.sign(dz)*hz; b.vz = Math.sign(dz)*7; } b.hit = .3; if((b.bh || 0) < t){ b.bh = t + .4; fxp(G, "b", id); } } }); }
        if(o.k === "pins") o.xs.forEach(px => { const dx = b.x - px, dz = b.z - o.z, d = Math.hypot(dx, dz); if(d < 1.05){ b.x = px + dx/(d || 1)*1.05; b.z = o.z + dz/(d || 1)*1.05; } });
        if(o.k === "bump") o.xs.forEach((px, i) => { const pz = o.z + o.zs[i], dx = b.x - px, dz = b.z - pz, d = Math.hypot(dx, dz); if(d < 1.25){ b.x = px + dx/(d || 1)*1.25; b.z = pz + dz/(d || 1)*1.25; b.vx = dx/(d || 1)*10; b.vz = dz/(d || 1)*10; b.hit = .4; b.stun = .2; fxp(G, "p", id); } });
      });
      const passed = G.L.filter(o => o.z > b.z + 1.5).pop(); G.cp[id] = passed ? passed.z - (passed.k === "gap" ? passed.d/2 + 1 : 2) : 2;
      if(b.z < -OL && !G.fin.includes(id)){ G.fin.push(id); fxp(G, "fin", id); G.dirty = true; }
      if(G.fin.includes(id)){ b.z = clamp(b.z, -OL - 5, -OL - .5); }
    }
    for(const id in G.resp){ if(G.t >= G.resp[id]){ const b = G.B[id]; Object.assign(b, { x:(rand() - .5)*3, z:G.cp[id] != null ? G.cp[id] : 2, y:0, vx:0, vz:0, vy:0, alive:true, fall:false, f:Math.PI }); delete G.resp[id]; fxp(G, "r", id); } }
    raceEnd(G, H, () => raceRank(G, id => -G.B[id].z)); },
  timeout(G){ return raceRank(G, id => -G.B[id].z); },
  drop(G, id){},
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive || b.fall || G.fin.includes(id)) return { x:0, y:0 }; const t = G.t; let tx = b.lane == null ? (b.lane = (rand() - .5)*4) : b.lane, go = -1, dash = 0;
    const next = G.L.find(o => o.z < b.z + .5 && o.z > b.z - 4.5);
    if(next){ if(next.k === "wall"){ const wx = next.n === 2 ? 0 : wallX(next, t + .4); if(next.n === 2){ const sp = wallX(next, t + .4) * .55; if(sp > .3) tx = b.x < 0 ? -4.3 : 4.3; else if(sp < -.5) tx = 0; else if(b.z - next.z < 2.4) go = .15; } else tx = wx > 0 ? -3.4 : 3.4; }
      if(next.k === "pins"){ let best = 0, bd = -1; for(let x = -4; x <= 4; x += .5){ const d = Math.min(...next.xs.map(p => Math.abs(p - x))); if(d > bd){ bd = d; best = x; } } tx = best; }
      if(next.k === "bump") tx = b.x < 0 ? -4.45 : 4.45;
      if(next.k === "gap"){ const e = b.z - (next.z + next.d/2); if(e < 1.3 && e > .1 && b.cd <= 0 && b.vz < -4) dash = 1; else if(e < 2.2 && b.cd > 0) go = .1; tx = b.x; }
      if(next.k === "bar" && Math.abs(b.z - next.z) < 3.2){ const a = barAng(next, t + .3), along = b.x*Math.cos(a) + (b.z - next.z)*Math.sin(a), px = b.x - Math.cos(a)*along, pz = b.z - next.z - Math.sin(a)*along; if(Math.hypot(px, pz) < 1.6 && b.z > next.z) go = .15; } }
    if(rand() < .004) b.lane = (rand() - .5)*4;
    const dx = clamp((tx - b.x) * .6, -1, 1); return { x:dx, y:go, a:dash }; },
  snap(G){ return { B:physSnap(G.B), fin:G.fin, fx:G.fx }; },
  view(root, ctx){ const L = obstLayout(ctx.info.seed);
    return physView(root, ctx, { sky:"#7ad0ff", sky2:"#ffe8f6", goo:"#ff7ad8", fog:"#ffe8f6", cam:[0, 11, 10], look:[0, 0, -3], pred:{ speed:7.4 } }, (S, v) => {
    const trT = cTex(256, 256, (x, w) => { x.fillStyle = "#8ae0ff"; x.fillRect(0, 0, w, w); x.fillStyle = "#6ad0f4"; for(let i=0;i<w;i+=64) x.fillRect(0, i, w, 32); x.fillStyle = "#fff"; x.fillRect(0, 0, 10, w); x.fillRect(w - 10, 0, 10, w); }, [1, OL/8]);
    // track pieces between the gaps
    const cuts = L.filter(o => o.k === "gap").map(o => [o.z + o.d/2, o.z - o.d/2]); let z0 = 5; const segs = [];
    cuts.forEach(([a, b]) => { segs.push([z0, a]); z0 = b; }); segs.push([z0, -OL - 6]);
    segs.forEach(([a, b]) => { const len = a - b, m = new THREE.Mesh(new THREE.BoxGeometry(OW*2, 1, len), new THREE.MeshStandardMaterial({ map:trT.clone(), roughness:.5 })); m.material.map.repeat.set(1, len/8); m.material.map.needsUpdate = true; m.position.set(0, -.5, (a + b)/2); m.receiveShadow = true; S.scene.add(m); });
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(OW*2, 1.2), new THREE.MeshStandardMaterial({ map:cTex(256, 32, (x, w, h) => { for(let i=0;i<16;i++) for(let j=0;j<2;j++){ x.fillStyle = (i + j) % 2 ? "#fff" : "#222"; x.fillRect(i*16, j*16, 16, 16); } }) })); fin.rotation.x = -Math.PI/2; fin.position.set(0, .02, -OL); S.scene.add(fin);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(OW + .3, .3, 10, 40, Math.PI), new THREE.MeshStandardMaterial({ color:"#ffd23a", emissive:"#ff8a00", emissiveIntensity:.3 })); arch.position.set(0, 0, -OL); S.scene.add(arch);
    const objs = [], cm = c => new THREE.MeshStandardMaterial({ color:c, roughness:.35 });
    L.forEach(o => { if(o.k === "bar"){ const g = new THREE.Group(); g.position.set(0, 0, o.z); const post = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, 1.1, 12), cm("#9a6aff")); post.position.y = .55; g.add(post);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, 9.4, 12), cm("#ff4a8a")); arm.rotation.z = Math.PI/2; arm.position.y = .55; arm.castShadow = true; g.add(arm); S.scene.add(g); objs.push([o, g]); }
      if(o.k === "wall"){ (o.n === 2 ? [0, 1] : [0]).forEach(i => { const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 1), cm(i ? "#3ab8ff" : "#ff8a3a")); m.position.set(0, .7, o.z); m.castShadow = true; S.scene.add(m); objs.push([o, m, i]); }); }
      if(o.k === "pins") o.xs.forEach(x => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.6, 16), cm("#ffd23a")); m.position.set(x, .8, o.z); m.castShadow = true; S.scene.add(m); });
      if(o.k === "bump") o.xs.forEach((x, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.75, .85, .8, 20), cm("#ff5a5a")); m.position.set(x, .4, o.z + o.zs[i]); m.castShadow = true; S.scene.add(m); const r = new THREE.Mesh(new THREE.TorusGeometry(.78, .12, 8, 20), cm("#fff")); r.rotation.x = Math.PI/2; r.position.set(x, .8, o.z + o.zs[i]); S.scene.add(r); objs.push([o, m, "b" + i]); });
    });
    const hud = raceHud(root);
    v.tick = (s, dt) => { const t = CM.phase === "play" ? now() - CM.playT : 0;
      objs.forEach(([o, m, i]) => { if(o.k === "bar") m.rotation.y = -barAng(o, t); if(o.k === "wall"){ const wx = wallX(o, t); m.position.x = o.n === 2 ? (i ? -wx*.55 + 2.2 : wx*.55 - 2.2) : wx; } if(o.k === "bump"){ m.scale.y = 1 + Math.sin(t*6)*.08; } });
      const who = myOrLead(s, ctx.me, (s, id) => s.B[id][1]), me = s.B[who]; if(me) S.follow(me[0]*.4, me[1], .08);
      const prog = id => s.fin.includes(id) ? 1e3 - s.fin.indexOf(id) : -s.B[id][1], place = Object.keys(s.B).filter(id => prog(id) > prog(ctx.me)).length + 1;
      if(s.B[ctx.me]){ const left = Math.max(0, Math.round(OL + s.B[ctx.me][1])); hud.innerHTML = s.fin.includes(ctx.me) ? `<b>🏁 Finished ${ordinal(s.fin.indexOf(ctx.me) + 1)}!</b>` : `<b>${ordinal(place)}</b><span>${left}m to go</span>`; } };
    v.onFx = (type, a) => { if(type === "fin"){ sfx.win(); if(a === ctx.me) SND.say("Finished!"); } else if(type === "r"){ if(a === ctx.me) sfx.boing(); } else if(type === "p"){ sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- KART SPRINT ----------
const KS = 9, KR = 6, KP = 4*KS + 2*Math.PI*KR, LAPS = 3;
function kartS(x, z){ if(x >= -KS && x <= KS) return z < 0 ? x + KS : 2*KS + Math.PI*KR + (KS - x);
  if(x > KS) return 2*KS + (Math.atan2(z, x - KS) + Math.PI/2) * KR;
  let a = Math.atan2(z, x + KS); if(a < 0) a += Math.PI*2; return 4*KS + Math.PI*KR + (a - Math.PI/2) * KR; }
function kartPt(s, off = 0){ s = ((s % KP) + KP) % KP; const r = KR + off;
  if(s < 2*KS) return [s - KS, -r]; s -= 2*KS;
  if(s < Math.PI*KR){ const a = s / KR - Math.PI/2; return [KS + Math.cos(a)*r, Math.sin(a)*r]; } s -= Math.PI*KR;
  if(s < 2*KS) return [KS - s, r]; s -= 2*KS; const a = s / KR + Math.PI/2; return [-KS + Math.cos(a)*r, Math.sin(a)*r]; }
GAMES.kart = {
  name:"Kart Sprint", icon:"🏎️", cat:"race", desc:"3 laps around the candy speedway", dur:58,
  how:["Point the joystick where you want to drive (or WASD)","Tap <b>BOOST</b> (or press <b>E</b>) on the straights. Bump others into the walls!","First to finish 3 laps wins"],
  init(ids){ const B = physInit(ids, (i) => [-2 - Math.floor(i/2)*1.8, -KR + (i % 2 ? 1.1 : -1.1)]); ids.forEach(id => B[id].f = Math.PI/2); const G = { B, fin:[], tot:{}, ls:{}, outs:[] }; ids.forEach(id => { G.tot[id] = 0; G.ls[id] = kartS(B[id].x, B[id].z); }); return G; },
  tick(G, dt, inp, H){
    physStep(G, dt, inp, { speed:10.5, acc:22, dash:17, imp:1.5 });
    for(const id of G.ids){ const b = G.B[id], cx = clamp(b.x, -KS, KS), dx = b.x - cx, dz = b.z, d = Math.hypot(dx, dz) || 1e-3, nx = dx/d, nz = dz/d;
      if(d > KR + 2.45){ b.x = cx + nx*(KR + 2.45); b.z = nz*(KR + 2.45); const vn = b.vx*nx + b.vz*nz; if(vn > 0){ b.vx -= 1.6*vn*nx; b.vz -= 1.6*vn*nz; } }
      if(d < KR - 2.45){ b.x = cx + nx*(KR - 2.45); b.z = nz*(KR - 2.45); const vn = b.vx*nx + b.vz*nz; if(vn < 0){ b.vx -= 1.6*vn*nx; b.vz -= 1.6*vn*nz; } }
      if(G.fin.includes(id)){ b.vx *= .9; b.vz *= .9; continue; }
      const s = kartS(b.x, b.z); let ds = s - G.ls[id]; if(ds > KP/2) ds -= KP; if(ds < -KP/2) ds += KP; G.ls[id] = s; G.tot[id] += ds;
      const lap = Math.floor(G.tot[id] / KP); if(lap > (b.lap || 0)){ b.lap = lap; if(lap >= LAPS){ G.fin.push(id); fxp(G, "fin", id); } else fxp(G, "lap", id, lap + 1); G.dirty = true; } }
    raceEnd(G, H, () => raceRank(G, id => G.tot[id])); },
  timeout(G){ return raceRank(G, id => G.tot[id]); },
  drop(G, id){},
  bot(G, id){ const b = G.B[id]; if(!b || G.fin.includes(id)) return null; b.off = b.off == null ? (rand() - .5)*2.4 : b.off; if(rand() < .01) b.off = (rand() - .5)*2.4;
    const s = kartS(b.x, b.z), [tx, tz] = kartPt(s + 4.5, b.off), dx = tx - b.x, dz = tz - b.z, m = Math.hypot(dx, dz) || 1;
    const straight = (s > 2 && s < 2*KS - 4) || (s > 2*KS + Math.PI*KR + 2 && s < 4*KS + Math.PI*KR - 4); return { x:dx/m, y:dz/m, a:straight && rand() < .03 ? 1 : 0 }; },
  snap(G){ const p = {}; for(const id in G.tot) p[id] = +G.tot[id].toFixed(1); return { B:physSnap(G.B), p, fin:G.fin, fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#ffb8e0", sky2:"#fff0d8", goo:"#5ae07a", fog:"#fff0d8", cam:[0, 27, 17], look:[0, 0, 1], portrait:{ cam:[-19, 25, 0], look:[1.5, 0, 0], a:.62 }, btn:"BOOST", pred:{ speed:10.5, acc:22 } }, (S, v) => {
    const shape = new THREE.Shape(), hole = new THREE.Path(), N = 40;
    const ring = (r, p) => { for(let i=0;i<=N*2+1;i++){ const k = i / N; let x, z; if(i <= N){ const a = -Math.PI/2 + k*Math.PI; x = KS + Math.cos(a)*r; z = Math.sin(a)*r; } else { const a = Math.PI/2 + (k - 1)*Math.PI; x = -KS + Math.cos(a)*r; z = Math.sin(a)*r; } i ? p.lineTo(x, z) : p.moveTo(x, z); } };
    ring(KR + 2.6, shape); ring(KR - 2.6, hole); shape.holes.push(hole);
    const asphalt = cTex(256, 256, (x, w) => { x.fillStyle = "#4a4a5e"; x.fillRect(0, 0, w, w); for(let i=0;i<500;i++){ x.fillStyle = `rgba(255,255,255,${rand()*.08})`; x.fillRect(rand()*w, rand()*w, 2, 2); } }, [.25, .25]);
    const track = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), new THREE.MeshStandardMaterial({ map:asphalt, roughness:.8 })); track.rotation.x = Math.PI/2; track.position.y = .01; track.receiveShadow = true; S.scene.add(track);
    const grass = new THREE.Mesh(new THREE.BoxGeometry(44, 1, 26), new THREE.MeshStandardMaterial({ color:"#7ae07a", roughness:.9 })); grass.position.y = -.5; grass.receiveShadow = true; S.scene.add(grass);
    const curbM = new THREE.MeshStandardMaterial({ map:cTex(64, 16, (x) => { for(let i=0;i<4;i++){ x.fillStyle = i % 2 ? "#fff" : "#ff3a5a"; x.fillRect(i*16, 0, 16, 16); } }, [40, 1]) });
    [KR + 2.6, KR - 2.6].forEach(r => { const pts = []; for(let i=0;i<=160;i++){ const [x, z] = kartPt(i / 160 * KP, r - KR); pts.push(new THREE.Vector3(x, .25, z)); } const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, .22, 6, true), curbM); tube.castShadow = true; S.scene.add(tube); });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 5.2), new THREE.MeshStandardMaterial({ map:cTex(32, 160, (x) => { for(let i=0;i<2;i++) for(let j=0;j<10;j++){ x.fillStyle = (i + j) % 2 ? "#fff" : "#222"; x.fillRect(i*16, j*16, 16, 16); } }) })); line.rotation.x = -Math.PI/2; line.position.set(-KS + .5, .03, -KR); S.scene.add(line);
    const tree = (x, z) => { const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, 1.4, 6), new THREE.MeshStandardMaterial({ color:"#fff" })); tr.position.y = .7; g.add(tr); const top = new THREE.Mesh(new THREE.SphereGeometry(.9, 12, 10), new THREE.MeshStandardMaterial({ color:pick(["#ff7ab8", "#ffd23a", "#9a6aff"]) })); top.position.y = 1.8; g.add(top); g.position.set(x, 0, z); g.traverse(o => o.castShadow = true); S.scene.add(g); };
    [[-6, 0], [0, 0], [6, 0], [-20, 9], [20, -9], [-20, -9], [20, 9]].forEach(([x, z]) => tree(x, z));
    v.extra = (id, b) => { if(b.userData.kart) return; const k = new THREE.Group(), col = hashCol(id), cm = new THREE.MeshStandardMaterial({ color:col, roughness:.25, metalness:.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(.95, .3, 1.7), cm); body.position.y = .25; k.add(body); const nose = new THREE.Mesh(new THREE.BoxGeometry(.7, .22, .5), cm); nose.position.set(0, .22, 1); k.add(nose);
      const wm = new THREE.MeshStandardMaterial({ color:"#1a1a1a" }); [[-.55, .55], [.55, .55], [-.55, -.6], [.55, -.6]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .2, 12), wm); w.rotation.z = Math.PI/2; w.position.set(x, .2, z); k.add(w); });
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.1, .08, .3), cm); sp.position.set(0, .6, -.8); k.add(sp); k.traverse(o => o.castShadow = true); b.add(k); b.userData.kart = k; };
    const hud = raceHud(root);
    v.tick = (s) => { CTL.map = root.clientWidth < root.clientHeight ? (x, y) => [-y, x] : null; const p = s.p, prog = id => s.fin.includes(id) ? 1e4 - s.fin.indexOf(id) : p[id]; if(p[ctx.me] == null) return hud.innerHTML = "";
      const place = Object.keys(p).filter(id => prog(id) > prog(ctx.me)).length + 1, lap = Math.min(LAPS, Math.floor(Math.max(0, p[ctx.me]) / KP) + 1);
      hud.innerHTML = s.fin.includes(ctx.me) ? `<b>🏁 Finished ${ordinal(s.fin.indexOf(ctx.me) + 1)}!</b>` : `<b>${ordinal(place)}</b><span>Lap ${lap}/${LAPS}</span>`; };
    v.onFx = (type, a, b) => { if(type === "fin"){ sfx.win(); if(a === ctx.me) SND.say("Finished!"); } else if(type === "lap"){ if(a === ctx.me){ sfx.ding(); if(b === LAPS) SND.say("Final lap!"); } } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- SLIDE RACE ----------
const SL = 330, SW = 4;
function slideLayout(seed){ const R = seeded(seed), L = []; for(let z = -14; z > -SL + 8; z -= 5 + R()*3){ const r = R();
  if(r < .45){ const n = R() < .35 ? 2 : 1, used = []; for(let i=0;i<n;i++){ let x; do { x = [-2.6, 0, 2.6][Math.floor(R()*3)]; } while(used.includes(x)); used.push(x); L.push({ k:"blk", x, z }); } }
  else if(r < .75) L.push({ k:"pad", x:+(-2.8 + R()*5.6).toFixed(2), z });
  else { L.push({ k:"blk", x:R() < .5 ? -2.6 : 2.6, z }); L.push({ k:"pad", x:0, z:z - 1.5 }); } }
  return L; }
const slideY = z => z * .22;
GAMES.slide = {
  name:"Slide Race", icon:"🛝", cat:"race", desc:"Zoom down a giant candy slide", dur:45,
  how:["You slide downhill automatically and get faster","Steer left and right. Hit <b>⚡ boost pads</b>, avoid the candy blocks","Tap <b>HOP</b> (or press <b>E</b>) to jump over blocks. First to the bottom wins"],
  init(ids, ctx){ const R = {}; ids.forEach((id, i) => R[id] = { x:(i - (ids.length - 1)/2) * .95, z:1 + (i % 2)*.6, v:6, vx:0, y:0, vy:0, cd:0, hit:0, done:false });
    return { R, L:slideLayout(ctx.seed), fin:[], info:{ seed:ctx.seed } }; },
  tick(G, dt, inp, H){
    for(const id of G.ids){ const r = G.R[id], i = inp[id] || {}; if(r.done){ r.v = Math.max(0, r.v - 30*dt); r.z -= r.v*dt; continue; }
      r.cd -= dt; r.hit -= dt; r.v = Math.min(r.boost > 0 ? 19 : 13, r.v + (r.hit > 0 ? 0 : 2.6)*dt); r.boost = (r.boost || 0) - dt;
      r.vx += (clamp(i.x || 0, -1, 1) * 7.5 - r.vx) * Math.min(1, dt*9); r.x += r.vx*dt; if(Math.abs(r.x) > SW - .55){ r.x = Math.sign(r.x)*(SW - .55); r.vx *= -.4; }
      if(i.a && !r.held && r.cd <= 0 && r.y <= 0){ r.vy = 7.5; r.cd = 1.1; fxp(G, "h", id); } r.held = i.a ? 1 : 0;
      r.vy -= 22*dt; r.y = Math.max(0, r.y + r.vy*dt); r.z -= r.v*dt;
      G.L.forEach((o, k) => { if(Math.abs(o.z - r.z) > .7 || Math.abs(o.x - r.x) > (o.k === "pad" ? .95 : 1.25)) return;
        if(o.k === "pad" && (r.pad !== k)){ r.pad = k; r.v = Math.min(19, r.v + 5); r.boost = 1.4; fxp(G, "b", id); }
        if(o.k === "blk" && r.y < .7 && r.hk !== k){ r.hk = k; r.v *= .3; r.hit = .5; r.vx = (r.x > o.x ? 1 : -1) * 6; fxp(G, "x", id); } });
      for(const k of G.ids){ if(k === id) continue; const o = G.R[k]; const dx = r.x - o.x, dz = r.z - o.z; if(Math.abs(dz) < .8 && Math.abs(dx) < .9){ const p = (.9 - Math.abs(dx)) / 2 * Math.sign(dx || 1); r.x += p; o.x -= p; r.vx += p*6; } }
      if(r.z < -SL){ r.done = true; G.fin.push(id); fxp(G, "fin", id); G.dirty = true; } }
    raceEnd(G, H, () => raceRank(G, id => -G.R[id].z)); },
  timeout(G){ return raceRank(G, id => -G.R[id].z); },
  drop(G, id){},
  bot(G, id){ const r = G.R[id]; if(!r || r.done) return null; let tx = r.tx == null ? (r.tx = 0) : r.tx, hop = 0;
    const ahead = G.L.filter(o => o.z < r.z && o.z > r.z - 9);
    const pad = ahead.find(o => o.k === "pad"), blk = ahead.filter(o => o.k === "blk");
    tx = pad ? pad.x : r.x; blk.forEach(o => { if(Math.abs(o.x - tx) < 1.4){ tx = [-2.6, 0, 2.6].filter(x => !blk.some(b => Math.abs(b.x - x) < 1.3 && Math.abs(b.z - o.z) < 2)).sort((a, b) => Math.abs(a - r.x) - Math.abs(b - r.x))[0]; if(tx == null) tx = r.x; } });
    const near = blk.find(o => Math.abs(o.x - r.x) < 1.2 && r.z - o.z < r.v*.28 + .6); if(near && rand() < .5) hop = 1;
    return { x:clamp((tx - r.x)*.9 + (rand() - .5)*.2, -1, 1), y:0, a:hop }; },
  snap(G){ const o = {}; for(const id in G.R){ const r = G.R[id]; o[id] = [+r.x.toFixed(2), +r.z.toFixed(2), +r.y.toFixed(2), +r.v.toFixed(1), r.boost > 0 ? 1 : 0, r.hit > 0 ? 1 : 0]; } return { R:o, fin:G.fin, fx:G.fx }; },
  view(root, ctx){ const L = slideLayout(ctx.info.seed), S = makeStage(root, { sky:"#ffb0d8", sky2:"#b8e8ff", goo:"#ffd23a", fog:"#ffe8f4", cam:[0, 6.5, 8], look:[0, -1.5, -6] }), v = { S, fxSeen:0 }; ctlShow("stick", "HOP");
    S.goo.visible = false;
    const tilt = Math.atan(.22), slideT = cTex(256, 256, (x, w) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#ff4a8a"); g.addColorStop(.5, "#ff9ac8"); g.addColorStop(1, "#ff4a8a"); x.fillStyle = g; x.fillRect(0, 0, w, w); x.fillStyle = "rgba(255,255,255,.35)"; for(let i=0;i<w;i+=64) x.fillRect(0, i, w, 10); }, [1, SL/12]);
    // a half-pipe: cylinder cut in half, laid along the slope and squashed so it's shallow
    const CR = SW + .3, CD = .32, chute = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, SL + 30, 40, 1, true, Math.PI/2, Math.PI), new THREE.MeshStandardMaterial({ map:slideT, side:THREE.DoubleSide, roughness:.3 }));
    chute.scale.set(1, 1, CD); chute.rotation.x = -Math.PI/2; chute.position.y = CR*CD - .02; chute.receiveShadow = true;
    const holder = new THREE.Group(); holder.add(chute); holder.rotation.x = -tilt; holder.position.set(0, slideY(-SL/2), -SL/2); S.scene.add(holder);
    const surf = x => CR*CD - .02 - CD*Math.sqrt(Math.max(0, CR*CR - x*x));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color:"#9ae89a" })); ground.rotation.x = -Math.PI/2; ground.position.y = slideY(-SL) - 12; S.scene.add(ground);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, .6, 40), new THREE.MeshStandardMaterial({ color:"#3ad8ff", roughness:.1, emissive:"#1a8aff", emissiveIntensity:.2 })); pool.position.set(0, slideY(-SL) - 1.5, -SL - 8); S.scene.add(pool);
    const finLine = new THREE.Mesh(new THREE.PlaneGeometry(SW*2, 1.2), new THREE.MeshBasicMaterial({ map:cTex(256, 32, (x) => { for(let i=0;i<16;i++) for(let j=0;j<2;j++){ x.fillStyle = (i + j) % 2 ? "#fff" : "#222"; x.fillRect(i*16, j*16, 16, 16); } }) }));
    finLine.rotation.x = -Math.PI/2 - tilt; finLine.position.set(0, slideY(-SL) + .05, -SL); S.scene.add(finLine);
    const blkM = new THREE.MeshStandardMaterial({ color:"#7a3ad8", roughness:.3 }), padM = new THREE.MeshBasicMaterial({ map:cTex(128, 128, (x, w) => { x.fillStyle = "#ffe23a"; x.fillRect(0, 0, w, w); x.fillStyle = "#ff8a00"; for(let i=0;i<3;i++){ x.beginPath(); x.moveTo(w/2, 14 + i*36); x.lineTo(w - 20, 44 + i*36); x.lineTo(20, 44 + i*36); x.fill(); } }) });
    const pads = []; L.forEach(o => { if(o.k === "blk"){ const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, .9), blkM); m.position.set(o.x, slideY(o.z) + .5 + surf(o.x), o.z); m.rotation.x = -tilt; m.castShadow = true; S.scene.add(m); const top = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), new THREE.MeshStandardMaterial({ color:"#fff" })); top.position.set(o.x, slideY(o.z) + 1.1 + surf(o.x), o.z); S.scene.add(top); }
      else { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), padM); m.rotation.x = -Math.PI/2 - tilt; m.position.set(o.x, slideY(o.z) + .04 + surf(o.x), o.z); S.scene.add(m); pads.push(m); } });
    const hud = raceHud(root);
    v.update = (s, dt, t) => {
      for(const id in s.R){ const r = s.R[id], b = S.bean(id), k = Math.min(1, dt*14); b.position.x = lerp(b.position.x, r[0], k); b.position.z = lerp(b.position.z, r[1], k); b.position.y = slideY(b.position.z) + r[2] + surf(b.position.x);
        b.rotation.y = Math.PI + clamp((r[0] - b.position.x)*2, -.5, .5); b.rotation.x = r[5] ? -.6 : -.35; animBean(b, r[2] > .1 ? 0 : 2, t); }
      const who = myOrLead({ B:s.R }, ctx.me, (s, id) => s.B[id][1]), me = s.R[who];
      if(me){ S.fx = lerp(S.fx, me[0]*.5, .1); S.fz = lerp(S.fz, me[1], .25); const k = S.k; S.cam.position.set(S.camPos[0]*k + S.fx, slideY(S.fz) + S.camPos[1]*k, S.camPos[2]*k + S.fz); S.cam.lookAt(S.fx, slideY(S.fz - 6) + S.look[1], S.fz + S.look[2]); }
      padM.color.setHSL(.13, 1, .55 + Math.sin(t*8)*.1);
      newFx(v, s.fx, (type, a) => { if(type === "fin"){ sfx.win(); if(a === ctx.me) SND.say("Finished!"); } if(type === "b" && a === ctx.me) sfx.coin(); if(type === "x"){ sfx.bump(); if(a === ctx.me) toast("Ouch! 🍬", 900); } if(type === "h" && a === ctx.me) sfx.boing(); });
      const mine = s.R[ctx.me]; if(mine){ const prog = id => s.fin.includes(id) ? 1e4 - s.fin.indexOf(id) : -s.R[id][1], place = Object.keys(s.R).filter(id => prog(id) > prog(ctx.me)).length + 1;
        hud.innerHTML = s.fin.includes(ctx.me) ? `<b>🏁 Finished ${ordinal(s.fin.indexOf(ctx.me) + 1)}!</b>` : `<b>${ordinal(place)}</b><span>${Math.round(mine[3] * 3.6)} km/h${mine[4] ? " ⚡" : ""}</span>`; }
      S.render(t); };
    v.destroy = () => { hud.remove(); S.destroy(); };
    return v; }
};

// ---------- CLIMB RACE ----------
const CH = 40;
GAMES.climb = {
  name:"Climb Race", icon:"🧗", cat:"race", desc:"Time your grabs to race up the wall", dur:50, rate:10,
  how:["A marker slides along your grip bar","Tap <b>GRAB</b> (or press <b>E</b>) when it's in the green. Bang in the middle = big jump","Miss and you slip down! First to the top (40m) wins"],
  init(ids){ const h = {}; ids.forEach(id => h[id] = 0); return { h, fin:[], st:{}, bots:{} }; },
  onEvent(G, id, d, H){ if(d.e !== "grab" || G.fin.includes(id)) return; if((G.st[id] || 0) > G.t) return; const q = d.q | 0;
    if(q === 2) G.h[id] += 2.6; else if(q === 1) G.h[id] += 1.5; else { G.h[id] = Math.max(0, G.h[id] - 1.4); G.st[id] = G.t + .45; fxp(G, "s", id); }
    if(G.h[id] >= CH){ G.h[id] = CH; G.fin.push(id); fxp(G, "fin", id); } G.dirty = true; },
  tick(G, dt, inp, H){ raceEnd(G, H, () => raceRank(G, id => G.h[id])); },
  timeout(G){ return raceRank(G, id => G.h[id]); },
  drop(G, id){},
  bot(G, id, dt, H){ const B = G.bots[id] || (G.bots[id] = { nx:.6 + rand()*.6 }); if(G.t < B.nx) return null; B.nx = G.t + .42 + rand()*.35; const r = rand(); this.onEvent(G, id, { e:"grab", q:r < .3 ? 2 : r < .8 ? 1 : 0 }, H); return null; },
  snap(G){ const h = {}; for(const id in G.h) h[id] = +G.h[id].toFixed(2); return { h, fin:G.fin, fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const v = { fxSeen:0, imgs:{}, ph:0, dir:1, lock:0 };
    root.innerHTML = `<div class="climb"><canvas id="clCan"></canvas><div class="race-hud" id="clHud"></div><div class="cl-ui"><div class="cl-bar"><i class="z1"></i><i class="z2"></i><b id="clMk"></b></div><button class="mash green" id="clBtn">GRAB!</button></div></div>`;
    const can = $("#clCan"), x = can.getContext("2d"), mk = $("#clMk"), btn = $("#clBtn");
    const imgOf = id => v.imgs[id] || (v.imgs[id] = Object.assign(new Image(), { src:"data:image/svg+xml;charset=utf-8," + encodeURIComponent(beanSVG(playerOf(id)?.bean, 64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')) }));
    const grab = () => { if(CM.phase !== "play" || now() < v.lock) return; const p = v.ph, d = Math.abs(p - .5), q = d < .07 ? 2 : d < .2 ? 1 : 0; ctx.input({ e:"grab", q });
      if(q === 0){ sfx.slip(); v.lock = now() + .45; btn.classList.add("bad"); setTimeout(() => btn.classList.remove("bad"), 400); } else { q === 2 ? sfx.coin() : sfx.step(); btn.classList.remove("hit"); void btn.offsetWidth; btn.classList.add("hit"); } };
    btn.addEventListener("pointerdown", e => { e.preventDefault(); grab(); });
    const key = e => { if(actKey(e)){ e.preventDefault(); if(!e.repeat) grab(); } }; addEventListener("keydown", key);
    v.update = (s, dt, t) => {
      const myH = s.h[ctx.me] || 0, spd = .9 + myH / CH * 1.3; v.ph += v.dir * dt * spd; if(v.ph > 1){ v.ph = 1; v.dir = -1; } if(v.ph < 0){ v.ph = 0; v.dir = 1; } mk.style.left = (v.ph*100) + "%";
      newFx(v, s.fx, (type, a) => { if(type === "fin"){ sfx.win(); if(a === ctx.me) SND.say("Top!"); } });
      const W = can.clientWidth, H = can.clientHeight; if(can.width !== W*2){ can.width = W*2; can.height = H*2; } x.setTransform(2, 0, 0, 2, 0, 0);
      const ids = Object.keys(s.h), n = ids.length, lw = W / n, ppm = H / 14, camH = clamp((v.camH = lerp(v.camH || 0, s.h[ctx.me] != null ? myH : Math.max(...ids.map(i => s.h[i])), Math.min(1, dt*5))), 0, CH);
      const base = H*.5 + camH*ppm;
      const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#7ac8ff"); sky.addColorStop(1, "#ffd8f0"); x.fillStyle = sky; x.fillRect(0, 0, W, H);
      ids.forEach((id, i) => { const lx = i*lw; x.fillStyle = i % 2 ? "#e8b07a" : "#f0bc88"; x.fillRect(lx + 3, 0, lw - 6, H);
        const cols = ["#ff4a8a", "#3ab8ff", "#ffd23a", "#5ae07a", "#9a6aff"]; for(let m = Math.floor(camH - 12); m < camH + 16; m++){ if(m < 0 || m > CH) continue; const y = base - m*ppm; const r = seeded(m*31 + i)(), r2 = seeded(m*17 + i*7)();
          x.fillStyle = cols[Math.floor(r*5)]; x.beginPath(); x.ellipse(lx + lw*(.2 + r2*.6), y, Math.min(9, lw*.08) + 3, 6, r*3, 0, 7); x.fill(); }
        const ty = base - CH*ppm; if(ty > -20){ x.fillStyle = "#fff"; x.fillRect(lx + 3, ty - 6, lw - 6, 6); x.font = "18px sans-serif"; x.textAlign = "center"; x.fillText("🏁", lx + lw/2, ty - 10); }
        const hy = base - s.h[id]*ppm, sz = Math.min(56, lw*.7), im = imgOf(id), sw = Math.sin(t*10 + i)*3; if(im.complete) x.drawImage(im, lx + lw/2 - sz/2 + sw, hy - sz*1.1, sz, sz*1.3);
        x.font = "bold 11px Nunito, sans-serif"; x.fillStyle = id === ctx.me ? "#ffe23a" : "#fff"; x.strokeStyle = "rgba(0,0,0,.5)"; x.lineWidth = 3; x.strokeText(id, lx + lw/2, hy - sz*1.15); x.fillText(id, lx + lw/2, hy - sz*1.15); });
      x.fillStyle = "#7ad86a"; x.fillRect(0, base, W, H);
      const place = ids.filter(id => (s.fin.includes(id) ? 1e3 - s.fin.indexOf(id) : s.h[id]) > (s.fin.includes(ctx.me) ? 1e3 - s.fin.indexOf(ctx.me) : myH)).length + 1;
      $("#clHud").innerHTML = s.h[ctx.me] == null ? "" : s.fin.includes(ctx.me) ? `<b>🏁 ${ordinal(s.fin.indexOf(ctx.me) + 1)}!</b>` : `<b>${ordinal(place)}</b><span>${myH.toFixed(1)}m / ${CH}m</span>`; };
    v.destroy = () => removeEventListener("keydown", key); return v; }
};
