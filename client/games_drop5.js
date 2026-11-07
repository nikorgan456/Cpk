// ===================== drop 5 (long single games): Hide and Seek, Werewolf, Murder Mystery, Capture the Flag =====================

// ---------- HIDE AND SEEK ----------
const HS_W = 30, HS_H = 22, HS_HIDE = 20, HS_SEEK = 75, PROP_COLS = ["#ff4a8a", "#ffb0d0", "#5ae07a", "#3ab8ff", "#ff8a3a"], PROP_NAMES = ["lollipop", "cupcake", "gumdrop", "present", "mushroom"];
function hsProps(seed){ const R = seeded(seed), P = []; let k = 0; while(P.length < 46 && k++ < 900){ const x = (R() - .5)*(HS_W - 3), z = (R() - .5)*(HS_H - 3); if(P.every(p => Math.hypot(p.x - x, p.z - z) > 1.7)) P.push({ x:+x.toFixed(2), z:+z.toFixed(2), t:Math.floor(R()*5) }); } return P; }
function propMesh(t){ const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color:c, roughness:.4 }), add = (geo, c, y, s) => { const m = new THREE.Mesh(geo, M(c)); m.position.y = y; if(s) m.scale.set(...s); m.castShadow = true; g.add(m); return m; };
  if(t === 0){ add(new THREE.CylinderGeometry(.06, .06, 1.2, 8), "#ffffff", .6); const d = add(new THREE.CylinderGeometry(.45, .45, .12, 24), PROP_COLS[0], 1.35); d.rotation.x = Math.PI/2; add(new THREE.TorusGeometry(.3, .05, 6, 20), "#ffffff", 1.35).rotation.y = 0; }
  if(t === 1){ add(new THREE.CylinderGeometry(.45, .35, .5, 18), "#c88a4a", .25); add(new THREE.SphereGeometry(.48, 18, 12, 0, Math.PI*2, 0, Math.PI/2), PROP_COLS[1], .5); add(new THREE.SphereGeometry(.1, 8, 6), "#e83a3a", .98); }
  if(t === 2) add(new THREE.SphereGeometry(.5, 18, 14, 0, Math.PI*2, 0, Math.PI*.6), PROP_COLS[2], 0, [1, 1.3, 1]);
  if(t === 3){ add(new THREE.BoxGeometry(.85, .75, .85), PROP_COLS[3], .38); add(new THREE.BoxGeometry(.88, .78, .16), "#ffe23a", .38); add(new THREE.BoxGeometry(.16, .78, .88), "#ffe23a", .38); }
  if(t === 4){ add(new THREE.CylinderGeometry(.18, .24, .6, 12), "#fff4e0", .3); add(new THREE.SphereGeometry(.55, 18, 12, 0, Math.PI*2, 0, Math.PI/2), PROP_COLS[4], .55, [1, .7, 1]); }
  return g; }
GAMES.hideseek = {
  name:"Hide and Seek", icon:"🙈", cat:"phys", desc:"Disguise as candy. Don't get found!", dur:HS_HIDE + HS_SEEK + 2, solo:true, min:3, noClock:true,
  how:["<b>Hiders</b> turn into candy props. Tap <b>DISGUISE</b> (E) to copy the prop nearest you, then stand still!","<b>Seekers</b> wait 20 seconds, then <b>BONK</b> (E) anything suspicious. Bonk a real prop and you're dizzy for a moment","Found hiders join the seekers. Hiders who last the whole time win"],
  init(ids, ctx){ const P = hsProps(ctx.seed), n = ids.length >= 6 ? 2 : 1, seek = shuffle(ids).slice(0, n), B = physInit(ids, (i, k) => { const p = P[(i * 7) % P.length]; return [p.x + 1, p.z]; }), prop = {}, hid = {}, finds = {};
    ids.forEach(id => { prop[id] = Math.floor(rand()*5); hid[id] = 0; finds[id] = 0; }); seek.forEach((id, i) => { B[id].x = (i ? 1.5 : -1.5); B[id].z = 0; });
    return { B, P, seek:new Set(seek), prop, hid, finds, outs:[], info:{ seed:ctx.seed, seek } }; },
  introNote(info, me){ return info.seek.includes(me) ? "🔎 <b>You're a SEEKER!</b> Close your eyes for 20 seconds…" : "🙈 <b>You're a HIDER!</b> Find a spot and DISGUISE as a prop"; },
  tick(G, dt, inp, H){ const hiding = G.t < HS_HIDE, S = G.seek;
    const I = {}; G.ids.forEach(id => I[id] = hiding && S.has(id) || (G.B[id].dizzy || 0) > G.t ? {} : inp[id] || {});
    if(!hiding && !G.go){ G.go = true; fxp(G, "go"); }
    physStep(G, dt, I, { wall:{ w:HS_W, h:HS_H }, speed:6.4, noDash:true, act:(id, b) => { if(b.cd > 0) return; b.cd = .5;
      if(!S.has(id)){ let best = null, bd = 3; G.P.forEach(p => { const d = Math.hypot(p.x - b.x, p.z - b.z); if(d < bd){ bd = d; best = p; } }); G.prop[id] = best ? best.t : (G.prop[id] + 1) % 5; fxp(G, "dis", id); G.dirty = true; return; }
      if(hiding) return; const fx = Math.sin(b.f), fz = Math.cos(b.f), px = b.x + fx*1.1, pz = b.z + fz*1.1;
      const hit = G.ids.find(k => !S.has(k) && G.B[k].alive && Math.hypot(G.B[k].x - px, G.B[k].z - pz) < 1.05);
      if(hit){ S.add(hit); G.finds[id]++; fxp(G, "found", hit, id); G.dirty = true; return; }
      if(G.P.some(p => Math.hypot(p.x - px, p.z - pz) < .95)){ b.dizzy = G.t + .9; fxp(G, "wrong", id); } else fxp(G, "whiff", id); } });
    G.ids.forEach(id => { const b = G.B[id]; G.P.forEach(p => pushOutCirc(b, p.x, p.z, .95)); if(!S.has(id)) G.hid[id] += dt; else if(!hiding) b.moved = 0;
      if(!S.has(id)){ const sp = Math.hypot(b.vx, b.vz); b.moved = (b.moved || 0) * Math.max(0, 1 - dt*2) + (sp > .5 ? dt : 0); } });
    if(!hiding && G.ids.every(id => S.has(id))) H.end(this.timeout(G)); },
  timeout(G){ return byScore(G.ids, id => Math.round(G.hid[id] + G.finds[id] * 12 + (G.seek.has(id) ? 0 : 60))); },
  drop(G, id){ G.seek.add(id); },
  bot(G, id){ const b = G.B[id], S = G.seek; if(!b) return null;
    if(!S.has(id)){ if(!b.spot){ const p = pick(G.P), a = rand()*Math.PI*2; b.spot = [p.x + Math.cos(a)*1.3, p.z + Math.sin(a)*1.3]; b.want = p.t; }
      const d = Math.hypot(b.spot[0] - b.x, b.spot[1] - b.z); if(d > .4) return toward(b, b.spot[0], b.spot[1]); return { x:0, y:0, a:G.prop[id] !== b.want && b.cd <= 0 ? 1 : 0 }; }
    if(G.t < HS_HIDE) return null; if((b.dizzy || 0) > G.t) return null;
    if(!b.tg || b.tg.id && S.has(b.tg.id) || rand() < .006){ const hs = G.ids.filter(k => !S.has(k)), near = G.P.filter(p => Math.hypot(p.x - b.x, p.z - b.z) < 7); b.tg = hs.length && rand() < .4 ? (k => ({ id:k }))(pick(hs)) : pick(near.length ? near : G.P); }
    const t = b.tg.id ? { x:G.B[b.tg.id].x, z:G.B[b.tg.id].z } : b.tg, d = Math.hypot(t.x - b.x, t.z - b.z); if(!b.tg.id && b.cd > 0 && rand() < .2){ b.tg = null; return null; }
    if(d > 1.3) return toward(b, t.x, t.z); b.f = Math.atan2(t.x - b.x, t.z - b.z); const sus = b.tg.id && (G.B[b.tg.id].moved > .2 || rand() < .5);
    const r = toward(b, t.x, t.z, .25); if(b.cd <= 0 && (sus || rand() < .2)) r.a = 1; else if(rand() < .1) b.tg = null; return r; },
  snap(G){ return { B:physSnap(G.B), seek:[...G.seek], prop:G.prop, ph:G.t < HS_HIDE ? "hide" : "seek", fx:G.fx }; },
  view(root, ctx){ const P = hsProps(ctx.info.seed), me = ctx.me;
    return physView(root, ctx, { rot:true, sky:"#9ad8ff", sky2:"#ffe8f6", goo:"#ff9ad8", fog:"#ffe8f6", cam:[0, 15, 12], btn:"DISGUISE", pred:{ speed:6.4 } }, (S, v) => {
    floorBox(S, HS_W, HS_H, new THREE.MeshStandardMaterial({ map:cTex(256, 256, (x, w) => { x.fillStyle = "#c8f0b0"; x.fillRect(0, 0, w, w); for(let i=0;i<120;i++){ x.fillStyle = pick(["#b8e8a0", "#d8f8c0", "#a8e090"]); x.beginPath(); x.arc(rand()*w, rand()*w, 4 + rand()*10, 0, 7); x.fill(); } }, [4, 3]), roughness:.9 })); wallRing(S, HS_W, HS_H, "#ff9ad8");
    P.forEach(p => { const m = propMesh(p.t); m.position.set(p.x, 0, p.z); m.rotation.y = p.x * 3; S.scene.add(m); });
    const disg = {}, blind = document.createElement("div"); blind.className = "hs-blind"; blind.hidden = true; root.appendChild(blind); const hud = raceHud(root);
    v.extra = (id, b, s) => { const seeker = v.seek && v.seek.has(id), tag = S.tags.get(id);
      b.userData.body.visible = seeker; b.userData.feet.forEach(f => f.visible = seeker); if(b.userData.blob) b.userData.blob.visible = seeker; if(tag) tag.style.display = seeker || id === me ? "" : "none";
      const t = v.prop ? v.prop[id] : 0; if(!seeker){ if(!disg[id] || disg[id].userData.t !== t){ if(disg[id]) b.remove(disg[id]); disg[id] = propMesh(t); disg[id].userData.t = t; b.add(disg[id]); if(id === me) disg[id].traverse(o => { if(o.material){ o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .75; } }); } disg[id].visible = true; }
      else if(disg[id]) disg[id].visible = false; };
    v.tick = (s, dt) => { v.seek = new Set(s.seek); v.prop = s.prop; const amSeek = v.seek.has(me), tt = CM.phase === "play" ? now() - CM.playT : 0;
      if(amSeek !== v.amSeek){ v.amSeek = amSeek; ctlShow("stick", amSeek ? "BONK" : "DISGUISE"); }
      blind.hidden = !(amSeek && s.ph === "hide" && CM.phase === "play"); if(!blind.hidden) blind.innerHTML = `<b>🙈 ${Math.max(0, Math.ceil(HS_HIDE - tt))}</b><span>Eyes closed! The hiders are hiding…</span>`;
      const left = Object.keys(s.B).filter(id => !v.seek.has(id)).length; hud.innerHTML = s.ph === "hide" ? `<b>${Math.max(0, Math.ceil(HS_HIDE - tt))}</b><span>${amSeek ? "Counting…" : "Hide! Then tap DISGUISE"}</span>` : `<b>${Math.max(0, Math.ceil(HS_HIDE + HS_SEEK - tt))}s</b><span>${amSeek ? "🔎 Seeking" : "🙈 Hiding as a " + PROP_NAMES[s.prop[me] || 0]} · ${left} hider${left === 1 ? "" : "s"} left</span>`;
      const mine = s.B[me]; if(mine) S.follow(mine[0], mine[1], .12); };
    v.onFx = (type, a, b) => { if(type === "found"){ sfx.boom(); if(a === me){ toast(`😱 ${b} found you! Now you're a seeker`, 2000); SND.say("Found you!"); } else if(b === me) sfx.win(); }
      else if(type === "wrong"){ sfx.wrong(); if(a === me) toast("🌀 That was a real prop! Dizzy…", 1000); } else if(type === "dis"){ if(a === me) sfx.pop(); } else if(type === "go"){ sfx.whistle(); SND.say("Ready or not, here I come!"); } else if(type === "whiff"){ if(a === me) sfx.whoosh(); } };
    const d0 = v.destroy; v.destroy = () => { blind.remove(); hud.remove(); d0(); };
  }); }
};

// ---------- WEREWOLF ----------
const WW_N = 16, WW_DAWN = 6, WW_DAY = 45, WW_VER = 6;
GAMES.werewolf = {
  name:"Werewolf", icon:"🐺", cat:"social", desc:"Find the werewolves before they eat you", dur:900, rate:4, solo:true, min:4, noClock:true,
  how:["Everyone secretly gets a role: 🐺 <b>Werewolf</b>, 🔮 <b>Seer</b> or 🧑‍🌾 <b>Villager</b>","🌙 At night the wolves pick someone to eat and the Seer checks one player","☀️ In the day, argue in 💬 chat and vote someone out. Villagers win if every wolf is gone, wolves win if they match the villagers"],
  init(ids){ const s = shuffle(ids), nw = ids.length >= 7 ? 2 : 1, role = {}; s.forEach((id, i) => role[id] = i < nw ? "wolf" : i === nw && ids.length >= 5 ? "seer" : "vill");
    return { role, alive:new Set(ids), ph:"night", pend:WW_N, night:1, wv:{}, seen:{}, sv:null, dv:{}, log:[], sent:false, knows:{}, info:{ n:ids.length } }; },
  introNote(){ return "Your secret role appears when it starts. Don't show anyone! 🤫"; },
  wolves(G){ return [...G.alive].filter(id => G.role[id] === "wolf"); },
  check(G, H){ const w = this.wolves(G).length, o = G.alive.size - w; if(!w){ G.win = "vill"; } else if(w >= o){ G.win = "wolf"; } if(G.win){ G.ph = "over"; G.pend = G.t + 7; G.log.push(G.win === "vill" ? "🎉 All the werewolves are gone. <b>Villagers win!</b>" : "🐺 The wolves outnumber the village. <b>Werewolves win!</b>"); G.dirty = true; fxp(G, "over", G.win); } },
  tick(G, dt, inp, H){
    if(!G.sent){ G.sent = true; const wl = G.ids.filter(id => G.role[id] === "wolf"); G.ids.forEach(id => H.to(id, { t:"role", r:G.role[id], pack:G.role[id] === "wolf" ? wl : null })); }
    const alive = [...G.alive];
    alive.forEach(id => { if(!playerOf(id)?.bot) return; const r = G.role[id], others = alive.filter(k => k !== id);
      if(G.ph === "night" && G.t > G.pend - WW_N + 3 + rand()*4){ if(r === "wolf" && !G.wv[id]) G.wv[id] = pick(others.filter(k => G.role[k] !== "wolf")) || null; if(r === "seer" && !G.sv){ const c = others.filter(k => !G.seen[k]); if(c.length){ const k = pick(c); G.sv = k; } } }
      if(G.ph === "day" && G.dv[id] == null && G.t > G.pend - WW_DAY + 8 + rand()*25){ const known = Object.keys(G.knows[id] || {}).find(k => G.knows[id][k] === "wolf" && G.alive.has(k));
        G.dv[id] = r === "wolf" ? pick(others.filter(k => G.role[k] !== "wolf")) : known || (rand() < .5 && Object.values(G.dv).length ? pick(Object.values(G.dv).filter(k => k !== id && G.alive.has(k))) : null) || pick(others); G.dirty = true; } });
    if(G.ph === "night" && (G.t >= G.pend || this.wolves(G).every(w => G.wv[w]) && (!alive.some(id => G.role[id] === "seer") || G.sv) && G.t > G.pend - WW_N + 5)){
      const votes = this.wolves(G).map(w => G.wv[w]).filter(Boolean), c = {}; votes.forEach(k => c[k] = (c[k] || 0) + 1); let vic = votes.length ? Object.keys(c).sort((a, b) => c[b] - c[a])[0] : null;
      const seer = alive.find(id => G.role[id] === "seer"); if(seer && G.sv){ G.seen[G.sv] = 1; (G.knows[seer] = G.knows[seer] || {})[G.sv] = G.role[G.sv] === "wolf" ? "wolf" : "safe"; H.to(seer, { t:"seen", who:G.sv, wolf:G.role[G.sv] === "wolf" }); }
      if(vic){ G.alive.delete(vic); G.log.push(`🌅 Night ${G.night}: <b>${esc(vic)}</b> was eaten by the wolves! They were a ${this.rname(G.role[vic])}`); fxp(G, "eaten", vic); } else G.log.push(`🌅 Night ${G.night}: nobody was eaten!`);
      G.ph = "dawn"; G.pend = G.t + WW_DAWN; G.wv = {}; G.sv = null; G.dirty = true; this.check(G, H); return; }
    if(G.ph === "dawn" && G.t >= G.pend){ G.ph = "day"; G.pend = G.t + WW_DAY; G.dv = {}; G.dirty = true; fxp(G, "day"); return; }
    if(G.ph === "day" && (G.t >= G.pend || alive.every(id => G.dv[id] != null) && G.t > G.pend - WW_DAY + 6)){ const c = {}; Object.entries(G.dv).forEach(([v, k]) => { if(G.alive.has(v) && k && G.alive.has(k)) c[k] = (c[k] || 0) + 1; });
      const top = Math.max(0, ...Object.values(c)), most = Object.keys(c).filter(k => c[k] === top);
      if(top > 0 && most.length === 1){ const out = most[0]; G.alive.delete(out); G.log.push(`☀️ The village voted out <b>${esc(out)}</b>. They were a ${this.rname(G.role[out])}`); fxp(G, "voted", out, G.role[out]); } else G.log.push("☀️ It's a tie. Nobody was voted out.");
      G.ph = "verdict"; G.pend = G.t + WW_VER; G.dirty = true; this.check(G, H); return; }
    if(G.ph === "verdict" && G.t >= G.pend){ G.night++; G.ph = "night"; G.pend = G.t + WW_N; G.dirty = true; fxp(G, "night"); return; }
    if(G.ph === "over" && G.t >= G.pend) H.end(this.timeout(G)); },
  rname(r){ return r === "wolf" ? "🐺 Werewolf" : r === "seer" ? "🔮 Seer" : "🧑‍🌾 Villager"; },
  timeout(G){ const win = G.win || (this.wolves(G).length ? "wolf" : "vill"), side = id => (G.role[id] === "wolf") === (win === "wolf");
    return byScore(G.ids, id => (side(id) ? 10 : 0) + (G.alive.has(id) ? 2 : 0)); },
  onEvent(G, id, d){ if(!G.alive.has(id) || !G.ids.includes(d.who) || !G.alive.has(d.who) || d.who === id) return; const r = G.role[id];
    if(d.e === "eat" && G.ph === "night" && r === "wolf" && G.role[d.who] !== "wolf"){ G.wv[id] = d.who; G.dirty = true; }
    if(d.e === "see" && G.ph === "night" && r === "seer" && !G.sv){ G.sv = d.who; G.dirty = true; }
    if(d.e === "vote" && G.ph === "day"){ G.dv[id] = d.who; G.dirty = true; } },
  bot(){ return null; }, drop(G, id){ G.alive.delete(id); },
  snap(G){ const dead = G.ids.filter(id => !G.alive.has(id)); return { ph:G.ph, pe:+G.pend.toFixed(1), night:G.night, alive:[...G.alive], dead:Object.fromEntries(dead.map(id => [id, G.role[id]])), dv:G.ph === "day" || G.ph === "verdict" ? G.dv : {}, log:G.log.slice(-6), win:G.win || null, roles:G.win ? G.role : null, fx:G.fx }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, v = { fxSeen:0, role:null, pick:null, seen:{} };
    root.innerHTML = `<div class="ww"><div class="ww-role" id="wwRole">Getting your role…</div><div class="ww-ph" id="wwPh"></div><div class="ww-grid" id="wwGrid"></div><div class="ww-log" id="wwLog"></div></div>`;
    const grid = $("#wwGrid");
    v.ev = e => { if(e.t === "role"){ v.role = e.r; v.pack = e.pack; sfx.ding(); } if(e.t === "seen"){ v.seen[e.who] = e.wolf; toast(e.wolf ? `🔮 ${e.who} IS a werewolf! 🐺` : `🔮 ${e.who} is not a wolf`, 2600); sfx.coin(); } };
    grid.onclick = e => { const b = e.target.closest("[data-w]"); if(!b || !v.S) return; const s = v.S, w = b.dataset.w; if(!s.alive.includes(me) || !s.alive.includes(w) || w === me) return;
      if(s.ph === "night" && v.role === "wolf" && !(v.pack || []).includes(w)){ v.pick = w; ctx.input({ e:"eat", who:w }); sfx.vote(); }
      else if(s.ph === "night" && v.role === "seer" && !v.saw){ v.saw = s.night; v.pick = w; ctx.input({ e:"see", who:w }); sfx.vote(); }
      else if(s.ph === "day"){ v.pick = w; ctx.input({ e:"vote", who:w }); sfx.vote(); } v.k = ""; };
    v.update = s => { v.S = s; const tt = CM.phase === "play" ? now() - CM.playT : 0, left = Math.max(0, Math.ceil(s.pe - tt)), dead = !s.alive.includes(me);
      newFx(v, s.fx, (type, a, b) => { if(type === "eaten"){ sfx.lose(); if(a === me) SND.say("You were eaten!"); } if(type === "day"){ sfx.whistle(); v.pick = null; } if(type === "night"){ sfx.tick(); v.pick = null; v.saw = 0; SND.say("Night falls"); } if(type === "voted"){ sfx.boom(); } if(type === "over"){ sfx.crown(); } });
      root.firstChild.classList.toggle("night", s.ph === "night" || s.ph === "dawn");
      const rh = !v.role ? "Getting your role…" : `You are ${this.rname(v.role)}${v.role === "wolf" && v.pack && v.pack.length > 1 ? ` with <b>${v.pack.filter(x => x !== me).map(esc).join(", ")}</b>` : ""}${dead ? " · <b>👻 dead</b>" : ""}`; setHTML($("#wwRole"), rh);
      const act = dead ? "👻 You're out. Watch quietly!" : s.ph === "night" ? (v.role === "wolf" ? "🐺 Tap someone to eat" : v.role === "seer" ? (v.saw ? "🔮 Checked. Sleep tight…" : "🔮 Tap someone to check") : "😴 Sleeping…") : s.ph === "day" ? "🗳️ Argue in 💬 chat, tap who to vote out" : "";
      setHTML($("#wwPh"), s.ph === "over" ? `<b>${s.win === "vill" ? "🧑‍🌾 Villagers win!" : "🐺 Werewolves win!"}</b>` : `<b>${s.ph === "night" || s.ph === "dawn" ? "🌙 Night " + s.night : "☀️ Day " + s.night}</b> · ${left}s<br><small>${act}</small>`);
      const k = JSON.stringify([s.alive, s.dv, s.ph, v.pick, s.roles, Object.keys(v.seen)]); if(k !== v.k){ v.k = k;
        grid.innerHTML = Object.keys(CM.scores || {}).filter(id => playerOf(id)).map(id => { const al = s.alive.includes(id), r = s.roles ? s.roles[id] : s.dead[id] || (id === me ? v.role : (v.pack || []).includes(id) ? "wolf" : v.seen[id] === true ? "wolf" : v.seen[id] === false ? "safe" : null);
          const votes = Object.entries(s.dv).filter(([, w]) => w === id).map(([p]) => beanSVG(playerOf(p)?.bean, 14)).join("");
          return `<button class="ww-p ${al ? "" : "dead"} ${v.pick === id ? "mine" : ""}" data-w="${esc(id)}">${beanSVG(playerOf(id)?.bean, 40, { mood:al ? "" : "sad" })}<b>${esc(id)}${id === me ? " (you)" : ""}</b><small>${al ? "" : "💀 "}${r === "safe" ? "✅ not a wolf" : r ? this.rname(r) : ""}</small>${votes ? `<span class="ww-v">${votes}</span>` : ""}</button>`; }).join(""); }
      setHTML($("#wwLog"), s.log.map(l => `<p>${l}</p>`).join("")); };
    v.destroy = () => {}; return v; }
};

// ---------- MURDER MYSTERY ----------
const MM_W = 28, MM_H = 20, MM_PIL = [[-8, -5], [8, 5], [-8, 5], [8, -5], [0, 0], [-3.5, -7], [3.5, 7], [-12, 0], [12, 0], [0, -4.5], [0, 4.5]];
GAMES.murder = {
  name:"Murder Mystery", icon:"🔪", cat:"phys", desc:"One secret murderer. One sheriff. Survive!", dur:100, solo:true, min:3, noClock:false,
  how:["Secret roles: 🔪 <b>Murderer</b>, 🔫 <b>Sheriff</b>, or 😇 <b>Innocent</b>. Everyone gets 8 seconds to scatter","Murderer: get close and <b>STAB</b> (E). Sheriff: <b>SHOOT</b> (E) the way you're facing. Shoot an innocent and you die too!","Innocents win if the murderer is caught or time runs out. The murderer wins if everyone else is gone"],
  init(ids){ const s = shuffle(ids), role = {}; s.forEach((id, i) => role[id] = i === 0 ? "mur" : i === 1 ? "sher" : "inn");
    const B = physInit(ids, (i, n) => { const a = i / n * Math.PI * 2; return [Math.cos(a)*10, Math.sin(a)*7]; }); return { B, role, gun:s[1], drop:null, outs:[], knows:{}, info:{ n:ids.length } }; },
  introNote(){ return "Your secret role shows when it starts. Trust nobody 👀"; },
  tick(G, dt, inp, H){
    if(!G.sent){ G.sent = true; G.ids.forEach(id => H.to(id, { t:"role", r:G.role[id] })); }
    const live = id => G.B[id].alive, mur = G.ids.find(id => G.role[id] === "mur");
    physStep(G, dt, inp, { wall:{ w:MM_W, h:MM_H }, speed:7, floorH:() => 0, jumpV:8.5, act:(id, b) => { if(b.cd > 0) return;
      if(G.role[id] === "mur"){ if(G.t < 8) return; b.cd = 1.4; fxp(G, "stab", id); const vic = G.ids.find(k => k !== id && live(k) && Math.hypot(G.B[k].x - b.x, G.B[k].z - b.z) < 1.5); if(vic) this.kill(G, vic, id); return; }
      if(G.gun === id){ b.cd = 2.4; const fx = Math.sin(b.f), fz = Math.cos(b.f); let hit = null, hd = 14;
        G.ids.forEach(k => { if(k === id || !live(k)) return; const c = G.B[k], dx = c.x - b.x, dz = c.z - b.z, along = dx*fx + dz*fz; if(along < 0 || along > hd) return; if(Math.abs(-dx*fz + dz*fx) < .6){ hd = along; hit = k; } });
        const blocked = MM_PIL.some(([px, pz]) => { const dx = px - b.x, dz = pz - b.z, al = dx*fx + dz*fz; return al > 0 && al < hd && Math.abs(-dx*fz + dz*fx) < 1; });
        fxp(G, "shot", id, +(b.x + fx*(blocked ? 3 : hd)).toFixed(1), +(b.z + fz*(blocked ? 3 : hd)).toFixed(1)); if(!hit || blocked) return;
        if(G.role[hit] === "mur"){ this.kill(G, hit, id); G.hero = id; } else { this.kill(G, hit, id); this.kill(G, id, null); G.drop = { x:b.x, z:b.z }; G.gun = null; fxp(G, "oops", id, hit); } return; }
      if(b.cd <= 0){ b.dash = .25; b.cd = 1.1; b.vx = Math.sin(b.f)*12; b.vz = Math.cos(b.f)*12; fxp(G, "d", id); } } });
    G.ids.forEach(id => MM_PIL.forEach(([x, z]) => pushOutCirc(G.B[id], x, z, 1.55)));
    if(G.drop) G.ids.forEach(id => { if(G.drop && live(id) && G.role[id] !== "mur" && Math.hypot(G.B[id].x - G.drop.x, G.B[id].z - G.drop.z) < 1){ G.gun = id; G.drop = null; fxp(G, "gun", id); G.dirty = true; } });
    if(!live(mur)){ G.win = "inn"; H.end(this.timeout(G)); } else if(G.ids.every(id => id === mur || !live(id) || !playerOf(id))){ G.win = "mur"; H.end(this.timeout(G)); } },
  kill(G, id, by){ const b = G.B[id]; if(!b.alive) return; b.alive = false; G.outs.push(id); fxp(G, "kill", id, by || ""); G.dirty = true;
    G.ids.forEach(k => { const c = G.B[k]; if(by && G.role[by] === "mur" && c.alive && Math.hypot(c.x - b.x, c.z - b.z) < 9) (G.knows[k] = G.knows[k] || {})[by] = 1; }); },
  timeout(G){ const win = G.win || "inn", side = id => (G.role[id] === "mur") === (win === "mur"); return byScore(G.ids, id => (side(id) ? 10 : 0) + (G.B[id].alive ? 3 : 0) + (G.hero === id ? 4 : 0)); },
  drop(G, id){ if(G.B[id] && G.B[id].alive){ G.B[id].alive = false; G.outs.push(id); if(G.gun === id){ G.gun = null; G.drop = { x:G.B[id].x, z:G.B[id].z }; } } },
  bot(G, id){ const b = G.B[id]; if(!b || !b.alive) return null; const r = G.role[id], live = k => G.B[k].alive;
    if(r === "mur"){ let best = null, bs = 1e9; G.ids.forEach(k => { if(k === id || !live(k)) return; const c = G.B[k], crowd = G.ids.filter(q => q !== k && q !== id && live(q) && Math.hypot(G.B[q].x - c.x, G.B[q].z - c.z) < 5).length, d = Math.hypot(c.x - b.x, c.z - b.z) + crowd*6 + (G.gun === k ? 8 : 0); if(d < bs){ bs = d; best = k; } });
      if(!best) return { x:0, y:0 }; const c = G.B[best], d = Math.hypot(c.x - b.x, c.z - b.z); if(G.gun && G.gun !== best && G.B[G.gun] && Math.hypot(G.B[G.gun].x - b.x, G.B[G.gun].z - b.z) < 7){ const g = G.B[G.gun]; return toward(b, b.x - (g.x - b.x), b.z - (g.z - b.z)); } if(G.t < 8){ if(!b.wp || rand() < .01) b.wp = [(rand() - .5)*20, (rand() - .5)*14]; return toward(b, b.wp[0], b.wp[1], .6); } const o = toward(b, c.x, c.z); o.a = d < 1.4 && b.cd <= 0 && rand() < .3 ? 1 : 0; return o; }
    const known = Object.keys(G.knows[id] || {}).find(k => live(k));
    if(G.gun === id && known){ const c = G.B[known], d = Math.hypot(c.x - b.x, c.z - b.z), o = toward(b, c.x + c.vx*.2 + (rand() - .5)*1.5, c.z + c.vz*.2 + (rand() - .5)*1.5, d > 7 ? 1 : .25); b.aim = (b.aim || 0) + .034; o.a = d < 11 && b.cd <= 0 && b.aim > .9 && rand() < .06 ? 1 : 0; if(o.a) b.aim = 0; return o; }
    if(G.drop && r !== "mur" && Math.hypot(G.drop.x - b.x, G.drop.z - b.z) < 9) return toward(b, G.drop.x, G.drop.z);
    if(known){ const c = G.B[known]; return toward(b, b.x - (c.x - b.x), b.z - (c.z - b.z)); }
    if(!b.wp || Math.hypot(b.wp[0] - b.x, b.wp[1] - b.z) < 1 || rand() < .004) b.wp = [(rand() - .5)*(MM_W - 4), (rand() - .5)*(MM_H - 4)]; return toward(b, b.wp[0], b.wp[1], .7); },
  snap(G){ return { B:physSnap(G.B), gun:G.gun, drop:G.drop ? [+G.drop.x.toFixed(1), +G.drop.z.toFixed(1)] : null, fx:G.fx, roles:G.win ? G.role : null }; },
  view(root, ctx){ const me = ctx.me; return physView(root, ctx, { rot:true, sky:"#3a2a5a", sky2:"#8a6aa8", goo:"#4a2a6a", fog:"#6a5a8a", cam:[0, 21, 15], jump:true, btn:"…", pred:{ speed:7 } }, (S, v) => {
    floorBox(S, MM_W, MM_H, new THREE.MeshStandardMaterial({ map:cTex(256, 256, (x, w) => { for(let i=0;i<8;i++) for(let j=0;j<8;j++){ x.fillStyle = (i + j) % 2 ? "#e8d8c8" : "#c8b0a0"; x.fillRect(i*32, j*32, 32, 32); } }, [4, 3]), roughness:.7 })); wallRing(S, MM_W, MM_H, "#6a4a7a");
    MM_PIL.forEach(([x, z], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.2), new THREE.MeshStandardMaterial({ color:["#a87ad8", "#d87aa8", "#7aa8d8"][i % 3], roughness:.5 })); m.position.set(x, 1.2, z); m.castShadow = true; S.scene.add(m); });
    const gunM = new THREE.Group(), gm = new THREE.MeshStandardMaterial({ color:"#3a3a48", metalness:.7, roughness:.3 }); [[.1, .12, .5, 0, 0, .2], [.08, .25, .1, 0, -.12, 0]].forEach(([a, b, c, x, y, z]) => { const q = new THREE.Mesh(new THREE.BoxGeometry(a, b, c), gm); q.position.set(x, y, z); gunM.add(q); }); S.scene.add(gunM);
    const knife = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, .6), new THREE.MeshStandardMaterial({ color:"#e8e8f0", metalness:.9, roughness:.15 })); knife.visible = false; S.scene.add(knife); let kt = 0;
    const tracer = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1, 6), new THREE.MeshBasicMaterial({ color:"#ffe23a", transparent:true })); tracer.visible = false; S.scene.add(tracer); let trt = 0;
    const hud = raceHud(root);
    v.ev = e => { if(e.t === "role"){ v.role = e.r; ctlShow("stick", e.r === "mur" ? "STAB" : e.r === "sher" ? "SHOOT" : "DIVE", { jump:true }); SND.say(e.r === "mur" ? "You are the murderer" : e.r === "sher" ? "You are the sheriff" : "You are innocent"); } };
    v.extra = (id, b, s) => { if(!s[4]){ b.visible = true; b.rotation.z = Math.PI/2; b.position.y = .3; b.userData.body.children[0].material.opacity = .5; b.userData.body.children[0].material.transparent = true; } };
    v.tick = (s, dt) => { if(s.gun && S.beans.has(s.gun)){ const b = S.bean(s.gun); gunM.visible = true; gunM.position.set(b.position.x + Math.sin(b.rotation.y + .8)*.55, b.position.y + .7, b.position.z + Math.cos(b.rotation.y + .8)*.55); gunM.rotation.y = b.rotation.y; }
      else if(s.drop){ gunM.visible = true; gunM.position.set(s.drop[0], .3 + Math.sin(now()*4)*.1, s.drop[1]); gunM.rotation.y += dt*2; } else gunM.visible = false;
      kt -= dt; knife.visible = kt > 0; if(kt > 0 && v.kid && S.beans.has(v.kid)){ const b = S.bean(v.kid); knife.position.set(b.position.x + Math.sin(b.rotation.y)*.7, b.position.y + .7, b.position.z + Math.cos(b.rotation.y)*.7); knife.rotation.y = b.rotation.y; }
      trt -= dt; tracer.visible = trt > 0; tracer.material.opacity = Math.max(0, trt*4);
      if(v.role === "inn" && s.gun === me && v.lastGun !== me) ctlShow("stick", "SHOOT", { jump:true }); v.lastGun = s.gun;
      const alive = Object.values(s.B).filter(b => b[4]).length, mine = s.B[me]; const tt = CM.phase === "play" ? now() - CM.playT : 0; hud.innerHTML = !v.role ? "" : `<b>${v.role === "mur" ? "🔪 Murderer" : s.gun === me ? "🔫 Sheriff" : "😇 Innocent"}</b><span>${mine && !mine[4] ? "💀 You died" : tt < 8 ? (v.role === "mur" ? `Knife out in ${Math.ceil(8 - tt)}s…` : `Scatter! ${Math.ceil(8 - tt)}s`) : alive + " alive"}</span>`; };
    v.onFx = (type, a, b, c) => { if(type === "stab"){ v.kid = a; kt = .35; sfx.whoosh(); } else if(type === "kill"){ sfx.boom(); if(a === me) SND.say("You died!"); }
      else if(type === "shot"){ sfx.bang(); const sh = S.bean(a), x0 = sh.position.x, z0 = sh.position.z, len = Math.hypot(b - x0, c - z0); tracer.position.set((x0 + b)/2, .9, (z0 + c)/2); tracer.scale.y = len; tracer.rotation.set(Math.PI/2, 0, -Math.atan2(b - x0, c - z0)); tracer.rotation.order = "YXZ"; tracer.rotation.y = Math.atan2(b - x0, c - z0); tracer.rotation.x = Math.PI/2; trt = .25; }
      else if(type === "oops"){ toast(`😬 ${a} shot an innocent! The gun dropped…`, 2200); } else if(type === "gun"){ sfx.ding(); if(a === me) toast("🔫 You picked up the gun! You're the hero now", 2000); else toast(`🔫 ${a} picked up the gun!`, 1500); } else if(type === "j"){ if(a === me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};

// ---------- CAPTURE THE FLAG (teams) ----------
const CF_W = 32, CF_H = 18, CF_X = 13.5, CF_WIN = 3;
GAMES.ctf = {
  name:"Capture the Flag", icon:"🚩", cat:"phys", desc:"Steal their flag, bring it home", dur:150, solo:true, team:true, min:2,
  how:["Grab the other team's 🚩 flag and bring it back to <b>your base</b>","On their side, if an enemy <b>DIVES</b> into you you're <b>sent home</b> (and drop the flag!)","Touch your dropped flag to return it. First to 3 captures wins. <b>DIVE</b> (E) to tag, <b>JUMP</b> (Space)"],
  init(ids){ const T = teamSplit(ids), B = physInit(ids, () => [0, 0]); [0, 1].forEach(t => { const m = ids.filter(id => T[id] === t); m.forEach((id, i) => Object.assign(B[id], { x:(t ? 1 : -1)*(CF_X - 2.5), z:(i - (m.length - 1)/2)*2.2, f:t ? -Math.PI/2 : Math.PI/2 })); });
    const caps = {}, tags = {}; ids.forEach(id => { caps[id] = 0; tags[id] = 0; }); return { B, T, F:[0, 1].map(t => ({ st:"home", x:(t ? 1 : -1)*CF_X, z:0, by:null, t:0 })), score:[0, 0], caps, tags, outs:[], info:{ T } }; },
  introNote(info, me){ const t = info.T[me]; return t == null ? "" : `${teamNote(info, me)}. Your base is on the <b>${t ? "RIGHT" : "LEFT"}</b>`; },
  home(G, t){ Object.assign(G.F[t], { st:"home", x:(t ? 1 : -1)*CF_X, z:0, by:null }); },
  jail(G, id){ const b = G.B[id], t = G.T[id]; const f = G.F.find(f => f.by === id); if(f){ f.st = "drop"; f.by = null; f.x = b.x; f.z = b.z; f.t = G.t; fxp(G, "fdrop", id); }
    Object.assign(b, { x:(t ? 1 : -1)*(CF_X - 1), z:(rand() - .5)*4, vx:0, vz:0, stun:1.3 }); b.jail = G.t + 1.3; fxp(G, "jail", id); G.dirty = true; },
  tick(G, dt, inp, H){ const I = {}; G.ids.forEach(id => I[id] = (G.B[id].jail || 0) > G.t ? {} : inp[id] || {});
    G.ids.forEach(id => G.B[id].boost = G.F.some(f => f.by === id) ? .9 : 1);
    physStep(G, dt, I, { wall:{ w:CF_W, h:CF_H }, speed:7.2, dash:13.5, floorH:() => 0, jumpV:9,
      onTouch:(a, b) => { if(G.T[a] === G.T[b]) return; const side = id => Math.sign(G.B[id].x) === (G.T[id] ? -1 : 1); [[a, b], [b, a]].forEach(([x, y]) => { if(G.B[x].dash > 0 && side(y) && (G.B[y].jail || 0) < G.t - 1){ G.tags[x]++; this.jail(G, y); } }); } });
    G.ids.forEach(id => { const b = G.B[id], t = G.T[id]; if((b.jail || 0) > G.t) return;
      const ef = G.F[1 - t]; if(ef.st !== "carry" && Math.hypot(ef.x - b.x, ef.z - b.z) < 1.1 && !G.F.some(f => f.by === id)){ ef.st = "carry"; ef.by = id; fxp(G, "grab", id, 1 - t); G.dirty = true; }
      const of = G.F[t]; if(of.st === "drop" && Math.hypot(of.x - b.x, of.z - b.z) < 1.1){ this.home(G, t); fxp(G, "ret", id, t); G.dirty = true; }
      if(ef.by === id){ ef.x = b.x; ef.z = b.z; if(Math.hypot(b.x - (t ? 1 : -1)*CF_X, b.z) < 2.3){ G.score[t]++; G.caps[id]++; this.home(G, 1 - t); fxp(G, "cap", id, t); G.dirty = true; if(G.score[t] >= CF_WIN) H.end(this.timeout(G)); } } });
    G.F.forEach((f, t) => { if(f.st === "drop" && G.t - f.t > 9){ this.home(G, t); G.dirty = true; } }); },
  timeout(G){ return teamRank(G, winOf(G.score), id => G.caps[id]*5 + G.tags[id]); },
  drop(G, id){ const f = G.F.find(f => f.by === id); if(f){ f.st = "drop"; f.by = null; f.t = G.t; } },
  bot(G, id){ const b = G.B[id]; if(!b || (b.jail || 0) > G.t) return null; const t = G.T[id], sgn = t ? 1 : -1, ef = G.F[1 - t], of = G.F[t], mates = G.ids.filter(k => G.T[k] === t), role = mates.length >= 3 && mates.indexOf(id) === 0 ? "def" : "att";
    if(ef.by === id){ let r = toward(b, sgn*CF_X, 0); const [en, d] = nearest(G, id, k => G.T[k] !== t); if(en && d < 3.5){ const c = G.B[en]; r = toward(b, sgn*CF_X + (b.z > c.z ? 0 : 0), b.z + (b.z > c.z ? 3 : -3)); r.j = d < 1.6 && rand() < .2 ? 1 : 0; } return r; }
    if(of.st === "carry"){ const c = G.B[of.by], r = toward(b, c.x, c.z); r.a = Math.hypot(c.x - b.x, c.z - b.z) < 2.5 && rand() < .1 ? 1 : 0; return r; }
    if(of.st === "drop") return toward(b, of.x, of.z);
    const intr = G.ids.find(k => G.T[k] !== t && Math.sign(G.B[k].x) === sgn && Math.hypot(G.B[k].x - b.x, G.B[k].z - b.z) < (role === "def" ? 9 : 4));
    if(intr && Math.sign(b.x) === sgn){ const c = G.B[intr], r = toward(b, c.x + c.vx*.3, c.z + c.vz*.3), dd = Math.hypot(c.x - b.x, c.z - b.z); r.a = dd < 2.6 && dd > 1 && b.cd <= 0 && rand() < .08 ? 1 : 0; return r; }
    if(role === "def") return toward(b, sgn*(CF_X - 4), clamp(G.ids.filter(k => G.T[k] !== t).reduce((s, k) => s + G.B[k].z, 0) / Math.max(1, mates.length) * .5, -4, 4), .8);
    const [en, d] = nearest(G, id, k => G.T[k] !== t); if(b.lane == null || rand() < .003) b.lane = (rand() < .5 ? -1 : 1) * (2.5 + rand()*4.5); let r = Math.abs(b.x - ef.x) > 8 ? toward(b, ef.x*.4, b.lane) : toward(b, ef.x, ef.z); if(en && d < 3 && Math.sign(b.x) !== sgn){ const c = G.B[en]; r = toward(b, ef.x, b.z + (b.z > c.z ? 4 : -4)); r.j = d < 1.5 && rand() < .15 ? 1 : 0; } return r; },
  snap(G){ return { B:physSnap(G.B), F:G.F.map(f => [+f.x.toFixed(2), +f.z.toFixed(2), f.st === "carry" ? 2 : f.st === "drop" ? 1 : 0]), s:G.score, fx:G.fx }; },
  view(root, ctx){ const T = ctx.info.T, me = ctx.me; return physView(root, ctx, { rot:true, sky:"#8ad0ff", sky2:"#f0f8ff", goo:"#5ac85a", fog:"#e8f4ff", cam:[0, 23, 16], jump:true, pred:{ speed:7.2 } }, (S, v) => {
    floorBox(S, CF_W, CF_H, new THREE.MeshStandardMaterial({ map:cTex(512, 288, (x, w, h) => { x.fillStyle = "#ffd0e4"; x.fillRect(0, 0, w/2, h); x.fillStyle = "#d0e4ff"; x.fillRect(w/2, 0, w/2, h); x.fillStyle = "#fff"; x.fillRect(w/2 - 3, 0, 6, h);
      x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 5; [w*(16 - CF_X)/32, w*(16 + CF_X)/32].forEach(cx => { x.beginPath(); x.arc(cx, h/2, w*2.3/32, 0, 7); x.stroke(); }); }), roughness:.8 })); wallRing(S, CF_W, CF_H, "#ffffff");
    const flags = [0, 1].map(t => { const g = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.4, 8), new THREE.MeshStandardMaterial({ color:"#fff" })); pole.position.y = 1.2; g.add(pole);
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1, -.35); sh.lineTo(0, -.7); const cl = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color:TEAM_COL[t], side:THREE.DoubleSide, emissive:TEAM_COL[t], emissiveIntensity:.25 })); cl.position.y = 2.35; g.add(cl); g.userData.cl = cl; g.traverse(o => o.castShadow = true); S.scene.add(g); return g; });
    const hud = scoreHud(root);
    v.extra = (id, b) => teamMark(S, id, b, T[id]);
    v.tick = (s, dt, t) => { s.F.forEach((f, i) => { const g = flags[i]; if(f[2] === 2){ const carrier = Object.entries(s.B).find(([, b]) => Math.abs(b[0] - f[0]) < .05 && Math.abs(b[1] - f[1]) < .05); const bb = carrier ? S.bean(carrier[0]) : null; if(bb) g.position.set(bb.position.x - .3, bb.position.y + .6, bb.position.z); else g.position.set(f[0], .6, f[1]); }
        else g.position.set(f[0], 0, f[1]); g.userData.cl.rotation.y = Math.sin(t*3 + i)*.4; g.scale.setScalar(f[2] === 2 ? .7 : 1); });
      const myF = T[me] != null ? s.F[1 - T[me]] : null, carrying = myF && myF[2] === 2 && s.B[me] && Math.abs(s.B[me][0] - myF[0]) < .05;
      hud.innerHTML = teamScoreHTML(s.s[0] + "🚩", s.s[1] + "🚩", carrying ? "🏃 Bring it home!" : `First to ${CF_WIN}`); };
    v.onFx = (type, a, b) => { if(type === "grab"){ sfx.ding(); if(a === me) toast("🚩 You've got their flag! RUN HOME!", 1600); } else if(type === "cap"){ sfx.crown(); SND.say("Captured!"); } else if(type === "jail"){ sfx.whack(); if(a === me) toast("🚔 Tagged! Back to base", 1300); } else if(type === "ret"){ sfx.pop(); } else if(type === "fdrop"){ sfx.bump(); } else if(type === "j"){ if(a === me) sfx.boing(); } else physFx(type, a); };
    const d0 = v.destroy; v.destroy = () => { hud.remove(); d0(); };
  }); }
};
