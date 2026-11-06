// ===================== room connection =====================
const NET = { ws:null, code:null, me:null, room:null, host:false, tries:0, closing:false, h:{} };
function on(t, fn){ (NET.h[t] = NET.h[t] || []).push(fn); return () => { NET.h[t] = NET.h[t].filter(f => f !== fn); }; }
function emit(t, m){ (NET.h[t] || []).forEach(f => { try{ f(m); }catch(e){ console.error(e); } }); }
function newCode(){ const L = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let s = ""; for(let i=0;i<4;i++) s += L[randInt(L.length)]; return s; }
function joinRoom(code, opts = {}){
  leaveRoom(true); NET.closing = false; NET.code = code.toUpperCase(); NET.tries = 0; NET.opts = opts; openWS();
}
function openWS(){
  const o = NET.opts || {}, proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws/${NET.code}?token=${encodeURIComponent(STORE.token || "")}${o.create ? "&create=1" : ""}${o.pub ? "&pub=1" : ""}`);
  NET.ws = ws;
  ws.onmessage = e => { let m; try{ m = JSON.parse(e.data); }catch(err){ return; }
    if(m.t === "room"){ if(m.you) NET.me = m.you; const wasHost = NET.host; NET.room = m; NET.host = m.host === NET.me; NET.tries = 0; NET.opts.create = false; emit("room", m); if(wasHost !== NET.host) emit("hostchange", NET.host); return; }
    if(m.t === "error"){ NET.closing = true; toast(m.msg, 4000); emit("fatal", m.msg); return; }
    if(m.t === "kicked"){ NET.closing = true; toast("You were kicked from the room.", 4000); emit("fatal", "kicked"); return; }
    emit(m.t, m); };
  ws.onclose = () => { if(NET.ws !== ws) return; NET.ws = null; if(NET.closing) return;
    if(NET.tries++ < 6){ emit("reconnecting"); setTimeout(() => { if(!NET.closing && NET.code) openWS(); }, 700 * NET.tries); } else { toast("Lost connection to the room."); emit("fatal", "lost"); } };
}
function leaveRoom(quiet){ NET.closing = true; if(NET.ws){ try{ NET.ws.close(); }catch(e){} } NET.ws = null; NET.room = null; NET.host = false; NET.code = null; if(!quiet) emit("left"); }
function send(t, d){ if(NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(Object.assign({ t }, d))); }
const players = () => (NET.room ? NET.room.players : []);
const playerOf = id => players().find(p => p.id === id);
setInterval(() => send("ping", { c:Date.now() }), 15000);
