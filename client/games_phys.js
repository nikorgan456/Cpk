// ===================== physics games: Sumo Ring, Falling Tiles, Hot Potato Bomb =====================
function outRank(G){ const alive = G.ids.filter(id => G.B[id] && G.B[id].alive); return [alive].concat((G.outs || []).slice().reverse().map(id => [id])); }
function physView(root, ctx, opts, build){
  const S = makeStage(root, opts), view = { S, fxSeen:0, destroy:() => S.destroy() }; ctlShow("stick", opts.btn || "DIVE"); build(S, view);
  view.update = (snap, dt, t) => { if(view.tick) view.tick(snap, dt, t); physDraw(S, snap.B, dt, t, view.extra); newFx(view, snap.fx, (a, b, c) => view.onFx ? view.onFx(a, b, c) : physFx(a, b)); S.render(t); };
  return view;
}
const icingTex = (base, dots) => cTex(512, 512, (x, w) => { x.fillStyle = base; x.fillRect(0, 0, w, w); for(let i=0;i<260;i++){ x.save(); x.translate(rand()*w, rand()*w); x.rotate(rand()*3); x.fillStyle = pick(dots); x.beginPath(); x.roundRect ? x.roundRect(-9, -3, 18, 6, 3) : x.rect(-9, -3, 18, 6); x.fill(); x.restore(); } });

// ---------- SUMO RING ----------
GAMES.sumo = {
  name:"Sumo Ring", icon:"🍩", cat:"phys", desc:"Bump everyone off the shrinking donut", dur:50,
  how:["Move with the joystick, or WASD / arrow keys","Tap <b>DIVE</b> (or Space) to slam into someone","Last bean on the donut wins. It keeps shrinking!"],
  init(ids){ return { R:9.5, B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*5.5, Math.sin(a)*5.5]; }), outs:[] }; },
  tick(G, dt, inp, H){ if(G.t > 4) G.R = Math.max(3.4, 9.5 - (G.t - 4) * .13);
    physStep(G, dt, inp, { ground:(x, z) => Math.hypot(x, z) < G.R });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout(G){ const alive = G.ids.filter(id => G.B[id].alive).sort((a, b) => Math.hypot(G.B[a].x, G.B[a].z) - Math.hypot(G.B[b].x, G.B[b].z)); return alive.map(id => [id]).concat((G.outs || []).slice().reverse().map(id => [id])); },
  drop(G, id){ if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); } },
  bot(G, id){ return physBot(G, id, { safe:G.R * .55 }); },
  snap(G){ return { B:physSnap(G.B), R:+G.R.toFixed(2), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#8fdcff", sky2:"#ffe0f4", goo:"#ff9ad8" }, (S, v) => {
    const top = new THREE.MeshStandardMaterial({ map:icingTex("#ff7ab8", ["#fff","#ffe23a","#3ad8ff","#5ae07a","#9a6aff"]), roughness:.5 }), side = new THREE.MeshStandardMaterial({ color:"#e8a860", roughness:.7 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 72), [side, top, side]); ring.position.y = -.6; ring.receiveShadow = true; S.scene.add(ring);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 8, 72), new THREE.MeshBasicMaterial({ color:"#ffffff" })); lip.rotation.x = Math.PI/2; lip.position.y = .02; S.scene.add(lip);
    v.tick = s => { const r = lerp(ring.scale.x || 9.5, s.R, .2); ring.scale.set(r, 1, r); lip.scale.set(r, r, 1); lip.material.color.set(s.R < 5 ? (Math.sin(now()*10) > 0 ? "#ff3a5a" : "#fff") : "#fff"); };
  }); }
};

// ---------- FALLING TILES ----------
const TN = 9, TS = 2;
const tileAt = (x, z) => { const i = Math.round(x / TS + (TN - 1)/2), j = Math.round(z / TS + (TN - 1)/2); if(i < 0 || j < 0 || i >= TN || j >= TN) return -1; if(Math.abs(x - (i - (TN-1)/2)*TS) > .98 || Math.abs(z - (j - (TN-1)/2)*TS) > .98) return -2; return j*TN + i; };
GAMES.tiles = {
  name:"Falling Tiles", icon:"🧇", cat:"phys", desc:"Tiles drop after you step on them", dur:50,
  how:["Every tile you touch wobbles, then falls","Keep moving and don't get trapped","Last bean standing wins. You can DIVE across gaps!"],
  init(ids){ return { T:Array(TN*TN).fill(0), B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*5.2, Math.sin(a)*5.2]; }), outs:[], rt:0 }; },
  tick(G, dt, inp, H){
    G.ids.forEach(id => { const b = G.B[id]; if(!b.alive || b.fall || b.dash > 0) return; const k = tileAt(b.x, b.z); if(k >= 0 && G.T[k] === 0){ G.T[k] = .6; G.dirty = true; } });
    for(let k=0;k<G.T.length;k++) if(G.T[k] > 0){ G.T[k] -= dt; if(G.T[k] <= 0){ G.T[k] = -1; G.dirty = true; } }
    if(G.t > 14){ G.rt -= dt; if(G.rt <= 0){ G.rt = Math.max(.25, 1.3 - (G.t - 14) * .03); const solid = G.T.map((v, k) => v === 0 ? k : -1).filter(k => k >= 0); if(solid.length) G.T[pick(solid)] = .9; } }
    physStep(G, dt, inp, { ground:(x, z, b) => { if(b.dash > 0) return true; const k = tileAt(x, z); return k >= 0 && G.T[k] !== -1; }, speed:6.5 });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout:outRank, drop(G, id){ if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive || b.fall) return null;
    // look around for the nearest solid tile not under anyone else and head there
    if(!b.goal || G.T[b.goal] !== 0 || rand() < .02){ let best = -1, bd = 1e9; for(let k=0;k<G.T.length;k++){ if(G.T[k] !== 0) continue; const x = (k % TN - (TN-1)/2)*TS, z = (Math.floor(k / TN) - (TN-1)/2)*TS, d = Math.hypot(x - b.x, z - b.z) + rand()*3; if(d > 1.2 && d < bd){ bd = d; best = k; } } b.goal = best; }
    if(b.goal < 0) return { x:0, y:0 }; const x = (b.goal % TN - (TN-1)/2)*TS, z = (Math.floor(b.goal / TN) - (TN-1)/2)*TS, dx = x - b.x, dz = z - b.z, m = Math.hypot(dx, dz) || 1;
    return { x:dx/m*.85, y:dz/m*.85, a: m > 2.6 && m < 3.6 && rand() < .04 ? 1 : 0 }; },
  snap(G){ return { B:physSnap(G.B), T:G.T.map(v => v === -1 ? "x" : v > 0 ? "s" : "o").join(""), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#9ae8ff", sky2:"#fff0c8", goo:"#7ad8ff", fog:"#fff0c8", cam:[0, 19, 16] }, (S, v) => {
    const cols = ["#ff7ab8", "#ffd23a", "#7ae0ff", "#9aff8a", "#c79aff"], tiles = [];
    const geo = new THREE.BoxGeometry(1.86, .5, 1.86);
    for(let k=0;k<TN*TN;k++){ const i = k % TN, j = Math.floor(k / TN), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:cols[(i + j*2) % cols.length], roughness:.35 }));
      m.position.set((i - (TN-1)/2)*TS, -.25, (j - (TN-1)/2)*TS); m.receiveShadow = true; m.castShadow = true; S.scene.add(m); tiles.push({ m, st:"o", vy:0, base:m.material.color.clone() }); }
    v.tick = (s, dt) => { for(let k=0;k<tiles.length;k++){ const T = tiles[k], st = s.T[k];
      if(st === "s"){ T.m.position.x = ((k % TN) - (TN-1)/2)*TS + (rand() - .5)*.12; T.m.material.color.copy(T.base).lerp(new THREE.Color("#ffffff"), .45); }
      if(st === "x" && T.st !== "x"){ T.vy = 0; if(rand() < .3) sfx.pop(); }
      if(st === "x"){ T.vy -= 25*dt; T.m.position.y += T.vy*dt; T.m.rotation.x += dt*1.5; T.m.visible = T.m.position.y > -20; }
      if(st === "o"){ T.m.position.x = ((k % TN) - (TN-1)/2)*TS; }
      T.st = st; } };
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
        G.ids.forEach(id => { const b = G.B[id]; if(!b.alive) return; const dx = b.x - h.x, dz = b.z - h.z, d = Math.hypot(dx, dz) || 1; if(d < 4.5){ b.vx += dx/d * (4.5 - d) * 4; b.vz += dz/d * (4.5 - d) * 4; } });
        G.holder = null; G.next = 1.8; } }
    else { G.next -= dt; const alive = G.ids.filter(id => G.B[id].alive); if(G.next <= 0 && alive.length > 1){ G.holder = pick(alive); G.max = G.fuse = Math.max(3.5, 8 - G.outs.length * .5) + rand()*2.5; G.cd = .4; fxp(G, "n", G.holder); } }
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout:outRank, drop(G, id){ if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); if(G.holder === id){ G.holder = null; G.next = 1; } } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive) return null;
    if(G.holder === id) return physBot(G, id, { safe:99 });
    if(G.holder){ const h = G.B[G.holder], dx = b.x - h.x, dz = b.z - h.z, d = Math.hypot(dx, dz) || 1; if(d < 6){ let x = dx/d, z = dz/d; if(Math.abs(b.x) > 6.5) x = -Math.sign(b.x)*.6; if(Math.abs(b.z) > 6.5) z = -Math.sign(b.z)*.6; return { x, y:z, a: d < 2.2 && rand() < .05 ? 1 : 0 }; } }
    return { x:-b.x*.1 + (rand() - .5)*.4, y:-b.z*.1 + (rand() - .5)*.4 }; },
  snap(G){ return { B:physSnap(G.B), h:G.holder, f:+Math.max(0, G.fuse).toFixed(2), m:+G.max.toFixed(2), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#ffcf8a", sky2:"#ff9ac8", goo:"#ffb03a", fog:"#ffc8d8", cam:[0, 20, 15] }, (S, v) => {
    const floorT = cTex(256, 256, (x, w) => { for(let i=0;i<8;i++) for(let j=0;j<8;j++){ x.fillStyle = (i + j) % 2 ? "#ffe8f4" : "#ffc2e0"; x.fillRect(i*32, j*32, 32, 32); } }, [2, 2]);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(17, .6, 17), new THREE.MeshStandardMaterial({ map:floorT, roughness:.6 })); floor.position.y = -.3; floor.receiveShadow = true; S.scene.add(floor);
    const caneT = cTex(64, 256, (x, w, h) => { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.fillStyle = "#ff3a5a"; for(let y=-64;y<h;y+=32){ x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + 32); x.lineTo(w, y + 48); x.lineTo(0, y + 16); x.fill(); } });
    const caneM = new THREE.MeshStandardMaterial({ map:caneT, roughness:.4 });
    [[0, 8.7, 17.4, .5], [0, -8.7, 17.4, .5], [8.7, 0, .5, 17.4], [-8.7, 0, .5, 17.4]].forEach(([x, z, w, d]) => { const wall = new THREE.Mesh(new THREE.BoxGeometry(w, .9, d), caneM); wall.position.set(x, .45, z); wall.castShadow = true; S.scene.add(wall); });
    const bomb = new THREE.Group(), bm = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 16), new THREE.MeshStandardMaterial({ color:"#1a1a24", roughness:.3, metalness:.4, emissive:"#ff2a00", emissiveIntensity:0 })); bomb.add(bm);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .14, 10), new THREE.MeshStandardMaterial({ color:"#888" })); cap.position.y = .42; bomb.add(cap);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color:"#ffd23a" })); spark.position.y = .56; bomb.add(spark); bomb.visible = false; S.scene.add(bomb);
    const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color:"#ffb03a", transparent:true, opacity:0 })); S.scene.add(blast); let bt = 9;
    let beepT = 0, hud = document.createElement("div"); hud.className = "bomb-hud"; root.appendChild(hud);
    v.tick = (s, dt, t) => { bomb.visible = !!s.h; if(s.h){ const b = S.bean(s.h); bomb.position.set(b.position.x, b.position.y + 2.05 + Math.sin(t*10)*.05, b.position.z); const k = 1 - s.f / s.m;
        bm.material.emissiveIntensity = k * (.5 + Math.sin(t * (6 + k*30)) * .5); bm.scale.setScalar(1 + k*.25 + Math.sin(t*(6 + k*30))*.04*k); spark.scale.setScalar(.6 + rand()*.8);
        beepT -= dt; if(beepT <= 0){ sfx.tick(); beepT = Math.max(.08, s.f / s.m * .7); }
        hud.innerHTML = s.h === NET.me ? `<b>💣 YOU HAVE THE BOMB!</b><span>Touch someone!</span>` : `<span>💣 ${esc(s.h)} has the bomb</span>`; hud.className = "bomb-hud" + (s.h === NET.me ? " me" : ""); }
      else hud.innerHTML = "";
      bt += dt; blast.scale.setScalar(.5 + bt*12); blast.material.opacity = Math.max(0, .9 - bt*2.2); };
    v.onFx = (type, a, b, c) => { if(type === "x"){ blast.position.set(b, .5, c); bt = 0; sfx.boom(); if(a === NET.me) SND.say("Boom!"); } else if(type === "p"){ sfx.pass(); } else if(type === "n"){ sfx.ding(); } else physFx(type, a); };
    const oldDestroy = () => hud.remove(); v.destroy = () => { oldDestroy(); S.destroy(); };
  }); }
};
