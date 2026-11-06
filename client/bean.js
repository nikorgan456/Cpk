// ===================== the bean: 2D (SVG) and 3D versions, plus the clothes catalogue =====================
const ITEMS = {
  cap:{ n:"Cap", s:"hat" }, beanie:{ n:"Beanie", s:"hat" }, party:{ n:"Party hat", s:"hat" }, crown:{ n:"Crown", s:"hat" }, tophat:{ n:"Top hat", s:"hat" }, cowboy:{ n:"Cowboy hat", s:"hat" },
  viking:{ n:"Viking helmet", s:"hat" }, chef:{ n:"Chef hat", s:"hat" }, halo:{ n:"Halo", s:"hat" }, bunny:{ n:"Bunny ears", s:"hat" }, frog:{ n:"Frog hat", s:"hat" }, propeller:{ n:"Propeller cap", s:"hat" },
  shades:{ n:"Shades", s:"face" }, nerd:{ n:"Nerd glasses", s:"face" }, monocle:{ n:"Monocle", s:"face" }, visor:{ n:"Cyber visor", s:"face" }, mask:{ n:"Hero mask", s:"face" },
  scarf:{ n:"Scarf", s:"neck" }, bowtie:{ n:"Bow tie", s:"neck" }, cape:{ n:"Cape", s:"neck" }, wings:{ n:"Angel wings", s:"neck" }, backpack:{ n:"Backpack", s:"neck" }, medal:{ n:"Gold medal", s:"neck" },
  c_gold:{ n:"Solid gold", s:"col" }, c_galaxy:{ n:"Galaxy", s:"col" }, c_rainbow:{ n:"Rainbow", s:"col" }, c_ghost:{ n:"Ghost", s:"col" }, c_lava:{ n:"Lava", s:"col" }
};
const SPECIAL = { c_gold:["#ffe27a","#e0a020","#a86a00"], c_galaxy:["#7a3aff","#2a1a6a","#ff4ab8"], c_rainbow:["#ff4a6a","#ffd23a","#3ad87a","#3ab8ff","#9a5aff"], c_ghost:["#ffffff","#d8e8ff","#b8c8ff"], c_lava:["#ffd23a","#ff6a1a","#a01a00"] };
let beanUid = 0;
function beanFill(col, id){
  const s = SPECIAL[col]; if(!s) return { fill:col, defs:"", dark:shade(col, -.25) };
  const stops = s.map((c, i) => `<stop offset="${i / (s.length - 1)}" stop-color="${c}"/>`).join("");
  return { fill:`url(#bg${id})`, defs:`<linearGradient id="bg${id}" x1="0" y1="0" x2="${col === "c_rainbow" ? 1 : .3}" y2="1">${stops}</linearGradient>`, dark:shade(s[s.length - 1], -.1), ghost:col === "c_ghost" };
}
function shade(hex, k){ const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255); return "#" + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, "0")).join(""); }
function beanSVG(bean, size = 64, opts = {}){
  const b = bean || {}, id = ++beanUid, F = beanFill(b.col || "#3ab8ff", id), hat = b.hat, face = b.face, neck = b.neck;
  let back = "", front = "", top = "";
  if(neck === "cape") back += `<path d="M20 72 Q50 80 80 72 L92 114 Q50 122 8 114 Z" fill="#d82a4a" stroke="#8a1028" stroke-width="2"/>`;
  if(neck === "wings") back += `<path d="M24 60 Q2 40 4 74 Q10 66 14 78 Q16 70 24 80 Z M76 60 Q98 40 96 74 Q90 66 86 78 Q84 70 76 80 Z" fill="#fff" stroke="#c8d8f0" stroke-width="2"/>`;
  if(neck === "backpack") back += `<rect x="74" y="60" width="20" height="36" rx="7" fill="#ff8a2a" stroke="#c05a10" stroke-width="2"/>`;
  const body = `<ellipse cx="34" cy="111" rx="11" ry="6" fill="${F.dark}"/><ellipse cx="66" cy="111" rx="11" ry="6" fill="${F.dark}"/>
    <ellipse cx="15" cy="80" rx="7" ry="10" fill="${F.fill}" stroke="${F.dark}" stroke-width="3" transform="rotate(20 15 80)"/><ellipse cx="85" cy="80" rx="7" ry="10" fill="${F.fill}" stroke="${F.dark}" stroke-width="3" transform="rotate(-20 85 80)"/>
    <path d="M50 18 C73 18 85 42 86 70 C87 99 73 110 50 110 C27 110 13 99 14 70 C15 42 27 18 50 18 Z" fill="${F.fill}" stroke="${F.dark}" stroke-width="3" ${F.ghost ? 'opacity=".85"' : ""}/>
    <ellipse cx="34" cy="36" rx="8" ry="11" fill="#fff" opacity=".4" transform="rotate(25 34 36)"/>`;
  const look = opts.look || 0;
  let eyes = face === "visor" ? `<rect x="22" y="44" width="56" height="16" rx="8" fill="#2affd8" stroke="#1a6a6a" stroke-width="3"/><rect x="28" y="48" width="18" height="4" rx="2" fill="#fff" opacity=".8"/>`
    : `<circle cx="38" cy="52" r="10" fill="#fff" stroke="#2a1a4a" stroke-width="2.5"/><circle cx="62" cy="52" r="10" fill="#fff" stroke="#2a1a4a" stroke-width="2.5"/><circle cx="${39 + look}" cy="54" r="4.6" fill="#2a1a4a"/><circle cx="${63 + look}" cy="54" r="4.6" fill="#2a1a4a"/><circle cx="${40.5 + look}" cy="52.5" r="1.5" fill="#fff"/><circle cx="${64.5 + look}" cy="52.5" r="1.5" fill="#fff"/>`;
  eyes += `<ellipse cx="27" cy="68" rx="6" ry="3.5" fill="#ff6a9a" opacity=".45"/><ellipse cx="73" cy="68" rx="6" ry="3.5" fill="#ff6a9a" opacity=".45"/>`;
  if(opts.mood === "sad") eyes += `<path d="M43 76 Q50 70 57 76" stroke="#2a1a4a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  else if(opts.mood === "happy") eyes += `<path d="M40 68 Q50 82 60 68 Z" fill="#2a1a4a"/><path d="M45 74 Q50 78 55 74" fill="#ff7a9a"/>`;
  else eyes += `<path d="M44 70 Q50 76 56 70" stroke="#2a1a4a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  let neckF = "";
  if(face === "shades") front += `<rect x="25" y="44" width="25" height="15" rx="5" fill="#111"/><rect x="51" y="44" width="25" height="15" rx="5" fill="#111"/><rect x="47" y="48" width="7" height="3" fill="#111"/><rect x="29" y="47" width="8" height="3" rx="1.5" fill="#fff" opacity=".5"/>`;
  if(face === "nerd") front += `<circle cx="38" cy="52" r="12.5" fill="none" stroke="#3a2a1a" stroke-width="3.5"/><circle cx="62" cy="52" r="12.5" fill="none" stroke="#3a2a1a" stroke-width="3.5"/><path d="M48 50 L52 50" stroke="#3a2a1a" stroke-width="3.5"/>`;
  if(face === "monocle") front += `<circle cx="62" cy="52" r="12.5" fill="rgba(255,255,255,.15)" stroke="#d8a020" stroke-width="3"/><path d="M71 61 Q76 76 70 88" stroke="#d8a020" stroke-width="1.5" fill="none"/>`;
  if(face === "mask") front += `<path d="M18 44 Q50 34 82 44 L82 60 Q68 64 58 57 Q50 54 42 57 Q32 64 18 60 Z" fill="#2a2aa8"/><ellipse cx="38" cy="52" rx="6" ry="4" fill="#fff"/><ellipse cx="62" cy="52" rx="6" ry="4" fill="#fff"/>`;
  
  if(neck === "scarf") neckF += `<path d="M22 66 Q50 76 78 66 L78 74 Q50 84 22 74 Z" fill="#e83a3a"/><path d="M62 74 L66 94 L58 94 L56 76 Z" fill="#e83a3a"/><path d="M24 70 L76 70" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>`;
  if(neck === "bowtie") neckF += `<path d="M50 70 L38 63 L38 77 Z M50 70 L62 63 L62 77 Z" fill="#e83a6a" stroke="#a01a40" stroke-width="1.5"/><circle cx="50" cy="70" r="3.5" fill="#a01a40"/>`;
  if(neck === "medal") neckF += `<path d="M42 64 L50 80 L58 64" stroke="#3a6aff" stroke-width="4" fill="none"/><circle cx="50" cy="84" r="7" fill="#ffd23a" stroke="#c08a00" stroke-width="2"/>`;
  if(neck === "cape") front += `<circle cx="22" cy="74" r="3.5" fill="#ffd23a"/><circle cx="78" cy="74" r="3.5" fill="#ffd23a"/>`;
  if(neck === "backpack") front += `<path d="M72 66 L76 98" stroke="#c05a10" stroke-width="4"/>`;
  if(hat === "cap") top = `<path d="M24 34 Q26 12 50 12 Q74 12 76 34 Z" fill="#e83a3a"/><path d="M50 30 L92 34 Q90 40 74 38 L50 36 Z" fill="#c02020"/><circle cx="50" cy="13" r="3" fill="#c02020"/>`;
  if(hat === "beanie") top = `<path d="M22 36 Q22 6 50 6 Q78 6 78 36 Z" fill="#3a8aff"/><rect x="20" y="30" width="60" height="9" rx="4" fill="#2a6ad8"/><circle cx="50" cy="6" r="6" fill="#fff"/>`;
  if(hat === "party") top = `<path d="M38 26 L50 -8 L62 26 Z" fill="#ff4ab8"/><path d="M42 16 L58 16 M45 6 L55 6" stroke="#ffe23a" stroke-width="4"/><circle cx="50" cy="-8" r="5" fill="#ffe23a"/>`;
  if(hat === "crown") top = `<path d="M30 28 L30 8 L40 18 L50 2 L60 18 L70 8 L70 28 Z" fill="#ffd23a" stroke="#c08a00" stroke-width="2"/><circle cx="50" cy="20" r="4" fill="#e83a3a"/><circle cx="38" cy="22" r="3" fill="#3a8aff"/><circle cx="62" cy="22" r="3" fill="#3ad87a"/>`;
  if(hat === "tophat") top = `<rect x="34" y="-4" width="32" height="30" rx="2" fill="#1a1a24"/><rect x="24" y="24" width="52" height="7" rx="3" fill="#1a1a24"/><rect x="34" y="14" width="32" height="6" fill="#e83a3a"/>`;
  if(hat === "cowboy") top = `<path d="M10 28 Q50 40 90 28 Q84 22 72 24 Q70 4 50 6 Q30 4 28 24 Q16 22 10 28 Z" fill="#a8722a" stroke="#6a4a1a" stroke-width="2"/><path d="M30 20 Q50 26 70 20" stroke="#3a2a1a" stroke-width="3" fill="none"/>`;
  if(hat === "viking") top = `<path d="M24 34 Q24 6 50 6 Q76 6 76 34 Z" fill="#9aa8b8" stroke="#5a6878" stroke-width="2"/><path d="M26 22 Q8 18 8 -2 Q16 14 28 14 Z M74 22 Q92 18 92 -2 Q84 14 72 14 Z" fill="#fff4dc" stroke="#c8b890" stroke-width="2"/><rect x="22" y="28" width="56" height="6" fill="#c8a040"/>`;
  if(hat === "chef") top = `<rect x="32" y="16" width="36" height="16" fill="#fff" stroke="#d8d8e0" stroke-width="2"/><circle cx="36" cy="10" r="10" fill="#fff"/><circle cx="50" cy="4" r="11" fill="#fff"/><circle cx="64" cy="10" r="10" fill="#fff"/>`;
  if(hat === "halo") top = `<ellipse cx="50" cy="6" rx="22" ry="6" fill="none" stroke="#ffe23a" stroke-width="5"/>`;
  if(hat === "bunny") top = `<ellipse cx="38" cy="2" rx="8" ry="22" fill="#fff" stroke="#e8c8d8" stroke-width="2"/><ellipse cx="62" cy="2" rx="8" ry="22" fill="#fff" stroke="#e8c8d8" stroke-width="2"/><ellipse cx="38" cy="4" rx="4" ry="15" fill="#ffb8d8"/><ellipse cx="62" cy="4" rx="4" ry="15" fill="#ffb8d8"/>`;
  if(hat === "frog") top = `<path d="M22 34 Q22 10 50 10 Q78 10 78 34 Z" fill="#5ad85a"/><circle cx="36" cy="10" r="9" fill="#5ad85a"/><circle cx="64" cy="10" r="9" fill="#5ad85a"/><circle cx="36" cy="10" r="5" fill="#fff"/><circle cx="64" cy="10" r="5" fill="#fff"/><circle cx="37" cy="11" r="2.5" fill="#111"/><circle cx="65" cy="11" r="2.5" fill="#111"/>`;
  if(hat === "propeller") top = `<path d="M24 34 Q26 12 50 12 Q74 12 76 34 Z" fill="#3ad8ff"/><path d="M24 30 Q50 18 76 30" stroke="#ffe23a" stroke-width="4" fill="none"/><rect x="48" y="2" width="4" height="12" fill="#666"/><ellipse cx="50" cy="2" rx="18" ry="3.5" fill="#e83a3a"/>`;
  const sz = size; return `<svg class="bean" viewBox="0 -14 100 130" width="${sz}" height="${sz * 1.3}" aria-hidden="true"><defs>${F.defs}</defs>${back}${body}${eyes}${front}<g transform="translate(0 12)">${neckF}</g>${top}</svg>`;
}

// ---------- 3D bean for the physics games ----------
const BEAN3D = { geo:null };
function beanMesh(bean, name){
  const b = bean || {}, g = new THREE.Group(), body = new THREE.Group(); g.add(body); g.userData.body = body;
  if(!BEAN3D.geo){ const P = [[.001,0],[.36,.02],[.48,.1],[.53,.25],[.53,.42],[.49,.65],[.41,.88],[.29,1.07],[.14,1.2],[.001,1.25]];
    BEAN3D.geo = new THREE.LatheGeometry(P.map(p => new THREE.Vector2(p[0], p[1])), 28); BEAN3D.foot = new THREE.SphereGeometry(.14, 12, 8); BEAN3D.eye = new THREE.SphereGeometry(.17, 16, 12); BEAN3D.pupil = new THREE.SphereGeometry(.085, 12, 8); }
  const s = SPECIAL[b.col], col = s ? s[1] : (b.col || "#3ab8ff");
  const mat = new THREE.MeshStandardMaterial({ color:col, roughness:.4, metalness: b.col === "c_gold" ? .7 : .05, emissive: b.col === "c_lava" ? "#ff3a00" : b.col === "c_galaxy" ? "#3a1aa8" : "#000", emissiveIntensity: b.col === "c_lava" ? .4 : .25, transparent: b.col === "c_ghost", opacity: b.col === "c_ghost" ? .7 : 1 });
  if(b.col === "c_rainbow") g.userData.rainbow = mat;
  const m = new THREE.Mesh(BEAN3D.geo, mat); m.castShadow = true; m.position.y = .08; body.add(m);
  if(b.face === "visor"){ const vz = new THREE.Mesh(new THREE.BoxGeometry(.62, .16, .1), new THREE.MeshStandardMaterial({ color:"#2affd8", emissive:"#1a8a7a", roughness:.1 })); vz.position.set(0, .82, .44); body.add(vz); }
  else { const white = new THREE.MeshStandardMaterial({ color:"#fff", roughness:.2 }), black = new THREE.MeshStandardMaterial({ color:"#1a1030", roughness:.3 });
    [-1, 1].forEach(sd => { const e = new THREE.Mesh(BEAN3D.eye, white); e.position.set(sd*.17, .84, .38); e.scale.z = .8; body.add(e); const p = new THREE.Mesh(BEAN3D.pupil, black); p.position.set(sd*.17, .82, .5); body.add(p); }); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.1, .035, 8, 14, Math.PI), new THREE.MeshStandardMaterial({ color:"#1a1030" })); mouth.position.set(0, .64, .5); mouth.rotation.z = Math.PI; body.add(mouth);
  g.userData.feet = [-1, 1].map(sd => { const f = new THREE.Mesh(BEAN3D.foot, mat); f.scale.set(1, .6, 1.3); f.position.set(sd*.2, .06, .05); g.add(f); return f; });
  const M = c => new THREE.MeshStandardMaterial({ color:c, roughness:.5 }), add = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, typeof c === "string" ? M(c) : c); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.castShadow = true; body.add(o); return o; };
  const H = 1.27;
  switch(b.hat){
    case "cap": add(new THREE.SphereGeometry(.4, 16, 8, 0, Math.PI*2, 0, Math.PI/2), "#e83a3a", 0, H - .08, 0); add(new THREE.BoxGeometry(.4, .04, .35), "#c02020", 0, H - .06, .38); break;
    case "beanie": add(new THREE.SphereGeometry(.42, 16, 10, 0, Math.PI*2, 0, Math.PI/2), "#3a8aff", 0, H - .12, 0, 0, 0, 0, 1, 1.2, 1); add(new THREE.SphereGeometry(.1, 10, 8), "#fff", 0, H + .4, 0); break;
    case "party": add(new THREE.ConeGeometry(.22, .6, 16), "#ff4ab8", 0, H + .22, 0); add(new THREE.SphereGeometry(.07, 8, 6), "#ffe23a", 0, H + .55, 0); break;
    case "crown": { const c = add(new THREE.CylinderGeometry(.3, .3, .26, 8, 1, true), new THREE.MeshStandardMaterial({ color:"#ffd23a", metalness:.8, roughness:.25, side:THREE.DoubleSide }), 0, H + .05, 0); for(let k=0;k<8;k++){ const sp = add(new THREE.ConeGeometry(.06, .16, 4), c.material, Math.cos(k/8*Math.PI*2)*.3, H + .25, Math.sin(k/8*Math.PI*2)*.3); } break; }
    case "tophat": add(new THREE.CylinderGeometry(.24, .24, .5, 18), "#1a1a24", 0, H + .2, 0); add(new THREE.CylinderGeometry(.42, .42, .04, 20), "#1a1a24", 0, H - .04, 0); add(new THREE.CylinderGeometry(.245, .245, .08, 18), "#e83a3a", 0, H + .04, 0); break;
    case "cowboy": add(new THREE.CylinderGeometry(.62, .62, .04, 22), "#a8722a", 0, H - .04, 0); add(new THREE.CylinderGeometry(.24, .3, .32, 16), "#a8722a", 0, H + .12, 0); break;
    case "viking": add(new THREE.SphereGeometry(.44, 16, 8, 0, Math.PI*2, 0, Math.PI/2), "#9aa8b8", 0, H - .16, 0); [-1, 1].forEach(sd => add(new THREE.ConeGeometry(.08, .4, 10), "#fff4dc", sd*.46, H + .1, 0, 0, 0, -sd*.6)); break;
    case "chef": add(new THREE.CylinderGeometry(.26, .26, .2, 16), "#fff", 0, H + .02, 0); add(new THREE.SphereGeometry(.34, 14, 10), "#fff", 0, H + .28, 0, 0, 0, 0, 1, .7, 1); break;
    case "halo": add(new THREE.TorusGeometry(.3, .05, 8, 24), new THREE.MeshStandardMaterial({ color:"#ffe23a", emissive:"#ffc000", emissiveIntensity:.8 }), 0, H + .25, 0, Math.PI/2); break;
    case "bunny": [-1, 1].forEach(sd => add(new THREE.SphereGeometry(.1, 10, 8), "#fff", sd*.16, H + .3, 0, 0, 0, sd*.15, 1, 3.2, .6)); break;
    case "frog": add(new THREE.SphereGeometry(.44, 16, 8, 0, Math.PI*2, 0, Math.PI/2), "#5ad85a", 0, H - .14, 0); [-1, 1].forEach(sd => { add(new THREE.SphereGeometry(.13, 10, 8), "#5ad85a", sd*.2, H + .2, .12); add(new THREE.SphereGeometry(.07, 8, 6), "#fff", sd*.2, H + .24, .22); }); break;
    case "propeller": { add(new THREE.SphereGeometry(.4, 16, 8, 0, Math.PI*2, 0, Math.PI/2), "#3ad8ff", 0, H - .08, 0); const p = add(new THREE.BoxGeometry(.7, .02, .09), "#e83a3a", 0, H + .4, 0); g.userData.prop = p; add(new THREE.CylinderGeometry(.02, .02, .1, 6), "#666", 0, H + .35, 0); break; }
  }
  if(b.face === "shades") [-1, 1].forEach(sd => add(new THREE.BoxGeometry(.26, .16, .05), "#111", sd*.17, .84, .56));
  if(b.face === "nerd") [-1, 1].forEach(sd => add(new THREE.TorusGeometry(.15, .025, 6, 18), "#3a2a1a", sd*.17, .84, .55));
  if(b.face === "monocle") add(new THREE.TorusGeometry(.15, .025, 6, 18), "#d8a020", .17, .84, .55);
  if(b.face === "mask") add(new THREE.BoxGeometry(.85, .24, .06), "#2a2aa8", 0, .86, .5);
  if(b.neck === "scarf") add(new THREE.TorusGeometry(.5, .08, 8, 22), "#e83a3a", 0, .5, 0, Math.PI/2);
  if(b.neck === "bowtie") add(new THREE.BoxGeometry(.26, .12, .06), "#e83a6a", 0, .52, .52);
  if(b.neck === "medal"){ add(new THREE.CylinderGeometry(.1, .1, .03, 14), new THREE.MeshStandardMaterial({ color:"#ffd23a", metalness:.8, roughness:.3 }), 0, .42, .54, Math.PI/2); }
  if(b.neck === "cape"){ const c = add(new THREE.PlaneGeometry(.9, .8), new THREE.MeshStandardMaterial({ color:"#d82a4a", side:THREE.DoubleSide }), 0, .45, -.55, .15); g.userData.cape = c; }
  if(b.neck === "wings") [-1, 1].forEach(sd => add(new THREE.SphereGeometry(.24, 10, 8), "#fff", sd*.42, .7, -.38, 0, 0, sd*.4, .5, 1.3, .2));
  if(b.neck === "backpack") add(new THREE.BoxGeometry(.4, .46, .22), "#ff8a2a", 0, .5, -.56);
  g.userData.name = name; return g;
}
function animBean(g, speed, t, alive = true){
  const U = g.userData, sw = Math.sin(t * 14) * Math.min(1, speed / 4);
  if(U.feet){ U.feet[0].position.z = .05 + sw*.16; U.feet[1].position.z = .05 - sw*.16; U.feet[0].position.y = .06 + Math.max(0, sw)*.08; U.feet[1].position.y = .06 + Math.max(0, -sw)*.08; }
  U.body.position.y = Math.abs(sw) * .06; U.body.rotation.z = sw * .06;
  if(U.prop) U.prop.rotation.y = t * 20; if(U.cape) U.cape.rotation.x = .15 + Math.min(.9, speed * .15) + Math.sin(t*8)*.05;
  if(U.rainbow) U.rainbow.color.setHSL((t * .2) % 1, .8, .6);
}
