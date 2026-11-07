// ===================== Blender-made models (public/models/*.cpkm = gzipped, quantised meshes) =====================
// Loaded once in the background. Anything that wants a model checks MDL.ready and falls back to the old shapes if not.
const MDL = { ready:false, nodes:{}, mats:{} };
function cpkmParse(buf){
  const dv = new DataView(buf), jl = dv.getUint32(0, true), J = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, jl))), b0 = (4 + jl + 3) & ~3;
  const mats = J.mats.map(m => { if(m.n === "TINT") return null; const mt = new THREE.MeshStandardMaterial({ color:m.c, roughness:m.r, metalness:Math.min(m.m, .45) });
    if(m.e){ mt.emissive.set(m.e); mt.emissiveIntensity = Math.min(1.2, m.ei * .5); }
    if(m.a < 1){ mt.transparent = true; mt.opacity = m.a; mt.depthWrite = false; }
    return mt; });
  const meshes = J.meshes.map(prims => prims.map(p => {
    const g = new THREE.BufferGeometry(), q = new Uint16Array(buf, b0 + p.po, p.vc*3), pos = new Float32Array(p.vc*3), n8 = new Int8Array(buf, b0 + p.no, p.vc*4), nor = new Float32Array(p.vc*3);
    for(let i=0;i<p.vc;i++) for(let k=0;k<3;k++){ pos[i*3+k] = p.lo[k] + q[i*3+k] / 65535 * (p.hi[k] - p.lo[k]); nor[i*3+k] = n8[i*4+k] / 127; }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setIndex(new THREE.BufferAttribute(p.i32 ? new Uint32Array(buf.slice(b0 + p.io, b0 + p.io + p.ic*4)) : new Uint16Array(buf, b0 + p.io, p.ic), 1));
    g.computeBoundingSphere(); return { g, mat:p.mat }; }));
  const objs = J.nodes.map(n => { let o;
    if(n.m != null){ const pr = meshes[n.m]; const mk = x => { const me = new THREE.Mesh(x.g, mats[x.mat] || TINT0); me.castShadow = true; if(!mats[x.mat]) me.userData.tint = 1; return me; };
      if(pr.length === 1) o = mk(pr[0]); else { o = new THREE.Group(); pr.forEach(x => o.add(mk(x))); } }
    else o = new THREE.Group();
    o.name = n.n; if(n.t) o.position.fromArray(n.t); if(n.r) o.quaternion.fromArray(n.r); if(n.s) o.scale.fromArray(n.s); return o; });
  J.nodes.forEach((n, i) => { if(n.p >= 0) objs[n.p].add(objs[i]); else MDL.nodes[n.n] = objs[i]; });
}
let TINT0 = null;
async function loadModels(){
  if(MDL.ready || MDL.loading || typeof DecompressionStream === "undefined" || typeof THREE === "undefined") return; MDL.loading = 1;
  try{ TINT0 = new THREE.MeshStandardMaterial({ color:"#3ab8ff" });
    const get = async n => { const r = await fetch("/models/" + n + ".cpkm"); if(!r.ok) throw 0; return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(); };
    const bufs = await Promise.all(["bean", "props"].map(get)); bufs.forEach(cpkmParse); MDL.ready = true;
  }catch(e){ console.warn("models", e); MDL.loading = 0; }
}
// copy of a model, with every TINT part using `tint` (a material or a colour)
function mdl(name, tint){
  const src = MDL.ready && MDL.nodes[name]; if(!src) return null;
  const o = src.clone(true); if(tint != null){ const tm = tint.isMaterial ? tint : new THREE.MeshStandardMaterial({ color:tint, roughness:.35, metalness:.1 }); o.traverse(c => { if(c.userData.tint) c.material = tm; }); }
  return o;
}
const mdlGeo = name => { const n = MDL.ready && MDL.nodes[name]; return n && n.isMesh ? n.geometry : null; };
// icing drips for a round platform of radius R whose top is at local y=0
function dripRing(R, col){
  const g0 = mdlGeo("drip") || (MDL.nodes.drip && MDL.nodes.drip.children[0] && MDL.nodes.drip.children[0].geometry); if(!g0) return null;
  const g = g0.clone(), p = g.attributes.position;
  for(let i=0;i<p.count;i++){ const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) || 1, nr = R + (r - 1) * 2.2; p.setX(i, x / r * nr); p.setZ(i, z / r * nr); p.setY(i, p.getY(i) * 1.7); }
  p.needsUpdate = true; g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color:col, roughness:.25, clearcoat:.8, clearcoatRoughness:.2 })); return m;
}
// spinning 3D bean for the wardrobe (drag to turn it). Returns false if it can't (then the caller shows the flat bean)
const PV = { rot:0, vel:0 };
function beanPreview(host, bean, w, h){
  if(!MDL.ready || !host) return false;
  try{
    if(!PV.r){ const r = PV.r = new THREE.WebGLRenderer({ antialias:true, alpha:true }); r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setClearColor(0, 0);
      const sc = PV.scene = new THREE.Scene(); sc.add(new THREE.HemisphereLight("#ffffff", "#ffc8ea", .75)); const sun = new THREE.DirectionalLight("#fff4e4", .85); sun.position.set(3, 6, 5); sc.add(sun); const rim = new THREE.DirectionalLight("#c8e0ff", .5); rim.position.set(-4, 3, -5); sc.add(rim);
      const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color:"#4a4058", side:THREE.BackSide })));
      [[0, 9, 0, 2.6, "#ffffff"], [7, 3, 5, 1.6, "#fff4e0"], [-6, 4, -6, 1.4, "#ffe0f4"]].forEach(([x, y, z, rr, c]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(rr, 12, 8), new THREE.MeshBasicMaterial({ color:c })); m.position.set(x, y, z); es.add(m); });
      const pm = new THREE.PMREMGenerator(r); sc.environment = pm.fromScene(es, .04).texture; pm.dispose();
      const sh = new THREE.Mesh(new THREE.CircleGeometry(.75, 32), new THREE.MeshBasicMaterial({ color:"#000", transparent:true, opacity:.12 })); sh.rotation.x = -Math.PI/2; sh.position.y = .005; sc.add(sh);
      PV.cam = new THREE.PerspectiveCamera(30, 1, .1, 50); PV.cam.position.set(0, 1.05, 4.1); PV.cam.lookAt(0, .74, 0);
      const cv = r.domElement; cv.className = "bean3d"; cv.style.touchAction = "none";
      cv.onpointerdown = e => { PV.drag = e.clientX; PV.vel = 0; cv.setPointerCapture(e.pointerId); };
      cv.onpointermove = e => { if(PV.drag == null) return; const d = (e.clientX - PV.drag) * .012; PV.rot += d; PV.vel = d * 30; PV.drag = e.clientX; };
      cv.onpointerup = cv.onpointercancel = () => { PV.drag = null; }; }
    PV.r.setSize(w, h); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); host.appendChild(PV.r.domElement);
    if(PV.bean) PV.scene.remove(PV.bean); PV.bean = beanMesh(bean, ""); PV.scene.add(PV.bean);
    if(!PV.raf){ let last = performance.now(); const loop = now => { const dt = Math.min(.05, (now - last) / 1000); last = now;
        if(!PV.r.domElement.isConnected){ PV.raf = 0; return; }
        if(PV.drag == null){ PV.rot += PV.vel * dt; PV.vel *= Math.max(0, 1 - dt * 2.5); if(Math.abs(PV.vel) < .4){ PV.rot = Math.atan2(Math.sin(PV.rot), Math.cos(PV.rot)); PV.rot += (Math.sin(now / 1400) * .6 - PV.rot) * Math.min(1, dt * 1.6); } }
        PV.bean.rotation.y = PV.rot; animBean(PV.bean, 0, now / 1000); PV.bean.position.y = Math.abs(Math.sin(now / 400)) * .08; PV.r.render(PV.scene, PV.cam); PV.raf = requestAnimationFrame(loop); };
      PV.raf = requestAnimationFrame(loop); }
    return true;
  }catch(e){ console.warn(e); return false; }
}
loadModels();
