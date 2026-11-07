// ===================== drop 4 (words + about each other, humans only): Funny Answers, Fake Facts, Doodle Duel, Who Said It?, Friend Quiz =====================
const humansOf = (ids, ctx) => ids.filter(id => !ctx.bots.includes(id));
const tLeft = end => Math.max(0, Math.ceil(end - (CM.phase === "play" ? now() - CM.playT : 0)));
const cleanTxt = (t, n = 60) => String(t || "").replace(/\s+/g, " ").trim().slice(0, n);
function wordShell(root, cls = ""){ root.innerHTML = `<div class="wd ${cls}"><div class="wd-top" id="wdTop"></div><div class="wd-main" id="wdMain"></div></div>`; return { top:$("#wdTop"), main:$("#wdMain") }; }
const setHTML = (el, h) => { if(el && el.dataset.h !== h){ el.dataset.h = h; el.innerHTML = h; } };
// a text box + send button; calls fn(text) once, then shows "locked in"
function answerBox(el, ph, fn, max = 60){ el.innerHTML = `<form class="dg-in wd-form"><input maxlength="${max}" placeholder="${esc(ph)}" autocomplete="off"><button class="btn small pink">Send</button></form>`;
  const f = el.querySelector("form"), i = el.querySelector("input"); setTimeout(() => i.focus(), 60);
  f.onsubmit = e => { e.preventDefault(); const t = cleanTxt(i.value, max); if(!t) return; if(fn(t) === false) return; f.outerHTML = `<p class="wd-locked">🔒 <b>${esc(t)}</b></p>`; sfx.vote(); }; }

// ---------- FUNNY ANSWERS ----------
const FUNNY = ["The worst thing to say at a wedding","A terrible name for a pet goldfish","What your teacher secretly does at weekends","The worst flavour of crisps ever","A rubbish superpower","What aliens would think of school","The worst thing to find in your sandwich","A bad name for a theme park ride","The real reason the chicken crossed the road","What dogs are actually thinking","The worst present for a nan","A horrible new rule for school","What's really at the bottom of the sea","The worst job in the world","A bad slogan for a toothpaste","What you shouldn't say to a police officer","The worst smell in the world","Something you'd never want to hear from a pilot","A terrible name for a band","What the Queen's corgis gossip about","The worst thing to shout in a library","A useless invention","What cats do when you're out","The worst first line of a love letter","A dodgy thing to sell on eBay","The weirdest pizza topping","What to never put in a microwave","A bad excuse for being late","The worst thing to bring to a sleepover","What a burger would say before being eaten"];
const FA_W = 25, FA_V = 15, FA_R = 8;
GAMES.funny = {
  name:"Funny Answers", icon:"😂", cat:"social", desc:"Write the funniest answer, everyone votes", dur:FA_W + FA_V + FA_R + 1, rate:4, minHumans:3, noClock:true,
  how:["Everyone gets the same silly prompt","Type the <b>funniest answer</b> you can think of","Vote for your favourite (not your own!). Most votes wins"],
  init(ids, ctx){ return { P:pick(FUNNY), H:humansOf(ids, ctx), ans:{}, votes:{}, ph:"write", info:{ H:humansOf(ids, ctx) } }; },
  tick(G, dt, inp, H){
    if(G.ph === "write" && (G.t >= FA_W || G.H.every(id => G.ans[id] != null || !playerOf(id)))){ G.ph = "vote"; G.vEnd = G.t + FA_V; G.list = shuffle(Object.keys(G.ans)).map(id => ({ id, a:G.ans[id] })); H.ev({ t:"list", list:G.list.map(x => x.a) }); G.dirty = true; }
    if(G.ph === "vote" && (G.t >= G.vEnd || G.H.every(id => G.votes[id] != null || !playerOf(id) || G.ans[id] == null && G.list.length < 2))){ G.ph = "rev"; G.rEnd = G.t + FA_R; G.dirty = true; }
    if(G.ph === "rev" && G.t >= G.rEnd) H.end(this.timeout(G)); },
  score(G, id){ return Object.values(G.votes).filter(i => G.list && G.list[i] && G.list[i].id === id).length; },
  timeout(G){ return byScore(G.H, id => this.score(G, id) * 2 + (G.ans[id] != null ? 1 : 0)); },
  onEvent(G, id, d){ if(!G.H.includes(id)) return; if(d.e === "ans" && G.ph === "write" && G.ans[id] == null){ G.ans[id] = cleanTxt(d.t); G.dirty = true; }
    if(d.e === "vote" && G.ph === "vote" && G.list[d.i | 0] && G.list[d.i | 0].id !== id){ G.votes[id] = d.i | 0; G.dirty = true; } },
  bot(){ return null; }, drop(){},
  snap(G){ return { P:G.P, ph:G.ph, n:Object.keys(G.ans).length, nv:Object.keys(G.votes).length, ve:+(G.vEnd || 0).toFixed(1), rev:G.ph === "rev" ? G.list.map((x, i) => ({ id:x.id, a:x.a, v:Object.values(G.votes).filter(k => k === i).length })) : null }; },
  view(root, ctx){ ctlShow(null); const { top, main } = wordShell(root), me = ctx.me, isH = ctx.info.H.includes(me), v = { ph:"", list:[] };
    v.ev = e => { if(e.t === "list"){ v.list = e.list; } };
    v.update = s => { setHTML(top, `<small>Funny Answers</small><b>${esc(s.P)}</b>`);
      if(s.ph !== v.ph || s.ph === "vote" && v.list.length && !v.drawnList){ v.ph = s.ph;
        if(s.ph === "write"){ if(isH) answerBox(main, "Your funniest answer…", t => ctx.input({ e:"ans", t })); else main.innerHTML = `<p class="wd-wait">Watching the humans write… 🍿</p>`; }
        if(s.ph === "vote"){ if(!v.list.length) return; v.drawnList = true; main.innerHTML = `<p class="wd-sub">Vote for the funniest!</p><div class="wd-opts">${v.list.map((a, i) => `<button class="wd-opt" data-i="${i}">${esc(a)}</button>`).join("")}</div>`;
          main.onclick = e => { const b = e.target.closest("[data-i]"); if(!b || !isH || v.voted) return; v.voted = true; b.classList.add("mine"); ctx.input({ e:"vote", i:+b.dataset.i }); sfx.vote(); }; sfx.pop(); }
        if(s.ph === "rev" && s.rev){ const mx = Math.max(...s.rev.map(r => r.v)); main.innerHTML = `<div class="wd-opts">${s.rev.slice().sort((a, b) => b.v - a.v).map(r => `<div class="wd-opt rev ${r.v === mx && mx > 0 ? "win" : ""}">${r.v === mx && mx > 0 ? "👑 " : ""}${esc(r.a)}<small>${nameChip(r.id, 16)} · ${r.v} vote${r.v === 1 ? "" : "s"}</small></div>`).join("")}</div>`; sfx.crown(); } }
      const st = $(".wd-sub"); if(st && s.ph === "vote") st.textContent = `Vote for the funniest! ${tLeft(s.ve)}s · ${s.nv} voted`;
      if(s.ph === "write"){ const w = $("#wdWait") || (() => { const d = document.createElement("p"); d.id = "wdWait"; d.className = "wd-sub"; main.appendChild(d); return d; })(); w.textContent = `${tLeft(FA_W)}s · ${s.n}/${ctx.info.H.length} answered`; } };
    v.destroy = () => {}; return v; }
};

// ---------- FAKE FACTS ----------
const FACTS = [["A group of flamingos is called a ____.", "flamboyance"], ["A baby kangaroo is called a ____.", "joey"], ["The national animal of Scotland is the ____.", "unicorn"], ["Octopuses have ____ hearts.", "three|3"],
  ["A group of crows is called a ____.", "murder"], ["The dot over a lowercase i is called a ____.", "tittle"], ["Wombat poo is shaped like ____.", "cubes|cube|squares|square"], ["The plastic tip on the end of a shoelace is called an ____.", "aglet"],
  ["A group of owls is called a ____.", "parliament"], ["Sharks have been around longer than ____.", "trees|tree"], ["The first thing ever sold on eBay was a broken ____.", "laser pointer|laserpointer"], ["In Switzerland it's illegal to own just one ____.", "guinea pig|guineapig"],
  ["A day on Venus is longer than a ____ on Venus.", "year"], ["The Eiffel Tower gets about 15cm taller in ____.", "summer"], ["A group of pugs is called a ____.", "grumble"], ["Sea otters hold ____ while they sleep.", "hands|hand"],
  ["Peanuts aren't nuts, they're ____.", "legumes|legume|beans|bean"], ["Bananas are technically ____.", "berries|berry"], ["Butterflies taste things with their ____.", "feet|foot"], ["In the 1830s, ketchup was sold as ____.", "medicine"],
  ["A 'jiffy' is an actual unit of ____.", "time"], ["The man who designed the Frisbee had his ashes made into ____.", "frisbees|frisbee"], ["A group of hedgehogs is called a ____.", "prickle"], ["Cows have best ____.", "friends|friend"],
  ["The longest English word without a, e, i, o or u is ____.", "rhythms"], ["Scotland has over 400 words for ____.", "snow"], ["Honey stored properly basically never ____.", "spoils|goes off|rots|expires"], ["A shrimp's heart is in its ____.", "head"]];
const FF_W = 22, FF_P = 16, FF_R = 8;
const factOK = (ans, t) => ans.split("|").some(a => sameWord(a, t));
GAMES.fakefacts = {
  name:"Fake Facts", icon:"🤥", cat:"social", desc:"Fool everyone with a fake answer", dur:FF_W + FF_P + FF_R + 1, rate:4, minHumans:3, noClock:true,
  how:["A weird but TRUE fact with a blank","Make up a believable fake answer to trick everyone","Then find the REAL answer. +2 for the truth, +1 for everyone you fool"],
  init(ids, ctx){ const F = pick(FACTS); return { F, H:humansOf(ids, ctx), lie:{}, pick:{}, ph:"write", info:{ q:F[0], H:humansOf(ids, ctx) } }; },
  tick(G, dt, inp, H){
    if(G.ph === "write" && (G.t >= FF_W || G.H.every(id => G.lie[id] != null || !playerOf(id)))){ G.ph = "pick"; G.pEnd = G.t + FF_P; const seen = new Set([normW(G.F[1].split("|")[0])]), opts = [{ a:G.F[1].split("|")[0], by:null }];
      Object.entries(G.lie).forEach(([id, a]) => { const k = normW(a); if(!seen.has(k)){ seen.add(k); opts.push({ a, by:[id] }); } else { const o = opts.find(o => normW(o.a) === k && o.by); if(o) o.by.push(id); } }); G.opts = shuffle(opts); H.ev({ t:"opts", opts:G.opts.map(o => o.a) }); G.dirty = true; }
    if(G.ph === "pick" && (G.t >= G.pEnd || G.H.every(id => G.pick[id] != null || !playerOf(id)))){ G.ph = "rev"; G.rEnd = G.t + FF_R; G.dirty = true; }
    if(G.ph === "rev" && G.t >= G.rEnd) H.end(this.timeout(G)); },
  score(G, id){ let s = 0; const p = G.pick[id]; if(p != null && G.opts[p] && !G.opts[p].by) s += 2; Object.entries(G.pick).forEach(([k, i]) => { const o = G.opts[i]; if(k !== id && o && o.by && o.by.includes(id)) s++; }); return s; },
  timeout(G){ if(!G.opts) return [G.H]; return byScore(G.H, id => this.score(G, id)); },
  onEvent(G, id, d, H){ if(!G.H.includes(id)) return;
    if(d.e === "lie" && G.ph === "write" && G.lie[id] == null){ const t = cleanTxt(d.t, 30); if(factOK(G.F[1], t)){ H.to(id, { t:"truth" }); return; } G.lie[id] = t; G.dirty = true; H.to(id, { t:"ok" }); }
    if(d.e === "pick" && G.ph === "pick" && G.pick[id] == null){ const o = G.opts[d.i | 0]; if(!o || o.by && o.by.includes(id)) return; G.pick[id] = d.i | 0; G.dirty = true; } },
  bot(){ return null; }, drop(){},
  snap(G){ return { ph:G.ph, n:Object.keys(G.lie).length, np:Object.keys(G.pick).length, pe:+(G.pEnd || 0).toFixed(1), rev:G.ph === "rev" ? { opts:G.opts, pick:G.pick, sc:Object.fromEntries(G.H.map(id => [id, this.score(G, id)])) } : null }; },
  view(root, ctx){ ctlShow(null); const { top, main } = wordShell(root), me = ctx.me, isH = ctx.info.H.includes(me), v = { ph:"", opts:null, mine:null };
    setHTML(top, `<small>Fake Facts</small><b>${esc(ctx.info.q).replace("____", "<u>_____</u>")}</b>`);
    v.ev = e => { if(e.t === "opts") v.opts = e.opts; if(e.t === "truth"){ toast("😲 That's the REAL answer! Make up a fake one", 2200); sfx.wrong(); if(isH) answerBox(main, "A believable FAKE answer…", t => { v.mine = t; ctx.input({ e:"lie", t }); }, 30); } };
    v.update = s => {
      if(s.ph !== v.ph || s.ph === "pick" && v.opts && !v.drawn){ v.ph = s.ph;
        if(s.ph === "write"){ if(isH) answerBox(main, "A believable FAKE answer…", t => { v.mine = t; ctx.input({ e:"lie", t }); }, 30); else main.innerHTML = `<p class="wd-wait">The humans are writing lies… 🤥</p>`; }
        if(s.ph === "pick"){ if(!v.opts) return; v.drawn = true; main.innerHTML = `<p class="wd-sub" id="wdSub"></p><div class="wd-opts">${v.opts.map((a, i) => `<button class="wd-opt ${v.mine && normW(a) === normW(v.mine) ? "own" : ""}" data-i="${i}">${esc(a)}${v.mine && normW(a) === normW(v.mine) ? "<small>your lie</small>" : ""}</button>`).join("")}</div>`;
          main.onclick = e => { const b = e.target.closest("[data-i]"); if(!b || !isH || v.picked || b.classList.contains("own")) return; v.picked = true; b.classList.add("mine"); ctx.input({ e:"pick", i:+b.dataset.i }); sfx.vote(); }; }
        if(s.ph === "rev" && s.rev){ const R = s.rev; main.innerHTML = `<div class="wd-opts">${R.opts.map((o, i) => { const who = Object.entries(R.pick).filter(([, k]) => k === i).map(([p]) => beanSVG(playerOf(p)?.bean, 16)).join("");
            return `<div class="wd-opt rev ${o.by ? "lie" : "win"}">${o.by ? "🤥" : "✅"} ${esc(o.a)}<small>${o.by ? "Lie by " + o.by.map(id => esc(id)).join(", ") : "THE TRUTH"} ${who ? "· picked by " + who : ""}</small></div>`; }).join("")}</div><p class="wd-sub">You scored <b>${R.sc[me] || 0}</b></p>`; sfx.crown(); } }
      if(s.ph === "pick"){ const st = $("#wdSub"); if(st) st.textContent = `Which one is TRUE? ${tLeft(s.pe)}s · ${s.np} picked`; }
      if(s.ph === "write"){ const w = $("#wdWait") || (() => { const d = document.createElement("p"); d.id = "wdWait"; d.className = "wd-sub"; main.appendChild(d); return d; })(); w.textContent = `${tLeft(FF_W)}s · ${s.n}/${ctx.info.H.length} lies written`; } };
    v.destroy = () => {}; return v; }
};

// ---------- DOODLE DUEL ----------
const DOODLES = ["a cat on a skateboard","the world's ugliest dog","a robot eating spaghetti","your teacher as a superhero","a shark in a bathtub","a dinosaur at the dentist","a very angry potato","a snowman on holiday","a giraffe in a tiny car","a pirate cow","a burger with legs","a ghost doing homework","a penguin at the beach","an alien ordering pizza","a horse playing football","a sad sandwich","a monkey DJ","a frog wedding","a dragon with a cold","a bean winning a trophy"];
const DD_D = 25, DD_V = 12, DD_R = 6;
GAMES.doodle = {
  name:"Doodle Duel", icon:"🖍️", cat:"draw", desc:"Two artists, one prompt, everyone votes", dur:DD_D + DD_V + DD_R + 1, rate:4, minHumans:3, noClock:true,
  how:["Two players draw the same prompt at the same time","Everyone else watches the clock… then votes for the best one","Winner takes the round! Voting for the winner scores too"],
  init(ids, ctx){ const H = humansOf(ids, ctx), min = Math.min(...H.map(h => ctx.drawn[h] || 0)), pool = shuffle(H).sort((a, b) => (ctx.drawn[a] || 0) - (ctx.drawn[b] || 0)), D = pool.slice(0, 2); D.forEach(d => ctx.drawn[d] = (ctx.drawn[d] || 0) + 1);
    return { P:pick(DOODLES), D, H, st:{ [D[0]]:[], [D[1]]:[] }, votes:{}, ph:"draw", info:{ D, P:null } }; },
  introNote(info, me){ return info.D.includes(me) ? "🖍️ <b>You're drawing!</b> The prompt appears when it starts" : `🖍️ <b>${esc(info.D[0])}</b> vs <b>${esc(info.D[1])}</b>. You'll be judging!`; },
  tick(G, dt, inp, H){ if(!G.sent){ G.sent = true; H.ev({ t:"prompt", p:G.P }); }
    if(G.ph === "draw" && G.t >= DD_D){ G.ph = "vote"; G.vEnd = G.t + DD_V; H.ev({ t:"show", st:G.st }); G.dirty = true; }
    const voters = G.H.filter(id => !G.D.includes(id) && playerOf(id));
    if(G.ph === "vote" && (G.t >= G.vEnd || voters.every(id => G.votes[id] != null))){ G.ph = "rev"; G.rEnd = G.t + DD_R; G.dirty = true; }
    if(G.ph === "rev" && G.t >= G.rEnd) H.end(this.timeout(G)); },
  tally(G){ const c = [0, 0]; Object.values(G.votes).forEach(i => c[i]++); return c; },
  timeout(G){ const c = this.tally(G), w = c[0] === c[1] ? -1 : c[0] > c[1] ? 0 : 1, voters = G.H.filter(id => !G.D.includes(id));
    if(w < 0) return [G.D, voters]; return [[G.D[w]], voters.filter(id => G.votes[id] === w), voters.filter(id => G.votes[id] !== w), [G.D[1 - w]]].filter(g => g.length); },
  onEvent(G, id, d){ if(d.e === "pts" && G.ph === "draw" && G.D.includes(id)){ const st = padIn(G.st[id], d, 2500); if(st) st.o = id; }
    if(d.e === "vote" && G.ph === "vote" && G.H.includes(id) && !G.D.includes(id)){ G.votes[id] = d.i ? 1 : 0; G.dirty = true; } },
  bot(){ return null; }, drop(){},
  snap(G){ return { ph:G.ph, ve:+(G.vEnd || 0).toFixed(1), nv:Object.keys(G.votes).length, c:G.ph === "rev" ? this.tally(G) : null }; },
  view(root, ctx){ ctlShow(null); const me = ctx.me, D = ctx.info.D, meDraw = D.includes(me), v = { ph:"" };
    root.innerHTML = `<div class="pg"><div class="pg-top" id="ddTop">Get ready…</div><div class="pg-main" id="ddMain"></div></div>`; const top = $("#ddTop"), main = $("#ddMain");
    v.ev = e => { if(e.t === "prompt"){ v.p = e.p; sfx.ding(); }
      if(e.t === "show"){ main.innerHTML = `<div class="dd-pair">${D.map((d, i) => `<button class="dd-card" data-i="${i}"><canvas width="1000" height="1000" id="ddc${i}"></canvas><span class="dd-name">${meDraw ? nameChip(d, 18) : "Drawing " + (i ? "B" : "A")}</span></button>`).join("")}</div><p class="wd-sub" id="ddSub"></p>`;
        D.forEach((d, i) => makePad($("#ddc" + i)).redraw(e.st[d] || [])); sfx.pop();
        main.onclick = ev => { const b = ev.target.closest("[data-i]"); if(!b || meDraw || v.voted || !ctx.info || !playerOf(me) || playerOf(me).bot) return; v.voted = true; b.classList.add("mine"); ctx.input({ e:"vote", i:+b.dataset.i }); sfx.vote(); }; } };
    v.update = s => {
      if(s.ph === "draw" && v.ph !== "draw" && CM.phase === "play"){ v.ph = "draw";
        if(meDraw){ main.innerHTML = `<div class="pg-board"><canvas id="ddCan" width="1000" height="1000"></canvas><div class="pad-tools" id="ddTools"></div></div>`; makePad($("#ddCan"), { edit:true, send:ctx.input, can:() => CM.phase === "play" && v.ph === "draw" }).tools($("#ddTools")); }
        else main.innerHTML = `<p class="wd-wait">🖍️ ${esc(D[0])} and ${esc(D[1])} are drawing…<br><small>Get ready to judge!</small></p>`; }
      if(s.ph === "vote" && v.ph !== "vote"){ v.ph = "vote"; }
      setHTML(top, s.ph === "draw" ? `Draw: <b class="dg-word">${esc(v.p || "…")}</b> <span class="pg-t">${tLeft(DD_D)}</span>` : s.ph === "vote" ? `Which is better: <b>${esc(v.p || "")}</b>? <span class="pg-t">${tLeft(s.ve)}</span>` : `🏆 Results`);
      const sub = $("#ddSub"); if(sub && s.ph === "vote") sub.textContent = meDraw ? "Fingers crossed… 🤞" : v.voted ? `Voted! ${s.nv} in` : "Tap the best drawing!";
      if(s.ph === "rev" && s.c && v.ph !== "rev"){ v.ph = "rev"; const w = s.c[0] === s.c[1] ? -1 : s.c[0] > s.c[1] ? 0 : 1;
        $$(".dd-card").forEach((c, i) => { c.classList.toggle("win", i === w); c.querySelector(".dd-name").innerHTML = `${nameChip(D[i], 18)} · ${s.c[i]} vote${s.c[i] === 1 ? "" : "s"} ${i === w ? "👑" : ""}`; }); if(sub) sub.textContent = w < 0 ? "It's a tie!" : `${D[w]} wins!`; sfx.crown(); } };
    v.destroy = () => {}; return v; }
};

// ---------- WHO SAID IT? ----------
const WHO_Q = ["What would you do with a million pounds?","What's your most useless talent?","What's the weirdest food you actually like?","What would your last meal be?","What's your secret guilty pleasure?","If you were an animal, what would you be?","What's the worst present you've ever got?","Which celebrity would you swap lives with for a day?","What's the most embarrassing thing in your room?","What would your superhero name be?","What's your biggest pet hate?","What's the first thing you'd do if you were invisible?","What job would you be terrible at?","What's your go-to karaoke song?","What's a weird habit you have?","If you could only eat one food forever, what would it be?"];
const WS_W = 22, WS_G = 25, WS_R = 9;
GAMES.whosaid = {
  name:"Who Said It?", icon:"🕵️‍♀️", cat:"social", desc:"Answer about yourself, guess who wrote what", dur:WS_W + WS_G + WS_R + 1, rate:4, minHumans:3, noClock:true,
  how:["Everyone answers the same question about themselves","Then guess who wrote each answer","+1 for every right guess. Sneaky answers that fool people score too!"],
  init(ids, ctx){ const Q = pick(WHO_Q), H = humansOf(ids, ctx); return { Q, H, ans:{}, gs:{}, ph:"write", info:{ q:Q, H } }; },
  tick(G, dt, inp, H){
    if(G.ph === "write" && (G.t >= WS_W || G.H.every(id => G.ans[id] != null || !playerOf(id)))){ G.ph = "guess"; G.gEnd = G.t + WS_G; G.list = shuffle(Object.keys(G.ans)).map(id => ({ id, a:G.ans[id] })); H.ev({ t:"list", list:G.list.map(x => x.a), who:G.list.map(x => x.id).sort() }); G.dirty = true; }
    if(G.ph === "guess" && (G.t >= G.gEnd || G.H.every(id => G.gs[id] || !playerOf(id)))){ G.ph = "rev"; G.rEnd = G.t + WS_R; G.dirty = true; }
    if(G.ph === "rev" && G.t >= G.rEnd) H.end(this.timeout(G)); },
  score(G, id){ let s = 0; const g = G.gs[id] || {}; (G.list || []).forEach((x, i) => { if(x.id !== id && g[i] === x.id) s++; });
    const mine = (G.list || []).findIndex(x => x.id === id); if(mine >= 0) Object.entries(G.gs).forEach(([k, gg]) => { if(k !== id && gg[mine] && gg[mine] !== id) s += .5; }); return s; },
  timeout(G){ return byScore(G.H, id => Math.round(this.score(G, id) * 2)); },
  onEvent(G, id, d){ if(!G.H.includes(id)) return; if(d.e === "ans" && G.ph === "write" && G.ans[id] == null){ G.ans[id] = cleanTxt(d.t); G.dirty = true; }
    if(d.e === "guess" && G.ph === "guess" && d.g && typeof d.g === "object"){ const g = {}; Object.entries(d.g).forEach(([i, w]) => { if(G.list[i | 0] && G.H.includes(w)) g[i | 0] = w; }); G.gs[id] = g; G.dirty = true; } },
  bot(){ return null; }, drop(){},
  snap(G){ return { ph:G.ph, n:Object.keys(G.ans).length, ng:Object.keys(G.gs).length, ge:+(G.gEnd || 0).toFixed(1), rev:G.ph === "rev" ? { list:G.list, gs:G.gs, sc:Object.fromEntries(G.H.map(id => [id, this.score(G, id)])) } : null }; },
  view(root, ctx){ ctlShow(null); const { top, main } = wordShell(root), me = ctx.me, isH = ctx.info.H.includes(me), v = { ph:"", g:{} };
    setHTML(top, `<small>Who Said It?</small><b>${esc(ctx.info.q)}</b>`);
    v.ev = e => { if(e.t === "list"){ v.list = e.list; v.who = e.who; } };
    v.update = s => {
      if(s.ph !== v.ph || s.ph === "guess" && v.list && !v.drawn){ v.ph = s.ph;
        if(s.ph === "write"){ if(isH) answerBox(main, "Your honest answer…", t => { v.mine = t; ctx.input({ e:"ans", t }); }); else main.innerHTML = `<p class="wd-wait">The humans are answering… 🤫</p>`; }
        if(s.ph === "guess" && v.list){ v.drawn = true; const opts = v.who.filter(w => w !== me);
          main.innerHTML = `<p class="wd-sub" id="wsSub"></p><div class="ws-list">${v.list.map((a, i) => a === v.mine ? `<div class="ws-row own"><span>“${esc(a)}”</span><i>you</i></div>` : `<label class="ws-row"><span>“${esc(a)}”</span><select data-i="${i}" ${isH ? "" : "disabled"}><option value="">Who?</option>${opts.map(w => `<option>${esc(w)}</option>`).join("")}</select></label>`).join("")}</div>${isH ? `<button class="btn pink" id="wsGo">Lock in guesses</button>` : ""}`;
          main.onchange = e => { const sl = e.target.closest("select"); if(!sl) return; v.g[sl.dataset.i] = sl.value; sfx.click(); };
          const go = $("#wsGo"); if(go) go.onclick = () => { ctx.input({ e:"guess", g:v.g }); go.disabled = true; go.textContent = "Locked in 🔒"; $$(".ws-list select").forEach(x => x.disabled = true); sfx.vote(); }; }
        if(s.ph === "rev" && s.rev){ const R = s.rev, mg = R.gs[me] || {}; main.innerHTML = `<div class="ws-list">${R.list.map((x, i) => { const right = Object.values(R.gs).filter(g => g[i] === x.id).length;
            return `<div class="ws-row rev ${x.id === me ? "own" : mg[i] == null ? "" : mg[i] === x.id ? "ok" : "no"}"><span>“${esc(x.a)}”</span><b>${nameChip(x.id, 18)}</b><small>${right} guessed right</small></div>`; }).join("")}</div><p class="wd-sub">You scored <b>${R.sc[me] || 0}</b></p>`; sfx.crown(); } }
      if(s.ph === "guess"){ const st = $("#wsSub"); if(st) st.textContent = `Match each answer to a player · ${tLeft(s.ge)}s · ${s.ng} locked in`; }
      if(s.ph === "write"){ const w = $("#wdWait") || (() => { const d = document.createElement("p"); d.id = "wdWait"; d.className = "wd-sub"; main.appendChild(d); return d; })(); w.textContent = `${tLeft(WS_W)}s · ${s.n}/${ctx.info.H.length} answered`; } };
    v.destroy = () => {}; return v; }
};

// ---------- FRIEND QUIZ ----------
const FQ = [["favourite season", ["🌸 Spring", "☀️ Summer", "🍂 Autumn", "❄️ Winter"]], ["pick for a pet", ["🐶 Dog", "🐱 Cat", "🐠 Fish", "🦎 Lizard"]], ["dream holiday", ["🏖️ Beach", "🏔️ Mountains", "🏙️ Big city", "🏕️ Camping"]],
  ["superpower choice", ["🦸 Flying", "👻 Invisibility", "⚡ Super speed", "🧠 Mind reading"]], ["best pizza topping", ["🍍 Pineapple", "🍕 Pepperoni", "🧀 Just cheese", "🍄 Mushroom"]], ["perfect weekend", ["🎮 Gaming", "⚽ Sport", "😴 Sleeping", "🛍️ Shopping"]],
  ["breakfast pick", ["🥣 Cereal", "🍳 Full English", "🥞 Pancakes", "🙅 Skip it"]], ["type of film", ["😂 Comedy", "😱 Horror", "💥 Action", "🥲 Rom-com"]], ["morning or night", ["🌅 Early bird", "🦉 Night owl", "😴 Both… I'm tired", "🤷 Depends"]],
  ["drink of choice", ["🥤 Fizzy drink", "🧃 Juice", "☕ Tea/coffee", "💧 Water"]], ["school subject", ["➗ Maths", "🎨 Art", "🏃 PE", "🧪 Science"]], ["sweet treat", ["🍫 Chocolate", "🍬 Sweets", "🍦 Ice cream", "🍪 Biscuits"]]];
const FQ_A = 10, FQ_G = 10, FQ_R = 6, FQ_ONE = FQ_A + FQ_G + FQ_R;
GAMES.friendquiz = {
  name:"Friend Quiz", icon:"🤝", cat:"social", desc:"How well do you know your friends?", dur:FQ_ONE*2 + 1, rate:4, minHumans:3, noClock:true,
  how:["One player is in the 🔥 <b>hot seat</b> and secretly answers a question about themselves","Everyone else guesses what they picked","+2 for a right guess. The hot seat scores when people know them! Two rounds"],
  init(ids, ctx){ const H = humansOf(ids, ctx), seats = shuffle(H).slice(0, 2), qs = shuffle(FQ).slice(0, 2); return { H, seats, qs, qi:0, ph:"ans", pend:FQ_A, a:null, gs:{}, pts:{}, res:[], info:{ seats, qs, H } }; },
  introNote(info, me){ return info.seats.includes(me) ? "🔥 You'll be in the hot seat this round!" : `🔥 ${info.seats.map(esc).join(" then ")} in the hot seat`; },
  tick(G, dt, inp, H){ const seat = G.seats[G.qi];
    if(G.ph === "ans" && (G.t >= G.pend || G.a != null)){ if(G.a == null) G.a = -1; G.ph = "guess"; G.pend = G.t + FQ_G; G.dirty = true; }
    else if(G.ph === "guess" && (G.t >= G.pend || G.H.every(id => id === seat || G.gs[id] != null || !playerOf(id)))){ G.ph = "rev"; G.pend = G.t + FQ_R; const ok = Object.entries(G.gs).filter(([, g]) => g === G.a).map(([id]) => id);
      ok.forEach(id => G.pts[id] = (G.pts[id] || 0) + 2); G.pts[seat] = (G.pts[seat] || 0) + ok.length; G.res.push({ a:G.a, gs:G.gs }); G.dirty = true; }
    else if(G.ph === "rev" && G.t >= G.pend){ if(G.qi + 1 >= G.seats.length){ H.end(this.timeout(G)); return; } G.qi++; G.ph = "ans"; G.pend = G.t + FQ_A; G.a = null; G.gs = {}; G.dirty = true; } },
  timeout(G){ return byScore(G.H, id => G.pts[id] || 0); },
  onEvent(G, id, d){ const seat = G.seats[G.qi]; if(d.e === "a" && G.ph === "ans" && id === seat && G.a == null){ G.a = clamp(d.i | 0, 0, 3); G.dirty = true; }
    if(d.e === "g" && G.ph === "guess" && id !== seat && G.H.includes(id) && G.gs[id] == null){ G.gs[id] = clamp(d.i | 0, 0, 3); G.dirty = true; } },
  bot(){ return null; }, drop(){},
  snap(G){ return { qi:G.qi, ph:G.ph, pe:+G.pend.toFixed(1), ng:Object.keys(G.gs).length, res:G.res[G.qi] && G.ph === "rev" ? G.res[G.qi] : null, pts:G.pts }; },
  view(root, ctx){ ctlShow(null); const { top, main } = wordShell(root), me = ctx.me, I = ctx.info, isH = I.H.includes(me), v = { k:"" };
    v.update = s => { const seat = I.seats[s.qi], Q = I.qs[s.qi], hot = seat === me, k = s.qi + s.ph;
      setHTML(top, `<small>Friend Quiz · ${s.qi + 1}/${I.seats.length}</small><span>🔥 <b>${esc(seat)}</b>'s ${esc(Q[0])}?</span>`);
      if(k !== v.k){ v.k = k; v.pick = null;
        const opts = (cls, dis) => `<div class="fq-opts">${Q[1].map((o, i) => `<button class="fq-o ${cls}" data-i="${i}" ${dis ? "disabled" : ""}>${o}</button>`).join("")}</div>`;
        if(s.ph === "ans") main.innerHTML = hot ? `<p class="wd-sub">Pick YOUR real answer (secretly!)</p>${opts("")}<p class="wd-sub" id="fqT"></p>` : `<div class="fq-seat">${beanSVG(playerOf(seat)?.bean, 80)}<p>${esc(seat)} is choosing… 🤔</p></div><p class="wd-sub" id="fqT"></p>`;
        if(s.ph === "guess") main.innerHTML = hot ? `<div class="fq-seat">${beanSVG(playerOf(seat)?.bean, 80, { mood:"happy" })}<p>Everyone's guessing your answer… 😏</p></div><p class="wd-sub" id="fqT"></p>` : isH ? `<p class="wd-sub">What did ${esc(seat)} pick?</p>${opts("")}<p class="wd-sub" id="fqT"></p>` : `<p class="wd-wait">Humans are guessing…</p>`;
        if(s.ph === "rev" && s.res){ const R = s.res; main.innerHTML = `<div class="fq-opts">${Q[1].map((o, i) => `<div class="fq-o ${R.a === i ? "right" : ""}">${o}<span class="fq-who">${Object.entries(R.gs).filter(([, g]) => g === i).map(([p]) => beanSVG(playerOf(p)?.bean, 18)).join("")}</span></div>`).join("")}</div><p class="wd-sub">${R.a < 0 ? `${esc(seat)} didn't answer! 😴` : `${esc(seat)} picked <b>${Q[1][R.a]}</b>`}</p>`; sfx.ding(); }
        main.onclick = e => { const b = e.target.closest(".fq-o[data-i]"); if(!b || v.pick != null || b.disabled) return; v.pick = +b.dataset.i; b.classList.add("mine"); ctx.input({ e:s.ph === "ans" ? "a" : "g", i:v.pick }); sfx.vote(); $$(".fq-o[data-i]").forEach(x => x.disabled = true); }; }
      const ft = $("#fqT"); if(ft) ft.textContent = `${tLeft(s.pe)}s${s.ph === "guess" ? ` · ${s.ng} guessed` : ""}`; };
    v.destroy = () => {}; return v; }
};
