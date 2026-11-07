// ===================== sound: synth effects, two music loops, a 3-2-1 GO announcer =====================
const SND = (() => {
  let ctx = null, master = null, musG = null, sfxG = null, song = null, songT = 0, step = 0, nextT = 0;
  function init(){ if(ctx) return true; try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return false; }
    master = ctx.createGain(); master.gain.value = STORE.vol; master.connect(ctx.destination);
    musG = ctx.createGain(); musG.gain.value = .32; musG.connect(master); sfxG = ctx.createGain(); sfxG.gain.value = .9; sfxG.connect(master);
    setInterval(sched, 40); return true; }
  addEventListener("pointerdown", () => { if(init() && ctx.state === "suspended") ctx.resume(); }, { capture:true });
  function tone(f, len, type = "sine", v = .2, when = 0, to = null, dest){ if(!ctx || !STORE.sound && !dest) return; const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if(to) o.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + len); o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + len + .02); }
  function noise(len, v = .3, f = 1200, when = 0, type = "bandpass"){ if(!ctx || !STORE.sound) return; const t = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * len), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = (Math.random()*2 - 1) * (1 - i/n); const s = ctx.createBufferSource(); s.buffer = b; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain(); g.gain.value = v;
    s.connect(fl); fl.connect(g); g.connect(sfxG); s.start(t); }
  const fx = {
    click(){ tone(900, .05, "triangle", .12); }, pop(){ tone(500, .12, "sine", .25, 0, 1200); },
    bump(){ tone(180, .12, "sine", .35, 0, 90); noise(.06, .15, 600); }, dive(){ noise(.18, .2, 2200, 0, "highpass"); tone(300, .15, "triangle", .1, 0, 600); },
    fall(){ tone(700, .7, "sine", .22, 0, 120); }, splash(){ noise(.5, .35, 900); },
    boom(){ noise(.9, .7, 300, 0, "lowpass"); tone(90, .6, "sine", .5, 0, 35); }, tick(){ tone(1400, .03, "square", .06); },
    ding(){ tone(1046, .25, "triangle", .2); tone(1568, .35, "triangle", .15, .08); }, wrong(){ tone(220, .2, "square", .12, 0, 160); },
    win(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .3, "triangle", .2, i*.1)); }, lose(){ [392, 330, 262].forEach((f, i) => tone(f, .35, "triangle", .18, i*.14)); },
    coin(){ tone(988, .08, "square", .1); tone(1319, .25, "square", .1, .07); }, whistle(){ tone(2200, .35, "sine", .2, 0, 2600); tone(2600, .2, "sine", .15, .3); },
    mash(){ tone(300 + Math.random()*200, .05, "square", .07); }, beep(){ tone(880, .1, "square", .1); }, go(){ tone(1320, .4, "square", .15); tone(660, .4, "square", .1); },
    pass(){ tone(600, .1, "sawtooth", .12, 0, 1200); }, draw(){ noise(.03, .04, 3000); }, chat(){ tone(1200, .06, "sine", .08); tone(1600, .06, "sine", .06, .05); },
    whoosh(){ noise(.2, .25, 1800, 0, "highpass"); }, whack(){ tone(160, .1, "square", .25, 0, 70); noise(.08, .3, 900); },
    pump(){ noise(.12, .22, 500, 0, "lowpass"); tone(140, .1, "sine", .12, 0, 220); }, bang(){ noise(.35, .8, 1200, 0, "lowpass"); tone(160, .2, "square", .25, 0, 50); },
    boing(){ tone(220, .3, "sine", .25, 0, 700); }, step(){ tone(140 + Math.random()*40, .05, "triangle", .12); }, slip(){ tone(500, .3, "sawtooth", .1, 0, 150); },
    vote(){ tone(700, .08, "triangle", .14); tone(1050, .1, "triangle", .1, .06); }, crown(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .4, "sine", .16, i*.09)); }
  };
  // ---------- music: lobby = chill bounce, game = fast candy pop ----------
  const SONGS = {
    lobby:{ bpm:100, bass:[0,0,7,7,5,5,3,3], chord:[[0,4,7],[5,9,12],[3,7,10],[7,11,14]], lead:[12,null,14,16,null,14,12,null,9,null,12,null,7,null,null,null], root:57, kick:[1,0,0,0,1,0,0,0], hat:1 },
    game:{ bpm:150, bass:[0,0,0,12,5,5,7,7], chord:[[0,4,7],[0,4,7],[5,9,12],[7,11,14]], lead:[12,16,19,16,12,16,19,24,14,17,21,17,19,null,16,null], root:55, kick:[1,0,1,0,1,0,1,0], hat:1 },
    chairs:{ bpm:176, bass:[0,7,0,7,5,12,5,12], chord:[[0,4,7],[5,9,12],[7,11,14],[5,9,12]], lead:[12,14,16,19,16,14,12,null,17,16,14,12,14,null,7,null], root:62, kick:[1,0,1,0,1,0,1,0], hat:1 },
    final:{ bpm:120, bass:[0,7,5,7,0,7,9,7], chord:[[0,4,7],[5,9,12],[7,11,14],[0,4,7]], lead:[24,null,19,null,21,null,24,26,28,null,26,24,21,null,19,null], root:60, kick:[1,0,0,1,1,0,0,0], hat:1 }
  };
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  function sched(){
    if(!ctx || !song || !STORE.music) return; const S = SONGS[song], spb = 60 / S.bpm / 2;
    if(nextT < ctx.currentTime) nextT = ctx.currentTime + .05;
    while(nextT < ctx.currentTime + .15){
      const w = nextT - ctx.currentTime, i = step % 16, bar = Math.floor(step / 16) % 4;
      if(i % 2 === 0) tone(mf(S.root - 12 + S.bass[(i/2) % 8] + (bar === 3 ? 2 : 0)), spb*1.6, "triangle", .3, w, null, musG);
      if(S.kick[i % 8]){ tone(120, .14, "sine", .5, w, 45, musG); }
      if(i % 4 === 2) noiseM(.08, .12, w, 2000);
      if(S.hat && i % 2 === 1) noiseM(.03, .05, w, 7000);
      if(i === 0 || i === 8) S.chord[bar].forEach(c => tone(mf(S.root + c), spb*7, "sine", .06, w, null, musG));
      const ld = S.lead[i]; if(ld != null) tone(mf(S.root + ld), spb*1.2, "square", .045, w, null, musG);
      step++; nextT += spb;
    }
  }
  function noiseM(len, v, when, f){ const t = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * len), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = (Math.random()*2 - 1) * (1 - i/n); const s = ctx.createBufferSource(); s.buffer = b; const fl = ctx.createBiquadFilter(); fl.type = "highpass"; fl.frequency.value = f; const g = ctx.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(musG); s.start(t); }
  function music(name){ if(song === name) return; song = name; step = 0; }
  function say(text, rate = 1.1, pitch = 1.25){ if(!STORE.voice || !window.speechSynthesis) return; try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = rate; u.pitch = pitch; u.volume = STORE.vol; speechSynthesis.speak(u); }catch(e){} }
  function setVol(v){ STORE.vol = v; saveStore(); if(master) master.gain.value = v; }
  return { fx, music, say, setVol, init };
})();
const sfx = SND.fx;
