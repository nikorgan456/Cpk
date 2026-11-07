// ===================== controls: joystick + action button on touch, WASD/arrows + space on keyboard =====================
const PC = matchMedia("(pointer:fine)").matches;
const CTL = { x:0, y:0, a:0, j:0, jump:false, kind:null, sent:"", last:0, keys:{}, stick:null, label:"DIVE" };
function ctlShow(kind, label, o = {}){ CTL.kind = kind; CTL.label = label || "DIVE"; CTL.jump = !!o.jump; const c = $("#controls"); c.hidden = kind !== "stick"; $("#ctlJump").hidden = !CTL.jump; c.classList.toggle("two", CTL.jump); if(CTL.jump) $("#ctlJump").innerHTML = "JUMP" + (PC ? "<kbd>SPACE</kbd>" : ""); if(kind === "stick") $("#ctlAct").innerHTML = esc(CTL.label) + (PC ? `<kbd>E</kbd>` : ""); CTL.x = CTL.y = CTL.a = CTL.j = 0; CTL.sent = ""; CTL.map = null; }
(() => {
  const pad = $("#ctlPad"), knob = $("#ctlKnob"), act = $("#ctlAct"); let pid = null, cx = 0, cy = 0;
  const R = () => pad.getBoundingClientRect().width / 2;
  pad.addEventListener("pointerdown", e => { pid = e.pointerId; pad.setPointerCapture(pid); const r = pad.getBoundingClientRect(); cx = r.left + r.width/2; cy = r.top + r.height/2; mv(e); e.preventDefault(); });
  const mv = e => { if(e.pointerId !== pid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), m = R() * .8; if(d > m){ dx *= m/d; dy *= m/d; } knob.style.transform = `translate(${dx}px,${dy}px)`; CTL.tx = dx / m; CTL.ty = dy / m; };
  pad.addEventListener("pointermove", mv);
  const up = e => { if(e.pointerId !== pid) return; pid = null; knob.style.transform = ""; CTL.tx = CTL.ty = 0; };
  pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
  act.addEventListener("pointerdown", e => { CTL.ta = 1; act.classList.add("on"); e.preventDefault(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => act.addEventListener(ev, () => { CTL.ta = 0; act.classList.remove("on"); }));
  const jb = $("#ctlJump"); jb.addEventListener("pointerdown", e => { CTL.tj = 1; jb.classList.add("on"); e.preventDefault(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => jb.addEventListener(ev, () => { CTL.tj = 0; jb.classList.remove("on"); }));
  addEventListener("keydown", e => { if(e.target.closest("input,textarea")) return; CTL.keys[e.code] = 1; if(CTL.kind === "stick" && ["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault(); });
  addEventListener("keyup", e => { CTL.keys[e.code] = 0; });
  addEventListener("blur", () => CTL.keys = {});
})();
function ctlTick(){
  if(CTL.kind !== "stick") return; const k = CTL.keys;
  let kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), ky = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if(kx && ky){ kx *= .707; ky *= .707; }
  CTL.x = kx || CTL.tx || 0; CTL.y = ky || CTL.ty || 0; CTL.a = (k.KeyE || k.KeyJ || k.Enter || CTL.ta || !CTL.jump && k.Space) ? 1 : 0; CTL.j = CTL.jump && (k.Space || CTL.tj) ? 1 : 0;
  let sx = CTL.x, sy = CTL.y; if(CTL.map) [sx, sy] = CTL.map(sx, sy); // a turned camera turns the stick too
  const t = now(), sig = `${sx.toFixed(2)},${sy.toFixed(2)},${CTL.a},${CTL.j}`;
  if(CM.phase === "play" && (sig !== CTL.sent && t - CTL.last > .066 || t - CTL.last > .5)){ CTL.sent = sig; CTL.last = t; myInput({ c:{ x:+sx.toFixed(2), y:+sy.toFixed(2), a:CTL.a, j:CTL.j } }); }
}

// key that counts as the action button in tap/mash games (E for PC, Space/Enter also work)
const actKey = e => (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") && !(e.target && e.target.closest && e.target.closest("input,textarea"));
