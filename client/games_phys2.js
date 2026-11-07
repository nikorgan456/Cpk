// ===================== more physics games: Bumper Cars, Dodgeball, King of the Hill, Wrecking Ball, Seesaw Survival =====================
const ringSpawn = r => (i, n) => { const a = i / n * Math.PI * 2 + .3; return [Math.cos(a)*r, Math.sin(a)*r]; };
const killOut = G => (id) => { if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); } };
const hashCol = id => ["#ff4a8a", "#3ab8ff", "#ffd23a", "#5ae07a", "#9a6aff", "#ff8a3a", "#2ad8c8", "#ff5a5a"][[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 8];
function hudEl(root, cls = "bomb-hud"){ const h = document.createElement("div"); h.className = cls; root.appendChild(h); return h; }

// ---------- BUMPER CARS ----------
GAMES.bumper = {
  name:"Bumper Cars", icon:"🚗", cat:"phys", desc:"Ram everyone off the candy rink", dur:50,
  how:["Steer with the joystick (or WASD). Cars drift, and the rink shrinks!","Tap <b>BOOST</b> (or press <b>E</b>) to ram at full speed","Knock beans off the rink. Last car driving wins, knockouts break ties"],
  init(ids){ return { B:physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*5.5, Math.sin(a)*3.6]; }), outs:[], ko:{}, last:{}, k:1 }; },
  tick(G, dt, inp, H){ G.k = G.t < 18 ? 1 : Math.max(.55, 1 - (G.t - 18) * .016);
    physStep(G, dt, inp, { ground:(x, z) => Math.abs(x) < 10.2*G.k && Math.abs(z) < 7.2*G.k, speed:8.2, acc:20, dash:15, imp:1.6, maxV:15,
      onTouch:(a, b) => { G.last[a] = [b, G.t]; G.last[b] = [a, G.t]; },
      onOut:id => { const l = G.last[id]; if(l && G.t - l[1] < 3.5){ G.ko[l[0]] = (G.ko[l[0]] || 0) + 1; fxp(G, "k", l[0], id); } } });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(this.timeout(G)); },
  timeout(G){ const k = id => G.ko[id] || 0, alive = G.ids.filter(id => G.B[id].alive).sort((a, b) => k(b) - k(a)); return alive.map(id => [id]).concat(G.outs.slice().reverse().map(id => [id])); },
  drop(G, id){ killOut(G)(id); },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive || b.fall) return null; const r = physBot(G, id, { safe:4 }); if(!r) return r;
    const ex = Math.abs(b.x + b.vx*.3) > 10.2*G.k - 2, ez = Math.abs(b.z + b.vz*.3) > 7.2*G.k - 1.9; if((ex || ez) && rand() < .8){ r.x = ex ? -Math.sign(b.x) : r.x*.3; r.y = ez ? -Math.sign(b.z) : r.y*.3; r.a = 0; } return r; },
  snap(G){ return { B:physSnap(G.B), ko:G.ko, k:+G.k.toFixed(3), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#7ad0ff", sky2:"#d8f4ff", goo:"#3a8aff", fog:"#d8f4ff", cam:[0, 18, 15], btn:"BOOST", pred:{ speed:8.2, acc:20 } }, (S, v) => {
    const fl = cTex(512, 384, (x, w, h) => { x.fillStyle = "#2a2a4a"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(255,255,255,.08)"; x.lineWidth = 2; for(let i=0;i<w;i+=32){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for(let j=0;j<h;j+=32){ x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
      x.fillStyle = "rgba(255,210,58,.9)"; x.font = "bold 70px sans-serif"; x.textAlign = "center"; x.globalAlpha = .18; x.fillText("BUMP!", w/2, h/2 + 25); });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(20.4, .6, 14.4), new THREE.MeshStandardMaterial({ map:fl, roughness:.4, metalness:.2 })); floor.position.y = -.3; floor.receiveShadow = true; S.scene.add(floor);
    const edgeM = new THREE.MeshStandardMaterial({ color:"#ffd23a", emissive:"#ff8a00", emissiveIntensity:.3 }), rink = new THREE.Group(); S.scene.add(rink); S.scene.remove(floor); rink.add(floor);
    [[0, 7.25, 20.6, .14], [0, -7.25, 20.6, .14], [10.25, 0, .14, 14.6], [-10.25, 0, .14, 14.6]].forEach(([x, z, w, d]) => { const e = new THREE.Mesh(new THREE.BoxGeometry(w, .1, d), edgeM); e.position.set(x, .02, z); rink.add(e); });
    const lights = []; for(let i=0;i<12;i++){ const m = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color:"#fff" })); const a = i / 12; m.position.set(i < 6 ? -10 + i*4 : -10 + (i - 6)*4, .1, i < 6 ? 7.4 : -7.4); rink.add(m); lights.push(m); }
    const hud = hudEl(root);
    v.extra = (id, b) => { if(b.userData.car) return; const c = new THREE.Group(), col = hashCol(id);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, .42, 1.55), new THREE.MeshStandardMaterial({ color:col, roughness:.25, metalness:.3 })); body.position.y = .22; c.add(body);
      const bump = new THREE.Mesh(new THREE.TorusGeometry(.82, .13, 8, 24), new THREE.MeshStandardMaterial({ color:"#222", roughness:.8 })); bump.rotation.x = Math.PI/2; bump.scale.set(1, 1.2, 1); bump.position.y = .15; c.add(bump);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.6, 6), new THREE.MeshStandardMaterial({ color:"#aaa" })); pole.position.set(0, 1.1, -.62); c.add(pole);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 4), new THREE.MeshBasicMaterial({ color:"#ffe23a" })); spark.position.set(0, 1.92, -.62); c.add(spark);
      c.traverse(o => o.castShadow = true); b.add(c); b.userData.car = c; };
    v.tick = (s, dt, t) => { const k = lerp(rink.scale.x, s.k || 1, .2); rink.scale.set(k, 1, k); lights.forEach((m, i) => m.material.color.set(Math.sin(t*5 + i) > 0 ? "#fff36a" : "#ff4ab8"));
      const mine = (s.ko && s.ko[ctx.me]) || 0; hud.innerHTML = `<span>💥 Your knockouts: <b>${mine}</b></span>`; };
    v.onFx = (type, a, b) => { if(type === "k"){ sfx.coin(); if(a === ctx.me) toast(`💥 You knocked out ${b}!`, 1500); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- DODGEBALL ----------
const DW = 19, DH = 13;
GAMES.dodge = {
  name:"Dodgeball", icon:"🏐", cat:"phys", desc:"Grab a ball, throw it, don't get hit", dur:55,
  how:["Run over a ball to pick it up","Tap <b>THROW</b> (or press <b>E</b>) to throw it the way you're facing. No ball? It's a dodge roll","3 hits and you're out. Last bean standing wins!"],
  init(ids){ const G = { B:physInit(ids, ringSpawn(4.6)), outs:[], balls:[], hp:{}, hold:{} }; ids.forEach(id => G.hp[id] = 3);
    const n = Math.max(3, Math.ceil(ids.length * .6)); for(let i=0;i<n;i++){ const a = i / n * Math.PI * 2; G.balls.push({ x:Math.cos(a)*1.6, z:Math.sin(a)*1.6, vx:0, vz:0, own:null, fly:0, by:null }); } return G; },
  tick(G, dt, inp, H){
    physStep(G, dt, inp, { wall:{ w:DW, h:DH }, speed:6.8, act:(id, b) => {
      if(G.hold[id] != null){ const bl = G.balls[G.hold[id]]; delete G.hold[id]; bl.by = null; bl.x = b.x + Math.sin(b.f)*.75; bl.z = b.z + Math.cos(b.f)*.75; bl.vx = Math.sin(b.f)*19; bl.vz = Math.cos(b.f)*19; bl.own = id; bl.fly = 1; fxp(G, "t", id); }
      else if(b.cd <= 0){ b.dash = .25; b.cd = 1; b.vx = Math.sin(b.f)*12; b.vz = Math.cos(b.f)*12; fxp(G, "d", id); } } });
    G.balls.forEach((bl, k) => {
      if(bl.by){ const h = G.B[bl.by]; if(!h || !h.alive){ bl.by = null; delete G.hold[bl.by]; } else { bl.x = h.x + Math.sin(h.f + 1.2)*.55; bl.z = h.z + Math.cos(h.f + 1.2)*.55; return; } }
      bl.x += bl.vx*dt; bl.z += bl.vz*dt; const f = bl.fly ? .35 : 2.2; bl.vx *= Math.max(0, 1 - f*dt); bl.vz *= Math.max(0, 1 - f*dt);
      const hx = DW/2 - .3, hz = DH/2 - .3; if(Math.abs(bl.x) > hx){ bl.x = Math.sign(bl.x)*hx; bl.vx *= -.6; bl.fly = 0; } if(Math.abs(bl.z) > hz){ bl.z = Math.sign(bl.z)*hz; bl.vz *= -.6; bl.fly = 0; }
      if(bl.fly && Math.hypot(bl.vx, bl.vz) < 7) bl.fly = 0;
      if(bl.fly){ for(const id of G.ids){ const b = G.B[id]; if(id === bl.own || !b.alive || b.fall || (b.inv || 0) > G.t) continue; if(Math.hypot(b.x - bl.x, b.z - bl.z) < .85){ b.inv = G.t + 1.2;
            G.hp[id]--; b.vx += bl.vx*.45; b.vz += bl.vz*.45; b.hit = .5; b.stun = .3; bl.vx *= -.25; bl.vz *= -.25; bl.fly = 0; fxp(G, "h", id, bl.own); G.dirty = true;
            if(G.hp[id] <= 0){ b.alive = false; G.outs.push(id); fxp(G, "o", id); if(G.hold[id] != null){ const hb = G.balls[G.hold[id]]; hb.by = null; delete G.hold[id]; } } break; } } }
      else { for(const id of G.ids){ const b = G.B[id]; if(!b.alive || G.hold[id] != null || b.hit > 0) continue; if(Math.hypot(b.x - bl.x, b.z - bl.z) < .9){ bl.by = id; bl.own = null; bl.vx = bl.vz = 0; G.hold[id] = k; fxp(G, "g", id); break; } } }
    });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(this.timeout(G)); },
  timeout(G){ const alive = G.ids.filter(id => G.B[id].alive).sort((a, b) => G.hp[b] - G.hp[a]); const gs = []; alive.forEach(id => { const l = gs[gs.length - 1]; if(l && G.hp[l[0]] === G.hp[id]) l.push(id); else gs.push([id]); }); return gs.concat(G.outs.slice().reverse().map(id => [id])); },
  drop(G, id){ killOut(G)(id); if(G.hold[id] != null){ G.balls[G.hold[id]].by = null; delete G.hold[id]; } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive) return null;
    // dodge anything flying at me
    for(const bl of G.balls){ if(!bl.fly || bl.own === id) continue; const dx = b.x - bl.x, dz = b.z - bl.z, d = Math.hypot(dx, dz), sp = Math.hypot(bl.vx, bl.vz) || 1;
      if(d < 5 && (dx*bl.vx + dz*bl.vz) / (d*sp) > .8 && rand() < .6) return { x:-bl.vz/sp, y:bl.vx/sp, a:d < 2.4 && rand() < .1 ? 1 : 0 }; }
    if(G.hold[id] != null){ let best = null, bd = 1e9; for(const k of G.ids){ const c = G.B[k]; if(k === id || !c.alive) continue; const d = Math.hypot(c.x - b.x, c.z - b.z); if(d < bd){ bd = d; best = c; } }
      if(!best) return { x:0, y:0 }; const dx = best.x + best.vx*(rand()*.4) - b.x + (rand() - .5)*1.6, dz = best.z + best.vz*(rand()*.4) - b.z + (rand() - .5)*1.6, m = Math.hypot(dx, dz) || 1;
      if(bd < 3) return { x:-dx/m, y:-dz/m }; b.aimT = (b.aimT || 0) + .016; const fire = bd < 8 && b.aimT > 1.1 && rand() < .05; if(fire) b.aimT = 0; return { x:dx/m*(bd > 7 ? 1 : .25), y:dz/m*(bd > 7 ? 1 : .25), a:fire ? 1 : 0 }; }
    let tgt = null, td = 1e9; G.balls.forEach(bl => { if(bl.by || bl.fly) return; const d = Math.hypot(bl.x - b.x, bl.z - b.z); if(d < td){ td = d; tgt = bl; } });
    if(tgt){ const dx = tgt.x - b.x, dz = tgt.z - b.z, m = Math.hypot(dx, dz) || 1; return { x:dx/m, y:dz/m }; }
    return physBot(G, id, { flee:true, chase:false }); },
  snap(G){ return { B:physSnap(G.B), bl:G.balls.map(b => [+b.x.toFixed(2), +b.z.toFixed(2), b.by ? 2 : b.fly ? 1 : 0]), hp:G.hp, fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#ffb86a", sky2:"#ffe8c8", goo:"#ff8a3a", fog:"#ffe8c8", cam:[0, 18, 13], btn:"THROW", pred:{ speed:6.8 } }, (S, v) => {
    const fl = cTex(512, 352, (x, w, h) => { x.fillStyle = "#f4c890"; x.fillRect(0, 0, w, h); for(let i=0;i<w;i+=24){ x.fillStyle = i % 48 ? "rgba(160,90,30,.08)" : "rgba(160,90,30,.14)"; x.fillRect(i, 0, 24, h); }
      x.strokeStyle = "#fff"; x.lineWidth = 6; x.strokeRect(12, 12, w - 24, h - 24); x.beginPath(); x.moveTo(w/2, 12); x.lineTo(w/2, h - 12); x.stroke(); x.beginPath(); x.arc(w/2, h/2, 46, 0, 7); x.stroke(); });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(DW, .6, DH), new THREE.MeshStandardMaterial({ map:fl, roughness:.5 })); floor.position.y = -.3; floor.receiveShadow = true; S.scene.add(floor);
    const wm = new THREE.MeshStandardMaterial({ color:"#3a8aff", roughness:.4 });
    [[0, DH/2 + .2, DW + .8, .4], [0, -DH/2 - .2, DW + .8, .4], [DW/2 + .2, 0, .4, DH], [-DW/2 - .2, 0, .4, DH]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .8, d), wm); m.position.set(x, .4, z); m.castShadow = true; S.scene.add(m); });
    const bt = cTex(128, 64, (x, w, h) => { x.fillStyle = "#ff3a5a"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.fillRect(0, h/2 - 5, w, 10); });
    const bm = new THREE.MeshStandardMaterial({ map:bt, roughness:.35 }), balls = [];
    const ballMesh = () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.32, 16, 12), bm); m.castShadow = true; S.scene.add(m); return m; };
    const hud = hudEl(root); let lastHp = "";
    v.tick = (s, dt, t) => {
      s.bl.forEach((b, i) => { const m = balls[i] || (balls[i] = ballMesh()); const k = Math.min(1, dt*18); m.position.x = lerp(m.position.x, b[0], k); m.position.z = lerp(m.position.z, b[1], k); m.position.y = b[2] === 2 ? 1.05 : b[2] === 1 ? .7 : .32 + Math.abs(Math.sin(t*3 + i))*.12; m.rotation.x += dt*(b[2] === 1 ? 20 : 2); });
      const hk = JSON.stringify(s.hp); if(hk !== lastHp){ lastHp = hk; for(const id in s.hp){ const tag = S.tags.get(id); if(tag) tag.innerHTML = `${esc(id)} <span class="hearts">${"❤️".repeat(Math.max(0, s.hp[id]))}</span>`; }
        const me = s.hp[ctx.me]; hud.innerHTML = me != null ? `<span>${me > 0 ? "❤️".repeat(me) + "🖤".repeat(3 - me) : "You're out 💀"}</span>` : ""; } };
    v.onFx = (type, a, b) => { if(type === "t"){ sfx.whoosh(); } else if(type === "h"){ sfx.whack(); if(a === ctx.me) toast(`💥 ${b} hit you!`, 1200); if(b === ctx.me) sfx.coin(); } else if(type === "g"){ if(a === ctx.me) sfx.pop(); } else if(type === "o"){ sfx.lose(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- KING OF THE HILL ----------
GAMES.koth = {
  name:"King of the Hill", icon:"👑", cat:"phys", desc:"Hold the glowing zone the longest", dur:50,
  how:["Stand in the glowing zone to score points","If others are in there too, you score much slower, so push them out! (<b>DIVE</b> or <b>E</b>)","The zone moves. Fall off and you'll respawn. Most points wins"],
  init(ids){ return { B:physInit(ids, ringSpawn(7)), outs:[], pts:{}, resp:{}, hx:0, hz:0, move:12, in:[] }; },
  tick(G, dt, inp, H){
    physStep(G, dt, inp, { ground:(x, z) => Math.hypot(x, z) < 10, onOut:id => { G.resp[id] = G.t + 1.6; } });
    for(const id in G.resp){ if(G.t >= G.resp[id]){ const a = rand()*Math.PI*2, b = G.B[id]; Object.assign(b, { x:Math.cos(a)*8, z:Math.sin(a)*8, y:0, vx:0, vz:0, vy:0, alive:true, fall:false, f:Math.atan2(-Math.cos(a), -Math.sin(a)) }); delete G.resp[id]; fxp(G, "r", id); } }
    if(G.t >= G.move){ G.move = G.t + 12; let x, z; do { const a = rand()*Math.PI*2, r = 2 + rand()*4.5; x = Math.cos(a)*r; z = Math.sin(a)*r; } while(Math.hypot(x - G.hx, z - G.hz) < 4); G.hx = x; G.hz = z; fxp(G, "m"); }
    G.in = G.ids.filter(id => { const b = G.B[id]; return b.alive && !b.fall && Math.hypot(b.x - G.hx, b.z - G.hz) < 2.4; });
    const rate = G.in.length === 1 ? 1 : .3; G.in.forEach(id => G.pts[id] = (G.pts[id] || 0) + dt*rate); },
  timeout(G){ const p = id => Math.floor((G.pts[id] || 0) * 10), s = G.ids.slice().sort((a, b) => p(b) - p(a)), gs = []; s.forEach(id => { const l = gs[gs.length - 1]; if(l && p(l[0]) === p(id)) l.push(id); else gs.push([id]); }); return gs; },
  drop(G, id){ if(G.B[id]){ G.B[id].alive = false; G.resp[id] = 1e9; } },
  bot(G, id){ return physBot(G, id, { cx:G.hx, cz:G.hz, safe:3 }); },
  snap(G){ const p = {}; for(const id in G.pts) p[id] = +G.pts[id].toFixed(1); return { B:physSnap(G.B), hx:+G.hx.toFixed(2), hz:+G.hz.toFixed(2), p, in:G.in, fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#b89aff", sky2:"#ffe0f8", goo:"#9a5aff", fog:"#ffe0f8", cam:[0, 19, 15] }, (S, v) => {
    const top = new THREE.MeshStandardMaterial({ map:icingTex("#9ae8a0", ["#fff","#ffd23a","#ff7ab8","#7ad8ff"]), roughness:.55 }), side = new THREE.MeshStandardMaterial({ color:"#c88a50", roughness:.7 });
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 1.2, 72), [side, top, side]); plat.position.y = -.6; plat.receiveShadow = true; S.scene.add(plat);
    const zone = new THREE.Group(); const zr = new THREE.Mesh(new THREE.RingGeometry(2.15, 2.4, 48), new THREE.MeshBasicMaterial({ color:"#ffe23a", side:THREE.DoubleSide })); zr.rotation.x = -Math.PI/2; zr.position.y = .03; zone.add(zr);
    const zf = new THREE.Mesh(new THREE.CircleGeometry(2.15, 48), new THREE.MeshBasicMaterial({ color:"#ffe23a", transparent:true, opacity:.25 })); zf.rotation.x = -Math.PI/2; zf.position.y = .02; zone.add(zf);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 7, 40, 1, true), new THREE.MeshBasicMaterial({ color:"#fff6a0", transparent:true, opacity:.15, side:THREE.DoubleSide, depthWrite:false })); beam.position.y = 3.5; zone.add(beam); S.scene.add(zone);
    const crown = new THREE.Group(), cm = new THREE.MeshStandardMaterial({ color:"#ffd23a", metalness:.8, roughness:.25, emissive:"#a86a00", emissiveIntensity:.3 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .2, 16, 1, true), cm); crown.add(band); for(let i=0;i<5;i++){ const sp = new THREE.Mesh(new THREE.ConeGeometry(.08, .22, 6), cm); const a = i / 5 * Math.PI * 2; sp.position.set(Math.cos(a)*.3, .2, Math.sin(a)*.3); crown.add(sp); } crown.visible = false; S.scene.add(crown);
    const hud = hudEl(root);
    v.tick = (s, dt, t) => { zone.position.x = lerp(zone.position.x, s.hx, Math.min(1, dt*3)); zone.position.z = lerp(zone.position.z, s.hz, Math.min(1, dt*3));
      const busy = s.in.length; zr.material.color.set(busy > 1 ? "#ff5a7a" : busy === 1 ? "#5ae07a" : "#ffe23a"); zf.material.color.copy(zr.material.color); beam.material.opacity = .12 + Math.sin(t*4)*.05;
      let lead = null, lp = 0; for(const id in s.p) if(s.p[id] > lp){ lp = s.p[id]; lead = id; }
      crown.visible = !!lead && S.beans.has(lead); if(crown.visible){ const b = S.bean(lead); crown.position.set(b.position.x, b.position.y + 1.75, b.position.z); crown.rotation.y += dt*2; }
      const mine = s.p[ctx.me] || 0, inz = s.in.includes(ctx.me); hud.innerHTML = `<b style="font-size:1.3rem">${mine.toFixed(1)}</b><span>${inz ? (busy > 1 ? "⚔️ Contested! Push them out" : "👑 Scoring!") : lead ? `👑 ${esc(lead)} leads with ${lp.toFixed(1)}` : "Get in the zone!"}</span>`; };
    v.onFx = (type, a) => { if(type === "m"){ sfx.ding(); } else if(type === "r"){ if(a === ctx.me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- WRECKING BALL ----------
const wreckPos = (W, t) => { const th = W.a + W.w*t, sw = Math.sin(W.o*t + W.p) * 8.2; return [Math.cos(th)*sw, Math.sin(th)*sw]; };
GAMES.wreck = {
  name:"Wrecking Ball", icon:"🏗️", cat:"phys", desc:"Dodge the giant swinging balls", dur:50,
  how:["Giant balls swing across the platform","Get hit and you go flying. Fall off and you're out","More balls join over time. Last bean standing wins! (<b>DIVE</b> or <b>E</b> to dodge)"],
  init(ids, ctx){ const R = seeded(ctx.seed), W = []; for(let i=0;i<3;i++) W.push({ a:R()*Math.PI, w:(R() < .5 ? -1 : 1)*(.25 + R()*.2), o:1.15 + R()*.35, p:R()*6, at:[0, 12, 26][i] });
    return { B:physInit(ids, ringSpawn(4.5)), outs:[], W, info:null }; },
  tick(G, dt, inp, H){
    physStep(G, dt, inp, { ground:(x, z) => Math.hypot(x, z) < 9 });
    G.W.forEach((W, k) => { if(G.t < W.at) return; const t = G.t - W.at, [x, z] = wreckPos(W, t), [x2, z2] = wreckPos(W, t + .02), vx = (x2 - x) / .02, vz = (z2 - z) / .02;
      if(!W.on){ W.on = 1; fxp(G, "n", k); }
      G.ids.forEach(id => { const b = G.B[id]; if(!b.alive || b.fall) return; const dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz); if(d < 1.9 && (b.wh || 0) < G.t){
        const nx = dx / (d || 1), nz = dz / (d || 1); b.x = x + nx*1.9; b.z = z + nz*1.9; b.vx = nx*13 + vx*.55; b.vz = nz*13 + vz*.55; b.dash = 0; b.hit = .6; b.stun = .5; b.wh = G.t + .35; fxp(G, "w", id); } }); });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout:outRank, drop(G, id){ killOut(G)(id); },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive || b.fall) return null; let fx = -b.x*.12, fz = -b.z*.12, dash = 0;
    G.W.forEach(W => { if(G.t < W.at) return; const t = G.t - W.at, [x, z] = wreckPos(W, t), [x2, z2] = wreckPos(W, t + .35), dx = b.x - x2, dz = b.z - z2, d = Math.hypot(dx, dz);
      if(d < 4.2){ fx += dx / (d || 1) * (4.2 - d); fz += dz / (d || 1) * (4.2 - d); if(d < 2.4 && rand() < .04) dash = 1; } });
    const m = Math.hypot(fx, fz); if(m < .15) return { x:(rand() - .5)*.3, y:(rand() - .5)*.3 }; b.f = Math.atan2(fx, fz); return { x:fx/m, y:fz/m, a:dash }; },
  snap(G){ return { B:physSnap(G.B), W:G.W.map(W => G.t < W.at ? null : wreckPos(W, G.t - W.at).map(v => +v.toFixed(2))), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#5a4aa8", sky2:"#ff9ac8", goo:"#ff5a8a", fog:"#ff9ac8", cam:[0, 18, 16] }, (S, v) => {
    const top = new THREE.MeshStandardMaterial({ map:cTex(512, 512, (x, w) => { x.fillStyle = "#ffd23a"; x.fillRect(0, 0, w, w); x.fillStyle = "#2a2a3a"; for(let i=-w;i<w*2;i+=64){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 0); x.lineTo(i + 32 - w, w); x.lineTo(i - w, w); x.fill(); } x.fillStyle = "#c8c8d8"; x.beginPath(); x.arc(w/2, w/2, w*.42, 0, 7); x.fill(); x.fillStyle = "#b0b0c4"; for(let i=0;i<40;i++){ x.fillRect(rand()*w*.6 + w*.2, rand()*w*.6 + w*.2, 18, 6); } }), roughness:.6 });
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1.2, 64), [new THREE.MeshStandardMaterial({ color:"#55556a" }), top, new THREE.MeshStandardMaterial({ color:"#55556a" })]); plat.position.y = -.6; plat.receiveShadow = true; S.scene.add(plat);
    const stripe = cTex(256, 128, (x, w, h) => { x.fillStyle = "#ff3a7a"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; for(let i=0;i<w;i+=64) x.fillRect(i, 0, 28, h); });
    const balls = [0, 1, 2].map(() => { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 18), new THREE.MeshStandardMaterial({ map:stripe, roughness:.25, metalness:.2 })); m.castShadow = true; m.position.y = 1.4; g.add(m);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1, 6), new THREE.MeshStandardMaterial({ color:"#666", metalness:.8, roughness:.3 })); S.scene.add(chain); g.userData = { m, chain }; g.visible = false; chain.visible = false; S.scene.add(g); return g; });
    const piv = new THREE.Vector3(0, 15, 0), tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    v.tick = (s, dt) => { s.W.forEach((w, i) => { const g = balls[i]; if(!w){ g.visible = false; g.userData.chain.visible = false; return; }
      if(!g.visible){ g.position.set(w[0], 0, w[1]); } g.visible = true; g.position.x = lerp(g.position.x, w[0], Math.min(1, dt*20)); g.position.z = lerp(g.position.z, w[1], Math.min(1, dt*20));
      const sw = Math.hypot(g.position.x, g.position.z); g.position.y = sw*sw*.012; g.userData.m.rotation.y += dt*2;
      const c = g.userData.chain; c.visible = true; tmp.set(g.position.x, g.position.y + 2.7, g.position.z); const len = piv.distanceTo(tmp); c.scale.y = len; c.position.copy(piv).add(tmp).multiplyScalar(.5); c.quaternion.setFromUnitVectors(up, tmp.clone().sub(piv).normalize()); }); };
    v.onFx = (type, a) => { if(type === "w"){ sfx.whack(); sfx.boing(); } else if(type === "n"){ sfx.whistle(); if(a > 0) toast("Another wrecking ball!", 1400); } else physFx(type, a); };
  }); }
};

// ---------- SEESAW SURVIVAL ----------
GAMES.seesaw = {
  name:"Seesaw Survival", icon:"⚖️", cat:"phys", desc:"Keep the wobbly plate balanced", dur:50,
  how:["The giant plate tips toward wherever beans stand, and it shrinks!","Everything slides downhill, so spread out and balance it!","Slide off and you're out. Last bean standing wins (<b>DIVE</b> / <b>E</b> to shove)"],
  init(ids){ return { B:physInit(ids, ringSpawn(3)), outs:[], tx:0, tz:0, R:8.5 }; },
  tick(G, dt, inp, H){
    let sx = 0, sz = 0; const live = G.ids.filter(id => G.B[id].alive && !G.B[id].fall); live.forEach(id => { sx += G.B[id].x; sz += G.B[id].z; });
    const k = .05 + Math.min(.05, G.t * .0012), w = G.t > 6 ? Math.sin(G.t*.9) * Math.min(.34, (G.t - 6) * .012) : 0;
    let ttx = sx * k + w, ttz = sz * k + Math.cos(G.t*.61) * Math.abs(w); const m = Math.hypot(ttx, ttz); if(m > .55){ ttx *= .55/m; ttz *= .55/m; }
    G.tx += (ttx - G.tx) * Math.min(1, dt*1.6); G.tz += (ttz - G.tz) * Math.min(1, dt*1.6);
    live.forEach(id => { const b = G.B[id]; b.vx += G.tx * 17 * dt; b.vz += G.tz * 17 * dt; });
    G.R = G.t < 15 ? 8.5 : Math.max(4.2, 8.5 - (G.t - 15) * .14);
    physStep(G, dt, inp, { ground:(x, z) => Math.hypot(x, z) < G.R, acc:30, speed:6.2 });
    if(G.ids.filter(id => G.B[id].alive).length <= 1 && G.t > 1) H.end(outRank(G)); },
  timeout:outRank, drop(G, id){ killOut(G)(id); },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive || b.fall) return null; const r = physBot(G, id, { cx:-G.tx*9, cz:-G.tz*9, safe:1.5 }); if(r && Math.hypot(b.x, b.z) > G.R - 2){ r.x = -b.x; r.y = -b.z; const m = Math.hypot(r.x, r.y) || 1; r.x /= m; r.y /= m; } return r; },
  snap(G){ return { B:physSnap(G.B), tx:+G.tx.toFixed(3), tz:+G.tz.toFixed(3), R:+G.R.toFixed(2), fx:G.fx }; },
  view(root, ctx){ return physView(root, ctx, { sky:"#7ae0c8", sky2:"#fff4c8", goo:"#2ac8a8", fog:"#fff4c8", cam:[0, 18, 15], pred:{ speed:6.2, acc:30 } }, (S, v) => {
    const plate = new THREE.Group(); S.scene.add(plate);
    const top = new THREE.MeshStandardMaterial({ map:cTex(512, 512, (x, w) => { const g = x.createRadialGradient(w/2, w/2, 10, w/2, w/2, w/2); g.addColorStop(0, "#fff"); g.addColorStop(1, "#ffd6ec"); x.fillStyle = g; x.fillRect(0, 0, w, w);
      x.strokeStyle = "#ff7ab8"; x.lineWidth = 10; for(let r=60;r<w/2;r+=60){ x.beginPath(); x.arc(w/2, w/2, r, 0, 7); x.stroke(); } x.fillStyle = "#ff4a8a"; x.beginPath(); x.arc(w/2, w/2, 22, 0, 7); x.fill(); }), roughness:.4 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, .5, 72), [new THREE.MeshStandardMaterial({ color:"#ff7ab8" }), top, new THREE.MeshStandardMaterial({ color:"#e85a98" })]); disc.position.y = -.25; disc.receiveShadow = true; plate.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.5, .12, 8, 72), new THREE.MeshStandardMaterial({ color:"#fff" })); rim.rotation.x = Math.PI/2; plate.add(rim);
    const ful = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4, 4), new THREE.MeshStandardMaterial({ color:"#ffd23a", roughness:.4 })); ful.position.y = -2.5; ful.rotation.x = Math.PI; S.scene.add(ful);
    let tx = 0, tz = 0; const n = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    v.tick = (s, dt) => { tx = lerp(tx, s.tx, Math.min(1, dt*10)); tz = lerp(tz, s.tz, Math.min(1, dt*10)); n.set(tx, 1, tz).normalize(); plate.quaternion.setFromUnitVectors(up, n); const r = (s.R || 8.5) / 8.5; disc.scale.set(r, 1, r); rim.scale.set(r, r, 1); };
    v.extra = (id, b, s) => { b.position.y = s[2] - (tx * b.position.x + tz * b.position.z); };
  }); }
};
