// ===================== shared 3D stage + bean physics for the physics games =====================
let R3 = null, CUR_S = null;
const HIGH = () => STORE.gfx !== "low";
function r3(){
  if(R3){ R3.renderer.setPixelRatio(HIGH() ? Math.min(2, devicePixelRatio || 1) : 1); return R3; }
  const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:"high-performance" }); renderer.setPixelRatio(HIGH() ? Math.min(2, devicePixelRatio || 1) : 1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  R3 = { renderer, pmrem:new THREE.PMREMGenerator(renderer) }; return R3;
}
// soft reflections: a tiny sky scene (gradient + a few bright blobs) baked into an environment map
function envFrom(top, bot){ const { pmrem } = r3(), sc = new THREE.Scene(); const geo = new THREE.SphereGeometry(10, 32, 16), mat = new THREE.MeshBasicMaterial({ side:THREE.BackSide, map:skyTex(shade(top, -.62), shade(bot, -.7)) }); sc.add(new THREE.Mesh(geo, mat));
  [[0, 9, 0, 2.6, "#ffffff"], [7, 3, 5, 1.3, "#fff4e0"], [-6, 4, -6, 1.1, "#ffe0f4"], [0, -8, 0, 4, "#1a1020"]].forEach(([x, y, z, r, c]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8), new THREE.MeshBasicMaterial({ color:c })); m.position.set(x, y, z); sc.add(m); });
  const rt = pmrem.fromScene(sc, .04); sc.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material){ if(o.material.map) o.material.map.dispose(); o.material.dispose(); } }); return rt.texture; }
// particles: a pool of soft sprites for hits, dust, sparkles and confetti
let DOT_TEX = null;
const dotTex = () => DOT_TEX || (DOT_TEX = cTex(64, 64, (x, w) => { const g = x.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); }));
let BLOB_TEX = null;
const blobTex = () => BLOB_TEX || (BLOB_TEX = cTex(64, 64, (x, w) => { const g = x.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); g.addColorStop(0, "rgba(40,10,60,.55)"); g.addColorStop(.6, "rgba(40,10,60,.25)"); g.addColorStop(1, "rgba(40,10,60,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); }));
function skyTex(top, bot){ const c = document.createElement("canvas"); c.width = 4; c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function cTex(w, h, draw, rep){ const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; if(rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t; }
function makeStage(root, o = {}){
  const { renderer } = r3(); root.appendChild(renderer.domElement); renderer.domElement.className = "stage3d";
  const scene = new THREE.Scene(); scene.background = skyTex(o.sky || "#7ad8ff", o.sky2 || "#ffd6f2"); scene.fog = new THREE.Fog(o.fog || "#ffd6f2", 30, 70);
  const cam = new THREE.PerspectiveCamera(48, 1, .1, 200);
  const hi = HIGH(); scene.environment = envFrom(o.sky || "#7ad8ff", o.sky2 || "#ffd6f2");
  scene.add(new THREE.HemisphereLight("#ffffff", o.goo || "#ffb8e0", .6));
  const sun = new THREE.DirectionalLight("#fff4e4", .9); sun.position.set(8, 20, 10); sun.castShadow = true; sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 3;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -18; sc.right = sc.top = 18; sc.near = 1; sc.far = 55; scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight("#c8e0ff", .35); rim.position.set(-10, 8, -14); scene.add(rim);
  // soft clouds drifting in the sky
  const clouds = new THREE.Group(); scene.add(clouds); if(hi){ const cm = new THREE.MeshStandardMaterial({ color:"#ffffff", roughness:1, emissive:"#ffffff", emissiveIntensity:.35 });
    for(let i=0;i<8;i++){ const c = new THREE.Group(), a = i / 8 * Math.PI * 2 + rand(), r = 30 + rand()*18; for(let k=0;k<4;k++){ const p = new THREE.Mesh(new THREE.SphereGeometry(1.6 + rand()*1.6, 14, 10), cm); p.position.set((k - 1.5)*2.2, rand()*.8, rand()*1.4); p.scale.y = .7; c.add(p); } c.position.set(Math.cos(a)*r, 12 + rand()*8, Math.sin(a)*r - 10); c.userData.v = .3 + rand()*.4; clouds.add(c); } }
  // candy goo below everything
  const gooM = new THREE.MeshStandardMaterial({ color:o.goo || "#ff7ad8", roughness:.12, metalness:.15, emissive:o.goo || "#ff7ad8", emissiveIntensity:.12, envMapIntensity:1.4 });
  const goo = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 40, 40), gooM); goo.rotation.x = -Math.PI/2; goo.position.y = -4; scene.add(goo);
  // floating candy decorations around the edge
  const deco = new THREE.Group(); scene.add(deco); const cols = ["#ff4ab8", "#ffd23a", "#3ad8ff", "#5ae07a", "#9a6aff", "#ff8a3a"];
  for(let i=0;i<14;i++){ const an = i / 14 * Math.PI * 2, r = 22 + rand()*8, m = new THREE.MeshPhysicalMaterial({ color:pick(cols), roughness:.25, clearcoat:.8, clearcoatRoughness:.2 }); let d;
    if(i % 3 === 0){ d = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 5, 8), new THREE.MeshStandardMaterial({ color:"#fff" })); st.position.y = -2.5; d.add(st); const top = new THREE.Mesh(new THREE.TorusGeometry(1.2, .45, 12, 24), m); d.add(top); }
    else if(i % 3 === 1) d = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), m); else d = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 16), m);
    d.position.set(Math.cos(an)*r, -2 + rand()*4, Math.sin(an)*r); d.userData.ph = rand()*6; deco.add(d); }
  const labels = document.createElement("div"); labels.className = "labels3d"; root.appendChild(labels);
  const S = { scene, cam, renderer, root, beans:new Map(), labels, deco, goo, gooM, tags:new Map(), emotes:new Map(), camPos:o.cam || [0, 17, 15], look:o.look || [0, 0, 1], parts:[], lastT:0 };
  CUR_S = S;
  // particle pool
  for(let i=0;i<(hi ? 160 : 70);i++){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:dotTex(), transparent:true, depthWrite:false })); sp.visible = false; scene.add(sp); S.parts.push({ sp, life:0 }); }
  S.burst = (x, y, z, o2 = {}) => { const n = o2.n || 10, cols = [].concat(o2.col || "#ffffff"); let k = 0;
    for(const p of S.parts){ if(k >= n) break; if(p.life > 0) continue; k++; const a = rand()*Math.PI*2, el = (o2.up != null ? o2.up : .5) + rand()*.6, sp = (o2.speed || 4) * (.5 + rand()*.7);
      p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a)*sp*(1 - el*.5); p.vz = Math.sin(a)*sp*(1 - el*.5); p.vy = el*sp + (o2.lift || 0); p.g = o2.grav != null ? o2.grav : 14; p.life = p.max = (o2.life || .6) * (.7 + rand()*.6);
      p.size = (o2.size || .25) * (.6 + rand()*.8); p.sp.material.color.set(pick(cols)); p.sp.visible = true; p.spin = o2.confetti; } };
  S.resize = () => { const w = root.clientWidth, h = root.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px"; cam.aspect = w / h;
    const a = w / h, P = a < 1 && o.portrait; S.camPos = P ? P.cam : o.cam || [0, 17, 15]; S.look = P ? P.look : o.look || [0, 0, 1];
    S.k = P ? clamp((P.a || .6) / a, .8, 1.6) : clamp(.85 / a, 1, 1.75) * (S.zoom || 1); cam.fov = a < 1 ? 56 : 48; scene.fog.near = 30 * Math.max(1, S.k) + (o.fogAdd || 0); scene.fog.far = 75 * Math.max(1, S.k) + (o.fogAdd || 0); S.place(); cam.updateProjectionMatrix(); };
  S.fx = 0; S.fz = 0; S.k = 1;
  // camera sits at camPos (scaled for tall screens) relative to a followed point; the sun follows too so shadows stay sharp
  S.place = () => { const k = S.k, fy = S.fy || 0; cam.position.set(S.camPos[0] * k + S.fx, S.camPos[1] * k + fy, S.camPos[2] * k + S.fz); cam.lookAt(S.look[0] + S.fx, S.look[1] + fy, S.look[2] + S.fz); sun.position.set(8 + S.fx, 20, 10 + S.fz); sun.target.position.set(S.fx, 0, S.fz); sun.target.updateMatrixWorld(); };
  S.follow = (x, z, k = .1, y) => { S.fx = lerp(S.fx, x, k); S.fz = lerp(S.fz, z, k); if(y != null) S.fy = lerp(S.fy || 0, y, k); S.place(); };
  S.resize(); S.ro = new ResizeObserver(S.resize); S.ro.observe(root);
  S.bean = id => { let b = S.beans.get(id); if(!b){ const p = playerOf(id); b = beanMesh(p ? p.bean : null, id); scene.add(b); S.beans.set(id, b);
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map:blobTex(), transparent:true, depthWrite:false })); blob.rotation.x = -Math.PI/2; blob.position.y = .02; blob.renderOrder = -1; b.add(blob); b.userData.blob = blob;
      const tag = document.createElement("div"); tag.className = "tag3d" + (id === NET.me ? " me" : ""); tag.textContent = id; labels.appendChild(tag); S.tags.set(id, tag); } return b; };
  S.emote = (id, e) => { const tag = S.tags.get(id); if(!tag) return; const em = document.createElement("div"); em.className = "emo3d"; em.textContent = e; labels.appendChild(em); S.emotes.set(em, { id, t:now() }); setTimeout(() => { em.remove(); S.emotes.delete(em); }, 2200); };
  const v = new THREE.Vector3();
  S.render = t => { const dt = Math.min(.05, Math.max(0, t - (S.lastT || t))); S.lastT = t;
    deco.children.forEach(d => { d.position.y += Math.sin(t + d.userData.ph) * .004; d.rotation.y += .004; });
    clouds.children.forEach(c => { c.position.x += c.userData.v * dt; if(c.position.x > 60) c.position.x = -60; });
    for(const p of S.parts){ if(p.life <= 0) continue; p.life -= dt; if(p.life <= 0){ p.sp.visible = false; continue; } p.vy -= p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; const k = p.life / p.max;
      p.sp.position.set(p.x, p.y, p.z); const sz = p.size * (p.spin ? 1 : .6 + k*.6); p.sp.scale.set(sz, p.spin ? sz*.6 : sz, 1); p.sp.material.opacity = Math.min(1, k*2); if(p.spin) p.sp.material.rotation += dt*8; }
    gooM.emissiveIntensity = .15 + Math.sin(t*1.5) * .05;
    renderer.render(scene, cam);
    const w = root.clientWidth, h = root.clientHeight;
    S.beans.forEach((b, id) => { const tag = S.tags.get(id); if(!tag) return; v.set(b.position.x, b.position.y + 1.9 * b.scale.y, b.position.z).project(cam); tag.style.transform = `translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h}px) translate(-50%,-100%)`; tag.style.opacity = b.visible ? 1 : 0; });
    S.emotes.forEach((o, em) => { const b = S.beans.get(o.id); if(!b) return; v.set(b.position.x, b.position.y + 2.5 * b.scale.y, b.position.z).project(cam); em.style.transform = `translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h - (now() - o.t)*30}px) translate(-50%,-100%)`; });
  };
  S.destroy = () => { S.ro.disconnect(); if(S.unEmote) S.unEmote(); scene.traverse(o => { if(o.geometry && o.geometry !== BEAN3D.geo && o.geometry !== BEAN3D.foot) o.geometry.dispose(); if(o.material){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if(m.map) m.map.dispose(); m.dispose(); }); } }); labels.remove(); renderer.domElement.remove(); if(scene.environment) scene.environment.dispose(); if(CUR_S === S) CUR_S = null; };
  S.unEmote = on("emote", m => S.emote(m.id, m.e));
  return S;
}
// ---------- physics: beans are circles on the floor ----------
const BR = .5;
function physInit(ids, spawn){ const B = {}; ids.forEach((id, i) => { const [x, z] = spawn(i, ids.length); B[id] = { x, z, vx:0, vz:0, y:0, vy:0, f:Math.atan2(-x, -z), alive:true, fall:false, dash:0, cd:0, held:0, hit:0 }; }); return B; }
function physStep(G, dt, inputs, o){
  const B = G.B, ids = Object.keys(B), speed = o.speed || 7, acc = o.acc || 90, BR = o.r || .5;
  ids.forEach(id => { const b = B[id]; if(!b.alive) return; const inp = inputs[id] || {}; b.cd -= dt; b.dash -= dt; b.hit -= dt;
    if(!b.fall){
      let ix = clamp(inp.x || 0, -1, 1), iz = clamp(inp.y || 0, -1, 1); const m = Math.hypot(ix, iz); if(m > 1){ ix /= m; iz /= m; }
      const sp = speed * (b.boost || 1) * (b.dash > 0 ? 1.7 : 1);
      b.stun = (b.stun || 0) - dt; const grip = b.stun > 0 ? .06 : 1; // knocked flying: barely any control for a moment
      if(b.dash <= 0){ b.vx += (ix*sp - b.vx) * Math.min(1, acc/sp*dt*(m > .1 ? 1 : 2)*grip); b.vz += (iz*sp - b.vz) * Math.min(1, acc/sp*dt*(m > .1 ? 1 : 2)*grip); }
      if(m > .2) b.f = Math.atan2(ix, iz);
      if(inp.a && !b.held && o.act) o.act(id, b);
      else if(inp.a && !b.held && b.cd <= 0 && !o.noDash){ b.dash = o.dashT || .28; b.cd = o.dashCd || 1.1; const d = o.dash || 13; b.vx = Math.sin(b.f)*d; b.vz = Math.cos(b.f)*d; fxp(G, "d", id); }
      b.held = inp.a ? 1 : 0;
    }
    b.x += b.vx*dt; b.z += b.vz*dt;
    if(o.wall){ const w = o.wall; if(w.r){ const d = Math.hypot(b.x, b.z); if(d > w.r - BR){ const nx = b.x/d, nz = b.z/d; b.x = nx*(w.r - BR); b.z = nz*(w.r - BR); const vn = b.vx*nx + b.vz*nz; if(vn > 0){ b.vx -= 1.8*vn*nx; b.vz -= 1.8*vn*nz; } } }
      else { const hx = w.w/2 - BR, hz = w.h/2 - BR; if(b.x < -hx){ b.x = -hx; b.vx = Math.abs(b.vx)*.8; } if(b.x > hx){ b.x = hx; b.vx = -Math.abs(b.vx)*.8; } if(b.z < -hz){ b.z = -hz; b.vz = Math.abs(b.vz)*.8; } if(b.z > hz){ b.z = hz; b.vz = -Math.abs(b.vz)*.8; } } }
    // platform games: floors have heights and beans can jump (floorH gives the floor height under a point, or null for a drop)
    if(o.floorH && !b.fall){ const inp = inputs[id] || {}; let fh = o.floorH(b.x, b.z, b, id);
      if(!b.air && fh != null && fh > b.y + .45){ b.x -= b.vx*dt; b.z -= b.vz*dt; b.vx *= -.2; b.vz *= -.2; fh = o.floorH(b.x, b.z, b, id); }
      if(inp.j && !b.jheld && !b.air && (b.stun || 0) <= 0){ b.vy = o.jumpV || 10; b.air = true; fxp(G, "j", id); }
      b.jheld = inp.j ? 1 : 0;
      if(!b.air){ if(fh == null || fh < b.y - .3){ b.air = true; b.vy = 0; } else b.y = fh; }
      if(b.air){ b.vy -= 30*dt; b.y += b.vy*dt;
        if(fh != null && b.vy <= 0 && b.y <= fh && b.y > fh - .8){ b.y = fh; b.vy = 0; b.air = false; }
        else if(fh != null && b.y < fh - .8){ b.x -= b.vx*dt; b.z -= b.vz*dt; b.vx *= -.3; b.vz *= -.3; } }
      if(b.y < (o.outY || -7)){ b.alive = false; (G.outs = G.outs || []).push(id); if(o.onOut) o.onOut(id); } }
    if(!b.fall && o.ground && !o.ground(b.x, b.z, b, id)){ b.fall = true; b.vy = 0; fxp(G, "f", id); }
    if(b.fall){ b.vy -= 30*dt; b.y += b.vy*dt; b.vx *= .98; b.vz *= .98; if(b.y < (o.outY || -7)){ b.alive = false; (G.outs = G.outs || []).push(id); if(o.onOut) o.onOut(id); } }
  });
  // bumping
  for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
    const a = B[ids[i]], c = B[ids[j]]; if(!a.alive || !c.alive || a.fall || c.fall || Math.abs(a.y - c.y) > 1) continue;
    const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz); if(d >= BR*2 || d < 1e-4) continue;
    const nx = dx/d, nz = dz/d, ov = BR*2 - d; a.x -= nx*ov/2; a.z -= nz*ov/2; c.x += nx*ov/2; c.z += nz*ov/2;
    const rv = (c.vx - a.vx)*nx + (c.vz - a.vz)*nz; if(rv > 0) continue;
    const pa = a.dash > 0 ? 2.4 : 1, pc = c.dash > 0 ? 2.4 : 1, imp = -rv * (o.imp || 1.25);
    a.vx -= nx*imp*.5*pc; a.vz -= nz*imp*.5*pc; c.vx += nx*imp*.5*pa; c.vz += nz*imp*.5*pa;
    if(o.maxV) [a, c].forEach(q => { const sp = Math.hypot(q.vx, q.vz); if(sp > o.maxV){ q.vx *= o.maxV/sp; q.vz *= o.maxV/sp; } });
    if(pc > 1) a.stun = Math.max(a.stun || 0, .3); if(pa > 1) c.stun = Math.max(c.stun || 0, .3); // dived into = knocked back properly
    if(a.dash > 0 || c.dash > 0){ a.dash = c.dash = 0; } a.hit = c.hit = .3; fxp(G, "b", ids[i], ids[j]);
    if(o.onTouch) o.onTouch(ids[i], ids[j]);
  }
}
function physSnap(B){ const o = {}; for(const id in B){ const b = B[id]; o[id] = [+b.x.toFixed(2), +b.z.toFixed(2), +b.y.toFixed(2), +b.f.toFixed(2), b.alive ? 1 : 0, b.dash > 0 ? 1 : 0, +b.vx.toFixed(1), +b.vz.toFixed(1)]; } return o; }
// smooth beans toward the latest positions; returns true if a bean is moving
// your own bean is moved on your screen straight away from your stick (no waiting for the host), then gently pulled to where the host says it is
function predStep(P, s, dt){
  if(!s[4] || s[2] < -.05){ P.on = false; return null; }
  if(!P.on){ Object.assign(P, { on:true, x:s[0], z:s[1], vx:s[6] || 0, vz:s[7] || 0, f:s[3] }); }
  let ix = CTL.x, iz = CTL.y; if(CTL.map) [ix, iz] = CTL.map(ix, iz); const m = Math.hypot(ix, iz); if(m > 1){ ix /= m; iz /= m; }
  const sp = P.speed * (s[5] ? 1.7 : 1), k = Math.min(1, P.acc / sp * dt * (m > .1 ? 1 : 2));
  if(!s[5]){ P.vx += (ix*sp - P.vx) * k; P.vz += (iz*sp - P.vz) * k; } else { P.vx = lerp(P.vx, s[6], .3); P.vz = lerp(P.vz, s[7], .3); }
  if(m > .2) P.f = Math.atan2(ix, iz);
  P.x += P.vx*dt; P.z += P.vz*dt;
  // where the host has us, pushed forward a little for network delay
  const tx = s[0] + (s[6] || 0) * .08, tz = s[1] + (s[7] || 0) * .08, e = Math.hypot(tx - P.x, tz - P.z);
  if(e > 3){ P.x = tx; P.z = tz; P.vx = s[6]; P.vz = s[7]; }
  else { const g = Math.min(1, dt * (e > 1.2 ? 9 : 3.5)); P.x += (tx - P.x) * g; P.z += (tz - P.z) * g; const gv = Math.min(1, dt * (e > .8 ? 6 : 1.5)); P.vx += ((s[6] || 0) - P.vx) * gv; P.vz += ((s[7] || 0) - P.vz) * gv; }
  return P; }
function physDraw(S, snapB, dt, t, extra, pred){
  for(const id in snapB){ const s = snapB[id], b = S.bean(id), k = Math.min(1, dt * 16);
    const px = b.position.x, pz = b.position.z, P = pred && id === NET.me ? predStep(pred, s, dt) : null;
    if(P){ b.position.x = P.x; b.position.z = P.z; } else { b.position.x = lerp(b.position.x, s[0], k); b.position.z = lerp(b.position.z, s[1], k); } b.position.y = lerp(b.position.y, s[2], Math.min(1, dt*20));
    let df = (P ? P.f : s[3]) - b.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); b.rotation.y += df * Math.min(1, dt*(P ? 20 : 12));
    b.rotation.x = s[5] ? .7 : lerp(b.rotation.x, 0, Math.min(1, dt*10)); b.visible = !!s[4] || b.position.y > -6.5;
    const sp = Math.hypot(b.position.x - px, b.position.z - pz) / Math.max(dt, 1e-3); animBean(b, sp, t);
    if(extra) extra(id, b, s);
  }
}
// effects carry a running number so every device plays each one exactly once
function fxp(G, ...f){ G.fxn = (G.fxn || 0) + 1; (G.fx = G.fx || []).push([G.fxn, ...f]); if(G.fx.length > 30) G.fx.shift(); }
function newFx(view, fx, fn){ (fx || []).forEach(f => { if(f[0] > (view.fxSeen || 0)){ view.fxSeen = f[0]; fn(f[1], f[2], f[3], f[4]); } }); }
function physFx(type, a){ if(type === "b") sfx.bump(); if(type === "f") sfx.fall(); if(type === "d" && a === NET.me) sfx.dive(); }
// a little burst of particles for common events in every 3D game (called with the event's own arguments)
const CONF = ["#ff4ab8", "#ffd23a", "#3ad8ff", "#5ae07a", "#9a6aff", "#ff8a3a"];
function fxBurst(S, type, a, b, c){ if(!S || !S.burst) return; const at = id => { const m = typeof id === "string" && S.beans.get(id); return m ? m.position : null; }, p = at(a);
  const B = (pos, o) => pos && S.burst(pos.x, (pos.y || 0) + (o.dy || 0), pos.z, o);
  switch(type){
    case "b": { const q = at(b); if(p && q) S.burst((p.x + q.x)/2, p.y + .7, (p.z + q.z)/2, { n:9, col:["#ffffff", "#fff6a0"], speed:4.5, size:.22, life:.4 }); break; }
    case "d": B(p, { n:6, col:"#f4ecff", speed:2.2, up:.15, size:.32, life:.45, grav:2 }); break;
    case "j": B(p, { n:7, col:"#ffffff", speed:2.4, up:.05, size:.28, life:.35, grav:0 }); break;
    case "f": B(p, { n:12, col:["#ff9ad8", "#ffffff"], speed:3, up:.9, size:.25, life:.6, dy:.3 }); break;
    case "x": S.burst(b, .7, c, { n:45, col:["#ffb000", "#ff5a1a", "#ffe23a", "#ffffff"], speed:9, up:.5, size:.5, life:.7 }); break;
    case "bash": { const q = at(b); if(q) S.burst(q.x, q.y + .8, q.z, { n:18, col:["#fff36a", "#ffffff", "#ff8ac4"], speed:7, size:.3, life:.45 }); break; }
    case "hit": case "w": case "h": B(p, { n:12, col:["#ffffff", "#bfe8ff"], speed:5, size:.28, life:.45, dy:.8 }); break;
    case "grab": case "c": case "steal": B(p, { n:10, col:["#ffd23a", "#fff6a0"], speed:3.5, up:1, size:.22, life:.5, dy:1 }); break;
    case "nest": case "hoop": case "sit": case "perfect": B(p, { n:16, col:CONF, speed:4, up:1, size:.25, life:.6, dy:1 }); break;
    case "goal": case "cap": case "fin": case "found": { const q = p || at(b); if(q) S.burst(q.x, q.y + 1, q.z, { n:60, col:CONF, speed:8, up:1.2, size:.35, life:1.2, grav:9, confetti:true }); break; }
    case "burn": B(p, { n:24, col:["#ff5a00", "#ffb000", "#ffe23a"], speed:5, up:1.3, size:.35, life:.7, dy:.3, grav:6 }); break;
    case "inf": B(p, { n:16, col:["#7ad83a", "#c8ff8a"], speed:4, size:.3, life:.6, dy:.8 }); break;
    case "splat": S.burst(b, .3, c, { n:20, col:["#ffffff", "#ff8ac4", "#8ac8ff"], speed:6, up:.6, size:.3, life:.5 }); break;
    case "kill": B(p, { n:22, col:["#d8d0e8", "#ffffff"], speed:3, up:1.4, size:.4, life:.9, dy:.6, grav:-1 }); break;
    case "k": case "out": case "o": case "eaten": B(p, { n:20, col:["#ffffff", "#ffd23a"], speed:5, up:1, size:.3, life:.7, dy:.6 }); break;
    case "thaw": B(p, { n:14, col:["#9ad8ff", "#ffffff"], speed:3, up:1, size:.25, life:.6, dy:.8 }); break;
  } }
// a simple bot: stay near the middle, chase the nearest bean, dive into them
function physBot(G, id, o = {}){
  const b = G.B[id]; if(!b || !b.alive || b.fall) return null; const safe = o.safe || 4; let tx = o.cx || 0, tz = o.cz || 0;
  let best = null, bd = 1e9; for(const k in G.B){ const c = G.B[k]; if(k === id || !c.alive || c.fall) continue; const d = Math.hypot(c.x - b.x, c.z - b.z); if(d < bd){ bd = d; best = c; } }
  const dc = Math.hypot(b.x - tx, b.z - tz);
  if(best && dc < safe && (o.chase !== false)){ tx = best.x; tz = best.z; }
  if(o.flee && best && bd < 5){ tx = b.x - (best.x - b.x); tz = b.z - (best.z - b.z); }
  b.bt = (b.bt || 0) - .016; if(b.bt <= 0){ b.jx = (rand() - .5) * .8; b.jz = (rand() - .5) * .8; b.bt = .4 + rand()*.6; }
  let dx = tx - b.x + b.jx, dz = tz - b.z + b.jz; const m = Math.hypot(dx, dz) || 1; dx /= m; dz /= m;
  const aim = best && bd < (o.reach || 2.6) && !o.flee && rand() < (o.aimP || .05) ? 1 : 0;
  return { x:dx, y:dz, a:aim };
}
