// cpk server: one Hub (accounts, friends, history, shop, public room list) + one Room per room code (live relay).
import { DurableObject } from "cloudflare:workers";

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const NAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const CODE_RE = /^[A-Z]{4}$/;
const enc = new TextEncoder();
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", enc.encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");

// The clothes shop lives here too so prices can't be faked
const SHOP = {
  // hats
  cap: 120, beanie: 150, party: 100, crown: 900, tophat: 600, cowboy: 400, viking: 700, chef: 350, halo: 1200, bunny: 500, frog: 650, propeller: 450,
  // faces / glasses
  shades: 250, nerd: 200, monocle: 500, visor: 800, mask: 400,
  // neck / back
  scarf: 180, bowtie: 150, cape: 750, wings: 1500, backpack: 300, medal: 1000,
  // colours (free ones are not listed)
  c_gold: 1000, c_galaxy: 2000, c_rainbow: 2500, c_ghost: 1500, c_lava: 1200
};
// ---------- Season 1 pass + daily spin ----------
const PASS = { season: 1, tiers: 30, txp: 300, price: 1500 };
const PASS_ITEMS = { free: { 5: "s1_flower", 10: "s1_heart", 20: "s1_lei", 30: "c_ice" },
  prem: { 1: "s1_star", 4: "s1_pirate", 8: "s1_goggles", 12: "s1_horns", 16: "s1_jetpack", 20: "c_candy", 24: "s1_astro", 27: "s1_wizard", 30: "c_neon" } };
const passReward = (track, t) => PASS_ITEMS[track][t] ? { item: PASS_ITEMS[track][t] } : { coins: track === "free" ? 40 + t * 3 : 90 + t * 6 };
const PASS_INFO = Object.assign({}, PASS, { free: [], prem: [] });
for (let t = 1; t <= PASS.tiers; t++) { PASS_INFO.free.push(passReward("free", t)); PASS_INFO.prem.push(passReward("prem", t)); }
const SPIN = [{ coins: 25, w: 25 }, { coins: 50, w: 22 }, { coins: 75, w: 16 }, { coins: 100, w: 14 }, { coins: 150, w: 9 }, { coins: 250, w: 6 }, { coins: 500, w: 2 }, { pxp: 300, w: 6 }];
const passOf = a => a.pass || (a.pass = { xp: 0, prem: false, cf: 0, cp: 0 });
const tierOf = p => Math.min(PASS.tiers, Math.floor(p.xp / PASS.txp));
const today = () => new Date().toISOString().slice(0, 10);
function giveReward(a, r) { if (r.coins) a.coins += r.coins; if (r.item) a.own[r.item] = 1; if (r.pxp) passOf(a).xp += r.pxp; }
const FREE_COLS = ["#ff5a8a", "#ffb03a", "#ffe03a", "#5ae07a", "#3ab8ff", "#9a6aff", "#ff7ad8", "#ffffff", "#2a2a3a", "#ff6a3a"];

export class Hub extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.rooms = new Map(); }
  async acc(name) { return name ? await this.ctx.storage.get("u:" + name.toLowerCase()) : null; }
  async put(a) { await this.ctx.storage.put("u:" + a.name.toLowerCase(), a); }
  async who(token) { if (!token || typeof token !== "string") return null; const n = await this.ctx.storage.get("s:" + token); return n ? await this.acc(n) : null; }
  pub(a, full) {
    const o = { name: a.name, bean: a.bean, lvl: a.lvl, xp: a.xp, wins: a.wins, matches: a.matches, rounds: a.rounds || 0, games: a.games || {}, created: a.created, seen: a.seen || 0, room: a.room || null };
    if (full) Object.assign(o, { coins: a.coins, own: a.own, friends: a.friends, reqs: a.reqs || [], hist: a.hist || [], pass: passOf(a), spun: a.spin === today() });
    return o;
  }
  async fetch(req) {
    const url = new URL(req.url);
    let b = {}; try { b = await req.json(); } catch (e) {}
    // ---------- internal calls from Room objects ----------
    if (url.pathname === "/internal/whoami") { const a = await this.who(b.token); return json(a ? { name: a.name, bean: a.bean, lvl: a.lvl } : { error: "bad" }); }
    if (url.pathname === "/internal/room") { if (b.gone) this.rooms.delete(b.code); else this.rooms.set(b.code, Object.assign(b, { t: Date.now() })); return json({ ok: true }); }
    if (url.pathname === "/internal/where") { for (const n of b.names || []) { const a = await this.acc(n); if (a) { a.room = b.code || null; a.seen = Date.now(); await this.put(a); } } return json({ ok: true }); }
    if (url.pathname === "/internal/award") {
      // b.results: [{name, place, pts, rounds:[{game, place}]}], b.n players
      for (const r of b.results || []) {
        const a = await this.acc(r.name); if (!a) continue;
        const k = Math.min(1, Math.max(.2, (r.rounds || []).length / 5));
        const coins = Math.round(([60, 40, 30, 20, 15, 12, 10, 10][r.place - 1] || 10) * k), xp = Math.round((120 + (r.wonRounds || 0) * 30 + (r.place === 1 ? 80 : 0)) * k);
        a.coins += coins; a.xp += xp; passOf(a).xp += xp; a.matches++; if (r.place === 1) a.wins++; a.rounds = (a.rounds || 0) + (r.rounds || []).length;
        while (a.xp >= lvlNeed(a.lvl)) { a.xp -= lvlNeed(a.lvl); a.lvl++; a.coins += 100; }
        a.games = a.games || {};
        for (const g of r.rounds || []) { const s = a.games[g.game] || (a.games[g.game] = { p: 0, w: 0 }); s.p++; if (g.place === 1) s.w++; }
        a.hist = [{ t: Date.now(), place: r.place, n: b.n, pts: r.pts, coins, xp, board: b.board }].concat(a.hist || []).slice(0, 30);
        await this.put(a);
      }
      return json({ ok: true });
    }
    // ---------- public API ----------
    const op = b.op;
    if (op === "signup") {
      const name = String(b.name || "").trim(); if (!NAME_RE.test(name)) return json({ error: "Names are 3-16 letters, numbers or _" });
      if (String(b.pass || "").length < 4) return json({ error: "Password needs 4+ characters" });
      if (await this.acc(name)) return json({ error: "That name is taken" });
      const a = { name, ph: await sha("cpk:" + name.toLowerCase() + ":" + b.pass), created: Date.now(), coins: 200, xp: 0, lvl: 1, wins: 0, matches: 0, rounds: 0, games: {}, own: {}, friends: [], reqs: [], hist: [],
        bean: { col: FREE_COLS[Math.floor(Math.random() * FREE_COLS.length)], hat: "", face: "", neck: "" } };
      await this.put(a); const token = rid(24); await this.ctx.storage.put("s:" + token, a.name);
      return json({ token, me: this.pub(a, true) });
    }
    if (op === "login") {
      const a = await this.acc(String(b.name || "").trim()); if (!a) return json({ error: "No account with that name" });
      if (a.ph !== await sha("cpk:" + a.name.toLowerCase() + ":" + b.pass)) return json({ error: "Wrong password" });
      const token = rid(24); await this.ctx.storage.put("s:" + token, a.name); return json({ token, me: this.pub(a, true) });
    }
    if (op === "rooms") { const now = Date.now(); const list = [...this.rooms.values()].filter(r => r.pub && !r.locked && now - r.t < 90000 && r.n > 0).sort((x, y) => y.n - x.n).slice(0, 30); return json({ rooms: list }); }
    if (op === "profile") { const a = await this.acc(String(b.name || "")); return json(a ? { p: this.pub(a) } : { error: "Not found" }); }
    const a = await this.who(b.token); if (!a) return json({ error: "Log in again", auth: true });
    if (op === "me") { a.seen = Date.now(); if (b.away) a.room = null; await this.put(a);
      const fr = []; for (const f of a.friends) { const x = await this.acc(f); if (x) fr.push({ name: x.name, bean: x.bean, lvl: x.lvl, online: Date.now() - (x.seen || 0) < 70000, room: Date.now() - (x.seen || 0) < 70000 ? x.room : null }); }
      return json({ me: this.pub(a, true), friends: fr, shop: SHOP, free: FREE_COLS, passInfo: PASS_INFO, spin: SPIN.map(x => ({ coins: x.coins, pxp: x.pxp })) }); }
    if (op === "pass") { const p = passOf(a), tier = tierOf(p), got = [];
      if (b.action === "buy") { if (p.prem) return json({ error: "You already have premium" }); if (a.coins < PASS.price) return json({ error: "Not enough coins" }); a.coins -= PASS.price; p.prem = true; }
      // claim everything unlocked so far (buying premium also claims the premium rewards you've already reached)
      for (let t = p.cf + 1; t <= tier; t++) { const r = passReward("free", t); giveReward(a, r); got.push(r); } p.cf = Math.max(p.cf, tier);
      if (p.prem) { for (let t = p.cp + 1; t <= tier; t++) { const r = passReward("prem", t); giveReward(a, r); got.push(r); } p.cp = Math.max(p.cp, tier); }
      await this.put(a); return json({ me: this.pub(a, true), got }); }
    if (op === "spin") { if (a.spin === today()) return json({ error: "You've spun today. Come back tomorrow!" });
      let r = Math.random() * SPIN.reduce((s, x) => s + x.w, 0), i = 0; while (r >= SPIN[i].w) { r -= SPIN[i].w; i++; }
      a.spin = today(); giveReward(a, SPIN[i]); await this.put(a); return json({ me: this.pub(a, true), i }); }
    if (op === "logout") { await this.ctx.storage.delete("s:" + b.token); return json({ ok: true }); }
    if (op === "buy") { const p = SHOP[b.item]; if (!p) return json({ error: "Not in the shop" }); if (a.own[b.item]) return json({ error: "You already own it" });
      if (a.coins < p) return json({ error: "Not enough coins" }); a.coins -= p; a.own[b.item] = 1; await this.put(a); return json({ me: this.pub(a, true) }); }
    if (op === "bean") {
      const n = b.bean || {}, ok = k => !k || a.own[k];
      const col = typeof n.col === "string" && (FREE_COLS.includes(n.col) || (n.col.startsWith("c_") && a.own[n.col])) ? n.col : a.bean.col;
      if (!ok(n.hat) || !ok(n.face) || !ok(n.neck)) return json({ error: "You don't own that" });
      a.bean = { col, hat: n.hat || "", face: n.face || "", neck: n.neck || "" }; await this.put(a); return json({ me: this.pub(a, true) });
    }
    if (op === "friend") {
      const o = await this.acc(String(b.name || "")); if (!o) return json({ error: "No player with that name" }); if (o.name === a.name) return json({ error: "That's you!" });
      a.reqs = a.reqs || []; o.reqs = o.reqs || [];
      if (b.action === "add") {
        if (a.friends.includes(o.name)) return json({ error: "Already friends" });
        if (a.reqs.includes(o.name)) { a.reqs = a.reqs.filter(x => x !== o.name); a.friends.push(o.name); o.friends.push(a.name); }
        else if (!o.reqs.includes(a.name)) o.reqs.push(a.name);
      }
      if (b.action === "accept" && a.reqs.includes(o.name)) { a.reqs = a.reqs.filter(x => x !== o.name); if (!a.friends.includes(o.name)) a.friends.push(o.name); if (!o.friends.includes(a.name)) o.friends.push(a.name); }
      if (b.action === "decline") a.reqs = a.reqs.filter(x => x !== o.name);
      if (b.action === "remove") { a.friends = a.friends.filter(x => x !== o.name); o.friends = o.friends.filter(x => x !== a.name); }
      await this.put(a); await this.put(o); return json({ ok: true });
    }
    return json({ error: "Unknown request" }, 400);
  }
}
const lvlNeed = l => 300 + l * 150;

// ---------- a room: everyone's phones connect here; the host's device runs the games ----------
export class Room extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.socks = new Map(); this.r = null; }
  hub() { return this.env.HUB.get(this.env.HUB.idFromName("hub")); }
  snap() { const r = this.r; return { t: "room", code: r.code, pub: r.pub, locked: r.locked, host: r.host, rounds: r.rounds, off: r.off, status: r.status, mode: r.mode || "party", pick: r.pick || "",
    players: r.order.map(id => { const p = r.players.get(id); return { id, name: p.name, bean: p.bean, lvl: p.lvl, bot: !!p.bot }; }) }; }
  send(ws, m) { try { ws.send(typeof m === "string" ? m : JSON.stringify(m)); } catch (e) {} }
  all(m, except) { const s = typeof m === "string" ? m : JSON.stringify(m); for (const [ws, id] of this.socks) if (id !== except) this.send(ws, s); }
  to(id, m) { for (const [ws, i] of this.socks) if (i === id) this.send(ws, m); }
  humans() { return this.r.order.filter(id => !this.r.players.get(id).bot); }
  async announce() {
    const r = this.r; if (!r) return;
    try { await this.hub().fetch("https://hub/internal/room", { method: "POST", body: JSON.stringify(this.humans().length ? { code: r.code, pub: r.pub, locked: r.locked, n: r.order.length, host: r.players.get(r.host)?.name, status: r.status, max: 8 } : { code: r.code, gone: true }) }); } catch (e) {}
  }
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("Expected a websocket", { status: 426 });
    const url = new URL(req.url), code = url.pathname.split("/")[2];
    const who = await (await this.hub().fetch("https://hub/internal/whoami", { method: "POST", body: JSON.stringify({ token: url.searchParams.get("token") }) })).json();
    const pair = new WebSocketPair(), [client, server] = Object.values(pair); server.accept();
    const fail = msg => { this.send(server, { t: "error", msg }); server.close(4000, msg); return new Response(null, { status: 101, webSocket: client }); };
    if (who.error) return fail("Log in again");
    if (!this.r) {
      if (url.searchParams.get("create") !== "1") return fail("That room doesn't exist (or everyone left).");
      this.r = { code, pub: url.searchParams.get("pub") === "1", locked: false, host: who.name, rounds: 10, off: [], status: "lobby", players: new Map(), order: [], kicked: new Set(), bots: 0 };
    }
    const r = this.r;
    if (r.kicked.has(who.name)) return fail("You were kicked from this room.");
    const back = r.players.has(who.name) && !r.players.get(who.name).bot;
    if (!back) {
      if (r.locked) return fail("This room is locked.");
      if (r.order.length >= 8) { const bot = r.order.find(id => r.players.get(id).bot); if (!bot) return fail("This room is full (8/8)."); r.players.delete(bot); r.order = r.order.filter(x => x !== bot); }
      r.players.set(who.name, { name: who.name, bean: who.bean, lvl: who.lvl }); r.order.push(who.name);
    }
    for (const [ws, id] of this.socks) if (id === who.name) { this.send(ws, { t: "error", msg: "You joined from somewhere else." }); try { ws.close(4001, "replaced"); } catch (e) {} this.socks.delete(ws); }
    this.socks.set(server, who.name);
    server.addEventListener("message", e => this.onMsg(server, who.name, e.data));
    server.addEventListener("close", () => this.onClose(server, who.name));
    server.addEventListener("error", () => this.onClose(server, who.name));
    this.send(server, Object.assign(this.snap(), { you: who.name }));
    this.all(this.snap(), who.name);
    if (!back) this.all({ t: "sys", msg: `${who.name} joined` });
    if (r.status !== "lobby" && r.host !== who.name) this.to(r.host, { t: "joined", id: who.name });
    this.announce(); this.hub().fetch("https://hub/internal/where", { method: "POST", body: JSON.stringify({ names: [who.name], code }) }).catch(() => {});
    return new Response(null, { status: 101, webSocket: client });
  }
  onClose(ws, id) {
    if (!this.socks.has(ws)) return; this.socks.delete(ws); const r = this.r; if (!r) return;
    if ([...this.socks.values()].includes(id)) return;   // still connected on another socket
    // give them 20s to come back (page reload / wifi blip)
    setTimeout(() => this.reap(id), 20000);
    this.all({ t: "away", id });
  }
  reap(id) {
    const r = this.r; if (!r || [...this.socks.values()].includes(id) || !r.players.has(id)) return;
    r.players.delete(id); r.order = r.order.filter(x => x !== id); this.all({ t: "sys", msg: `${id} left` });
    this.hub().fetch("https://hub/internal/where", { method: "POST", body: JSON.stringify({ names: [id], code: null }) }).catch(() => {});
    if (!this.humans().length) { this.announce(); this.r = null; return; }
    if (r.host === id) { r.host = this.humans()[0]; this.all({ t: "sys", msg: `${r.host} is the host now` }); if (r.status !== "lobby") { r.status = "lobby"; this.all({ t: "abort", msg: "The host left, so the match ended." }); } }
    else if (r.status !== "lobby") this.to(r.host, { t: "left", id });
    this.all(this.snap()); this.announce();
  }
  async onMsg(ws, id, data) {
    const r = this.r; if (!r) return; let m; try { m = JSON.parse(data); } catch (e) { return; } if (!m || typeof m.t !== "string") return;
    const host = r.host === id;
    switch (m.t) {
      case "i": if (!host) this.to(r.host, JSON.stringify({ t: "i", id, d: m.d })); return;   // input -> host
      case "s": if (host) this.all(data, id); return;                                         // game state -> everyone
      case "g": if (host) { if (m.to) this.to(m.to, data); else this.all(data, id); } return; // game event
      case "ping": this.send(ws, { t: "pong", c: m.c }); return;
      case "chat": { const text = String(m.text || "").slice(0, 200).trim(); if (text) this.all({ t: "chat", id, text, ts: Date.now() }); return; }
      case "emote": this.all({ t: "emote", id, e: String(m.e || "").slice(0, 8) }); return;
    }
    if (!host) return;
    // host-only controls
    if (m.t === "settings") { if (m.rounds === 5 || m.rounds === 10 || m.rounds === 15) r.rounds = m.rounds; if (Array.isArray(m.off)) r.off = m.off.slice(0, 40).map(String); if (typeof m.pub === "boolean") r.pub = m.pub;
      if (m.mode === "party" || m.mode === "single") r.mode = m.mode; if (typeof m.pick === "string" && /^[a-z0-9]{1,16}$/.test(m.pick)) r.pick = m.pick; }
    if (m.t === "lock") r.locked = !!m.on;
    if (m.t === "kick" && m.id !== id && r.players.has(m.id)) { const p = r.players.get(m.id); r.players.delete(m.id); r.order = r.order.filter(x => x !== m.id);
      if (!p.bot) { r.kicked.add(m.id); for (const [w, i] of this.socks) if (i === m.id) { this.send(w, { t: "kicked" }); try { w.close(4002, "kicked"); } catch (e) {} this.socks.delete(w); } this.all({ t: "sys", msg: `${m.id} was kicked` }); }
      if (r.status !== "lobby") this.to(r.host, { t: "left", id: m.id }); }
    if (m.t === "pass" && r.players.has(m.id) && !r.players.get(m.id).bot && [...this.socks.values()].includes(m.id)) { r.host = m.id; this.all({ t: "sys", msg: `${m.id} is the host now` }); if (r.status !== "lobby") { r.status = "lobby"; this.all({ t: "abort", msg: "Host changed, back to the lobby." }); } }
    if (m.t === "bot" && m.add && r.order.length < 8) { r.bots++; const name = "Bot " + ["Bubbles", "Noodle", "Pickle", "Sprout", "Waffle", "Jelly", "Biscuit", "Muffin", "Taco", "Pudding"][r.bots % 10] + (r.bots > 10 ? r.bots : "");
      const cols = ["#ff5a8a", "#ffb03a", "#ffe03a", "#5ae07a", "#3ab8ff", "#9a6aff", "#ff7ad8", "#ff6a3a"]; const hats = ["", "cap", "party", "beanie", "chef", "cowboy"];
      r.players.set(name, { name, bot: true, lvl: 1, bean: { col: cols[r.bots % cols.length], hat: hats[r.bots % hats.length], face: "", neck: "" } }); r.order.push(name); }
    if (m.t === "bot" && !m.add) { const bot = m.id && r.players.get(m.id)?.bot ? m.id : [...r.order].reverse().find(x => r.players.get(x).bot); if (bot) { r.players.delete(bot); r.order = r.order.filter(x => x !== bot); } }
    if (m.t === "status") { r.status = m.status === "playing" ? "playing" : "lobby"; }
    if (m.t === "end") {   // final results; awards coins + XP to real accounts
      if (r.status !== "playing") return; r.status = "lobby";
      const results = (m.results || []).filter(x => r.players.has(x.name) && !r.players.get(x.name).bot).slice(0, 8);
      const board = (m.results || []).slice(0, 8).map(x => ({ name: String(x.name), pts: +x.pts || 0 }));
      try { await this.hub().fetch("https://hub/internal/award", { method: "POST", body: JSON.stringify({ results, n: r.order.length, board }) }); } catch (e) {}
      this.all({ t: "awarded" });
    }
    this.all(this.snap()); this.announce();
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api" && req.method === "POST") return env.HUB.get(env.HUB.idFromName("hub")).fetch(new Request("https://hub/api", { method: "POST", body: await req.text() }));
    if (url.pathname.startsWith("/ws/")) { const code = (url.pathname.split("/")[2] || "").toUpperCase(); if (!CODE_RE.test(code)) return new Response("Bad room code", { status: 400 });
      return env.ROOM.get(env.ROOM.idFromName(code)).fetch(new Request(`https://room/ws/${code}${url.search}`, req)); }
    if (url.pathname.startsWith("/internal")) return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(req);
  }
};
