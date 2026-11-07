// ===================== cpk core =====================
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const rand = () => Math.random(), randInt = n => Math.floor(Math.random() * n), pick = a => a[randInt(a.length)];
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = n => Math.round(n).toLocaleString("en-GB");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => performance.now() / 1000;
function seeded(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const STORE = (() => { let s = {}; try{ s = JSON.parse(localStorage.getItem("cpk") || "{}"); }catch(e){} return s; })();
function saveStore(){ try{ localStorage.setItem("cpk", JSON.stringify(STORE)); }catch(e){} }
// dark mode: your choice in Settings, or your device's setting until you pick
const isDark = () => STORE.dark != null ? !!STORE.dark : !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
function applyDark(){ document.body.classList.toggle("dark", isDark()); const m = document.querySelector('meta[name=theme-color]'); if(m) m.content = isDark() ? "#1a1636" : "#ff8ac4"; }
applyDark(); try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyDark); }catch(e){}
if(STORE.music === undefined) STORE.music = true; if(STORE.sound === undefined) STORE.sound = true; if(STORE.voice === undefined) STORE.voice = true; if(STORE.vol === undefined) STORE.vol = .7;

let ME = null, FRIENDS = [], SHOP = {}, FREE_COLS = [], PASSI = null, SPINL = [];
async function api(op, body = {}){
  try{
    const r = await fetch("/api", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(Object.assign({ op, token:STORE.token }, body)) });
    const j = await r.json(); if(j.auth){ STORE.token = null; saveStore(); showAuth(); } return j;
  }catch(e){ return { error:"Can't reach the server. Check your internet." }; }
}
async function refreshMe(away){ const j = await api("me", away ? { away:true } : {}); if(j.me){ ME = j.me; FRIENDS = j.friends || []; SHOP = j.shop || SHOP; FREE_COLS = j.free || FREE_COLS; PASSI = j.passInfo || PASSI; SPINL = j.spin || SPINL; renderHome(); } return j; }

function toast(msg, ms = 2600){ const t = $("#toast"); t.textContent = msg; t.hidden = false; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms); }
function show(id){ const was = $("#" + id) && !$("#" + id).hidden; $$(".screen").forEach(s => s.hidden = s.id !== id); if(!was) window.scrollTo(0, 0); } // only jump to the top when actually changing screen
function modal(id, on = true){ $(id).hidden = !on; }
document.addEventListener("click", e => { const m = e.target.closest(".modal"); if(m && (e.target === m || e.target.closest("[data-close]"))) m.hidden = true; });
function copyText(t){ try{ navigator.clipboard.writeText(t).then(() => toast("Copied!"), () => toast(t)); }catch(e){ toast(t); } }
function lvlNeed(l){ return 300 + l * 150; }
function timeAgo(t){ const s = (Date.now() - t) / 1000; if(s < 60) return "just now"; if(s < 3600) return Math.floor(s/60) + "m ago"; if(s < 86400) return Math.floor(s/3600) + "h ago"; return Math.floor(s/86400) + "d ago"; }
