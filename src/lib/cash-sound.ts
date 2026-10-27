"use client";

let ctx: AudioContext | null = null;
let customFile: boolean | null = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

/** Chame em um gesto do usuário (clique/toque): sem isso o navegador bloqueia o áudio. */
export function unlockAudio() {
  try {
    const c = getCtx();
    if (c.state === "suspended") void c.resume();
  } catch {}
}

/**
 * "Ka-ching" de caixa registradora com moedas caindo. Se existir um arquivo em public/sounds/cash-register.mp3 ele
 * tem prioridade; senão o som é sintetizado com Web Audio (sem depender de rede).
 */
export async function playCashSound() {
  if (customFile !== false) {
    try {
      const a = new Audio("/sounds/cash-register.mp3");
      a.volume = 0.9;
      await a.play();
      customFile = true;
      return;
    } catch {
      customFile = false;
    }
  }
  try {
    synthKaChing();
  } catch {}
}

function synthKaChing() {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime + 0.01;
  const master = c.createGain();
  master.gain.value = 0.7;
  master.connect(c.destination);

  const ping = (freq: number, at: number, dur: number, gain: number, type: OscillatorType = "sine") => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    const g = c.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, at + dur);
    o.connect(g);
    g.connect(master);
    o.start(at);
    o.stop(at + dur + 0.02);
  };

  // Sino da registradora: "ka" (grave e curto) e "ching" (agudo e longo, com parciais metálicos)
  ping(1046, t0, 0.12, 0.35, "triangle");
  ping(2093, t0 + 0.1, 1.1, 0.5);
  ping(2637, t0 + 0.1, 0.8, 0.28);
  ping(3520, t0 + 0.1, 0.45, 0.16);
  ping(5274, t0 + 0.1, 0.25, 0.08);

  // Gaveta abrindo: ruído curto com filtro de banda
  const len = Math.floor(c.sampleRate * 0.22);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1600;
  band.Q.value = 0.7;
  const ng = c.createGain();
  ng.gain.value = 0.22;
  noise.connect(band);
  band.connect(ng);
  ng.connect(master);
  noise.start(t0 + 0.2);

  // Moedas caindo: pings agudos em cascata, com altura e tempo levemente aleatórios
  for (let i = 0; i < 8; i++) {
    const at = t0 + 0.34 + i * 0.065 + Math.random() * 0.025;
    ping(3400 + Math.random() * 2800, at, 0.16, 0.11);
  }
}
