// ===================== physics games: Sumo Ring, Falling Tiles, Hot Potato Bomb =====================
function outRank(G){ const alive = G.ids.filter(id => G.B[id] && G.B[id].alive); return [alive].concat((G.outs || []).slice().reverse().map(id => [id])); }
function physView(root, ctx, opts, build){
  // wide arenas turn sideways on tall phone screens (and the stick turns with them)
  if(opts.rot && !opts.portrait){ const c = opts.cam || [0, 17, 15]; opts.portrait = { cam:[-(c[2] + 5), c[1] + 3, 0], look:[1.5, 0, 0], a:.62 }; }
  const S = makeStage(root, opts), view = { S, fxSeen:0, destroy:() => S.destroy() }; ctlShow("stick", opts.btn || "DIVE", { jump:opts.jump }); build(S, view);
  const pred = ctx.host || opts.pred === false ? null : Object.assign({ speed:7, acc:90 }, opts.pred || {});
  view.update = (snap, dt, t) => { if(opts.rot) CTL.map = root.clientWidth < root.clientHeight ? (x, y) => [-y, x] : null; if(view.tick) view.tick(snap, dt, t); physDraw(S, snap.B, dt, t, view.extra, pred); newFx(view, snap.fx, (a, b, c, d) => { fxBurst(S, a, b, c, d); view.onFx ? view.onFx(a, b, c, d) : physFx(a, b); }); S.render(t); };
  return view;
}
const icingTex = (base, dots) => cTex(512, 512, (x, w) => { x.fillStyle = base; x.fillRect(0, 0, w, w); for(let i=0;i<260;i++){ x.save(); x.translate(rand()*w, rand()*w); x.rotate(rand()*3); x.fillStyle = pick(dots); x.beginPath(); x.roundRect ? x.roundRect(-9, -3, 18, 6, 3) : x.rect(-9, -3, 18, 6); x.fill(); x.restore(); } });

// ---------- SUMO RING ----------
// big chunky beans, a BASH button that launches whoever you're touching, and a forgiving edge so you don't slip off by accident
const SR = .82, SBIG = SR / .5;
GAMES.sumo = {
  name:"Sumo Ring", icon:"🍩", cat:"phys", desc:"Bash everyone off the shrinking donut", dur:50,
  how:["Move with the joystick (or WASD / arrow keys)","Touching someone? Hit <b>BASH</b> (or press <b>E</b>) to launch them!","Last bean on the donut wins. It keeps shrinking!"],
  init(ids){ return { R:10.5, B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*6, Math.sin(a)*6]; }), outs:[] }; },
  tick(G, dt, inp, H){ if(G.t > 5) G.R = Math.max(4.2, 10.5 - (G.t - 5) * .15);
    physStep(G, dt, inp, { r:SR, speed:6.4, acc:90, imp:1.1, ground:(x, z) => Math.hypot(x, z) < G.R + .35, act:(id, b) => this.bash(G, id, b) });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  bash(G, id, b){ if(b.cd > 0 || b.fall) return; let hit = 0;
    for(const k of G.ids){ if(k === id) continue; const c = G.B[k]; if(!c.alive || c.fall) continue; const dx = c.x - b.x, dz = c.z - b.z, d = Math.hypot(dx, dz);
      if(d < SR*2 + .55){ const nx = dx/(d || 1), nz = dz/(d || 1); c.vx = nx*14 + c.vx*.2; c.vz = nz*14 + c.vz*.2; c.dash = 0; c.hit = .45; c.stun = .42; c.cd = Math.max(c.cd, .25); hit++; fxp(G, "bash", id, k); } }
    if(hit){ b.cd = .65; b.vx *= .3; b.vz *= .3; } else { b.cd = .3; b.vx += Math.sin(b.f)*4; b.vz += Math.cos(b.f)*4; fxp(G, "whiff", id); } },
  timeout(G){ const alive = G.ids.filter(id => G.B[id].alive).sort((a, b) => Math.hypot(G.B[a].x, G.B[a].z) - Math.hypot(G.B[b].x, G.B[b].z)); return alive.map(id => [id]).concat((G.outs || []).slice().reverse().map(id => [id])); },
  drop(G, id){ if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive || b.fall) return null; const r = physBot(G, id, { safe:G.R * .6, reach:0 }) || { x:0, y:0 };
    if(Math.hypot(b.x, b.z) > G.R - 1.6){ const d = Math.hypot(b.x, b.z) || 1; r.x = -b.x/d; r.y = -b.z/d; }
    const touching = G.ids.some(k => k !== id && G.B[k].alive && !G.B[k].fall && Math.hypot(G.B[k].x - b.x, G.B[k].z - b.z) < SR*2 + .45);
    r.a = touching && b.cd <= 0 && rand() < .09 ? 1 : 0; return r; },
  snap(G){ return { B:physSnap(G.B), R:+G.R.toFixed(2), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#8fdcff", sky2:"#ffe0f4", goo:"#ff9ad8", cam:[0, 19, 16], btn:"BASH", pred:{ speed:6.4, acc:90 } }, (S, v) => {
    const top = new THREE.MeshStandardMaterial({ map:icingTex("#ff7ab8", ["#fff","#ffe23a","#3ad8ff","#5ae07a","#9a6aff"]), roughness:.5 }), side = new THREE.MeshStandardMaterial({ color:"#e8a860", roughness:.7 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 72), [side, top, side]); ring.position.y = -.6; ring.receiveShadow = true; S.scene.add(ring);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 8, 72), new THREE.MeshBasicMaterial({ color:"#ffffff" })); lip.rotation.x = Math.PI/2; lip.position.y = .02; S.scene.add(lip);
    const waves = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.7, 1, 32), new THREE.MeshBasicMaterial({ color:"#fff36a", transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false })); m.rotation.x = -Math.PI/2; m.position.y = .08; S.scene.add(m); return { m, t:9 }; }); let wi = 0;
    v.extra = (id, b) => { if(!b.userData.big){ b.userData.big = 1; b.scale.setScalar(SBIG); } if(b.userData.sq > 0){ b.userData.sq -= .05; b.scale.set(SBIG*(1 + b.userData.sq*.5), SBIG*(1 - b.userData.sq*.4), SBIG*(1 + b.userData.sq*.5)); } };
    v.tick = (s, dt) => { const r = lerp(ring.scale.x || 10.5, s.R, .2); ring.scale.set(r, 1, r); lip.scale.set(r, r, 1); lip.material.color.set(s.R < 5.5 ? (Math.sin(now()*10) > 0 ? "#ff3a5a" : "#fff") : "#fff");
      waves.forEach(w => { w.t += dt; const k = w.t / .35; w.m.material.opacity = Math.max(0, .9 - k*.9); w.m.scale.setScalar(1 + k*2.6); }); };
    v.onFx = (type, a, b) => { if(type === "bash"){ const A = S.bean(a), B = S.bean(b), w = waves[wi++ % 3]; w.t = 0; w.m.position.x = (A.position.x + B.position.x)/2; w.m.position.z = (A.position.z + B.position.z)/2; B.userData.sq = 1; A.userData.sq = .5; sfx.whack(); sfx.bump(); if(b === ctx.me) toast(`💥 ${a} bashed you!`, 1000); }
      else if(type === "whiff"){ if(a === ctx.me) sfx.whoosh(); } else physFx(type, a); };
  }); }
};

// ---------- FALLING TILES ----------
// two floors: drop through the top one and you land on the one below. Fall off the bottom and you're out
const TN = 9, TS = 2, NN = TN*TN, LY = [0, -5];
// the tile under a point (the thin seams between tiles count as the nearest tile, so you never drop through a crack)
const tileAt = (x, z) => { const i = Math.round(x / TS + (TN - 1)/2), j = Math.round(z / TS + (TN - 1)/2); if(i < 0 || j < 0 || i >= TN || j >= TN) return -1; return j*TN + i; };
const tileX = k => (k % TN - (TN-1)/2)*TS, tileZ = k => (Math.floor(k / TN) - (TN-1)/2)*TS;
const solidAt = (G, L, x, z) => { const s1 = (px, pz) => { const k = tileAt(px, pz); return k >= 0 && G.T[L*NN + k] !== -1; }; return s1(x, z) || s1(x + .25, z) || s1(x - .25, z) || s1(x, z + .25) || s1(x, z - .25); };
GAMES.tiles = {
  name:"Falling Tiles", icon:"🧇", cat:"phys", desc:"Tiles drop after you step on them", dur:55,
  how:["Every tile you touch wobbles, then falls. Keep moving!","Fall through and you land on the floor below: a second chance","Fall off the bottom floor and you're out. Last bean standing wins. <b>DIVE</b> (or <b>E</b>) across gaps!"],
  init(ids){ const B = physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*5.2, Math.sin(a)*5.2]; }); ids.forEach(id => B[id].layer = 0); return { T:Array(NN*2).fill(0), B, outs:[], rt:0 }; },
  tick(G, dt, inp, H){
    G.ids.forEach(id => { const b = G.B[id]; if(!b.alive || b.fall || b.dash > 0) return; const k = tileAt(b.x, b.z), i = b.layer*NN + k; if(k >= 0 && G.T[i] === 0 && G.t > .8){ G.T[i] = 1; G.dirty = true; } });
    for(let k=0;k<G.T.length;k++) if(G.T[k] > 0){ G.T[k] -= dt; if(G.T[k] <= 0){ G.T[k] = -1; G.dirty = true; } }
    if(G.t > 18){ G.rt -= dt; if(G.rt <= 0){ G.rt = Math.max(.3, 1.4 - (G.t - 18) * .03); const solid = G.T.map((v, k) => v === 0 ? k : -1).filter(k => k >= 0); if(solid.length) G.T[pick(solid)] = 1.1; } }
    physStep(G, dt, inp, { ground:(x, z, b) => b.dash > 0 || solidAt(G, b.layer, x, z), speed:6.3, outY:-13 });
    G.ids.forEach(id => { const b = G.B[id]; if(b.alive && b.fall && b.layer === 0 && b.y <= LY[1] && b.y > LY[1] - 1.2 && solidAt(G, 1, b.x, b.z)){ b.fall = false; b.y = LY[1]; b.vy = 0; b.layer = 1; b.vx *= .3; b.vz *= .3; fxp(G, "l", id); } });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout(G){ const alive = G.ids.filter(id => G.B[id].alive), top = alive.filter(id => G.B[id].layer === 0), bot = alive.filter(id => G.B[id].layer === 1); return [top, bot].filter(g => g.length).concat(G.outs.slice().reverse().map(id => [id])); },
  drop(G, id){ if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive || b.fall) return null; const L = b.layer;
    const ok = k => k >= 0 && G.T[L*NN + k] === 0, gone = k => k < 0 || G.T[L*NN + k] === -1 || G.T[L*NN + k] > 0 && G.T[L*NN + k] < .5;
    const clear = (x0, z0, x1, z1) => { for(let i=2;i<=8;i++) if(gone(tileAt(lerp(x0, x1, i/8), lerp(z0, z1, i/8)))) return false; return true; };
    // pick a solid tile a short walk away with no holes on the way; prefer the middle and tiles nobody else is near
    if(b.goal == null || !ok(b.goal) || rand() < .015 || Math.hypot(tileX(b.goal) - b.x, tileZ(b.goal) - b.z) < .6){ let best = -1, bs = 1e9, jump = -1;
      for(let k=0;k<NN;k++){ if(!ok(k)) continue; const x = tileX(k), z = tileZ(k), d = Math.hypot(x - b.x, z - b.z); if(d < 1.5 || d > 6) continue;
        const crowd = G.ids.some(o => o !== id && G.B[o].alive && G.B[o].layer === L && Math.hypot(G.B[o].x - x, G.B[o].z - z) < 1.5) ? 3 : 0, sc = d*.4 + Math.hypot(x, z)*.35 + crowd + rand()*1.5;
        if(clear(b.x, b.z, x, z)){ if(sc < bs){ bs = sc; best = k; } } else if(d < 3.4 && jump < 0) jump = k; }
      b.goal = best >= 0 ? best : jump; b.jump = best < 0 && jump >= 0; }
    if(b.goal < 0) return { x:0, y:0 }; const dx = tileX(b.goal) - b.x, dz = tileZ(b.goal) - b.z, m = Math.hypot(dx, dz) || 1;
    return { x:dx/m*.9, y:dz/m*.9, a: b.jump && m < 3 && m > 1.6 && rand() < .2 ? 1 : 0 }; },
  snap(G){ return { B:physSnap(G.B), T:G.T.map(v => v === -1 ? "x" : v > 0 ? "s" : "o").join(""), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#9ae8ff", sky2:"#fff0c8", goo:"#7ad8ff", fog:"#fff0c8", cam:[0, 20, 16], look:[0, -1.5, 1], pred:{ speed:6.3 } }, (S, v) => {
    S.goo.position.y = -14; const cols = [["#ff7ab8", "#ffd23a", "#7ae0ff", "#9aff8a", "#c79aff"], ["#c03a7a", "#d08a20", "#2a7ab0", "#3a9a5a", "#7a4ac0"]], tiles = [];
    const geo = new THREE.BoxGeometry(1.86, .5, 1.86);
    for(let k=0;k<NN*2;k++){ const L = Math.floor(k / NN), kk = k % NN, i = kk % TN, j = Math.floor(kk / TN), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:cols[L][(i + j*2) % 5], roughness:.35 }));
      m.position.set(tileX(kk), LY[L] - .25, tileZ(kk)); m.receiveShadow = true; m.castShadow = L === 0; S.scene.add(m); tiles.push({ m, st:"o", vy:0, base:m.material.color.clone(), x:tileX(kk) }); }
    v.tick = (s, dt) => { for(let k=0;k<tiles.length;k++){ const T = tiles[k], st = s.T[k];
      if(st === "s"){ T.m.position.x = T.x + (rand() - .5)*.12; T.m.material.color.copy(T.base).lerp(new THREE.Color("#ffffff"), .45); }
      if(st === "x" && T.st !== "x"){ T.vy = 0; if(rand() < .3) sfx.pop(); }
      if(st === "x" && T.m.visible){ T.vy -= 25*dt; T.m.position.y += T.vy*dt; T.m.rotation.x += dt*1.5; if(T.m.position.y < -16) T.m.visible = false; }
      if(st === "o"){ T.m.position.x = T.x; }
      T.st = st; } };
    v.onFx = (type, a) => { if(type === "l"){ sfx.bump(); if(a === ctx.me) toast("Phew! Bottom floor, last chance 😬", 1600); } else physFx(type, a); };
  }); }
};

// ---------- HOT POTATO BOMB ----------
GAMES.bomb = {
  name:"Hot Potato Bomb", icon:"💣", cat:"phys", desc:"Pass the bomb before it blows", dur:58,
  how:["One bean holds a ticking bomb","Touch someone to pass it to them","Whoever holds it when it explodes is out. Last bean wins!"],
  init(ids){ const G = { B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*5, Math.sin(a)*5]; }), outs:[], holder:null, fuse:0, max:1, cd:0, next:2.5 }; return G; },
  tick(G, dt, inp, H){
    if(G.holder){ G.ids.forEach(id => G.B[id].boost = id === G.holder ? 1.14 : 1); }
    physStep(G, dt, inp, { wall:{ w:17, h:17 }, speed:6.6, onTouch:(a, b) => { if(G.cd > 0 || !G.holder) return; if(a === G.holder || b === G.holder){ G.holder = a === G.holder ? b : a; G.cd = .6; fxp(G, "p", G.holder); G.dirty = true; } } });
    G.cd -= dt;
    if(G.holder){ G.fuse -= dt; if(G.fuse <= 0){ const h = G.B[G.holder]; h.alive = false; G.outs.push(G.holder); fxp(G, "x", G.holder, +h.x.toFixed(1), +h.z.toFixed(1));
        G.ids.forEach(id => { const b = G.B[id]; if(!b.alive) return; const dx = b.x - h.x, dz = b.z - h.z, d = Math.hypot(dx, dz) || 1; if(d < 4.5){ b.vx += dx/d * (4.5 - d) * 4; b.vz += dz/d * (4.5 - d) * 4; b.stun = .4; } });
        G.holder = null; G.next = 1.8; } }
    else { G.next -= dt; const alive = G.ids.filter(id => G.B[id].alive); if(G.next <= 0 && alive.length > 1){ G.holder = pick(alive); G.max = G.fuse = Math.max(3.5, 8 - G.outs.length * .5) + rand()*2.5; G.cd = .4; fxp(G, "n", G.holder); } }
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout:outRank, drop(G, id){ if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); if(G.holder === id){ G.holder = null; G.next = 1; } } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive) return null;
    if(G.holder === id) return physBot(G, id, { safe:99 });
    if(G.holder){ const h = G.B[G.holder], dx = b.x - h.x, dz = b.z - h.z, d = Math.hypot(dx, dz) || 1; if(d < 6){ let x = dx/d, z = dz/d; if(Math.abs(b.x) > 6.5) x = -Math.sign(b.x)*.6; if(Math.abs(b.z) > 6.5) z = -Math.sign(b.z)*.6; return { x, y:z, a: d < 2.2 && rand() < .05 ? 1 : 0 }; } }
    return { x:-b.x*.1 + (rand() - .5)*.4, y:-b.z*.1 + (rand() - .5)*.4 }; },
  snap(G){ return { B:physSnap(G.B), h:G.holder, f:+Math.max(0, G.fuse).toFixed(2), m:+G.max.toFixed(2), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#ffcf8a", sky2:"#ff9ac8", goo:"#ffb03a", fog:"#ffc8d8", cam:[0, 20, 15], pred:{ speed:6.6 } }, (S, v) => {
    const floorT = cTex(256, 256, (x, w) => { for(let i=0;i<8;i++) for(let j=0;j<8;j++){ x.fillStyle = (i + j) % 2 ? "#ffe8f4" : "#ffc2e0"; x.fillRect(i*32, j*32, 32, 32); } }, [2, 2]);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(17, .6, 17), new THREE.MeshStandardMaterial({ map:floorT, roughness:.6 })); floor.position.y = -.3; floor.receiveShadow = true; S.scene.add(floor);
    const caneT = cTex(64, 256, (x, w, h) => { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.fillStyle = "#ff3a5a"; for(let y=-64;y<h;y+=32){ x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + 32); x.lineTo(w, y + 48); x.lineTo(0, y + 16); x.fill(); } });
    const caneM = new THREE.MeshStandardMaterial({ map:caneT, roughness:.4 });
    [[0, 8.7, 17.4, .5], [0, -8.7, 17.4, .5], [8.7, 0, .5, 17.4], [-8.7, 0, .5, 17.4]].forEach(([x, z, w, d]) => { const wall = new THREE.Mesh(new THREE.BoxGeometry(w, .9, d), caneM); wall.position.set(x, .45, z); wall.castShadow = true; S.scene.add(wall); });
    const bomb = new THREE.Group(), bm = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 16), new THREE.MeshStandardMaterial({ color:"#1a1a24", roughness:.3, metalness:.4, emissive:"#ff2a00", emissiveIntensity:0 })); bomb.add(bm);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .14, 10), new THREE.MeshStandardMaterial({ color:"#888" })); cap.position.y = .42; bomb.add(cap);
    let spark = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color:"#ffd23a" })); spark.position.y = .56; bomb.add(spark); bomb.visible = false; S.scene.add(bomb);
    let bmM = bm.material, bmS = bm; const BM = mdl("bomb");
    if(BM){ bomb.clear(); bomb.add(BM); bmS = BM; spark = BM.getObjectByName("spark") || spark; BM.traverse(o => { if(o.isMesh && o.material.color.getHex() === 0x22222e){ o.material = bmM = o.material.clone(); bmM.emissive.set("#ff2a00"); bmM.emissiveIntensity = 0; } }); }
    const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color:"#ffb03a", transparent:true, opacity:0 })); S.scene.add(blast); let bt = 9;
    let beepT = 0, hud = document.createElement("div"); hud.className = "bomb-hud"; root.appendChild(hud);
    v.tick = (s, dt, t) => { bomb.visible = !!s.h; if(s.h){ const b = S.bean(s.h); bomb.position.set(b.position.x, b.position.y + 2.05 + Math.sin(t*10)*.05, b.position.z); const k = 1 - s.f / s.m;
        bmM.emissiveIntensity = k * (.5 + Math.sin(t * (6 + k*30)) * .5); bmS.scale.setScalar(1 + k*.25 + Math.sin(t*(6 + k*30))*.04*k); spark.scale.setScalar(.6 + rand()*.8);
        beepT -= dt; if(beepT <= 0){ sfx.tick(); beepT = Math.max(.08, s.f / s.m * .7); }
        hud.innerHTML = s.h === NET.me ? `<b>💣 YOU HAVE THE BOMB!</b><span>Touch someone!</span>` : `<span>💣 ${esc(s.h)} has the bomb</span>`; hud.className = "bomb-hud" + (s.h === NET.me ? " me" : ""); }
      else hud.innerHTML = "";
      bt += dt; blast.scale.setScalar(.5 + bt*12); blast.material.opacity = Math.max(0, .9 - bt*2.2); };
    v.onFx = (type, a, b, c) => { if(type === "x"){ blast.position.set(b, .5, c); bt = 0; sfx.boom(); if(a === NET.me) SND.say("Boom!"); } else if(type === "p"){ sfx.pass(); } else if(type === "n"){ sfx.ding(); } else physFx(type, a); };
    const oldDestroy = () => hud.remove(); v.destroy = () => { oldDestroy(); S.destroy(); };
  }); }
};
