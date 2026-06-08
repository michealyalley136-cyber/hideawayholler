const DEFAULT_SOS_SOUND_SRC = '/sounds/sos-siren.mp3';

let sosAudio: HTMLAudioElement | null = null;
let vibrationTimer: number | null = null;
let sosSoundSrc = DEFAULT_SOS_SOUND_SRC;

function canUseBrowserAudio() {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

function startVibration() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate([900, 250, 900, 250, 900]);
  if (vibrationTimer === null) {
    vibrationTimer = window.setInterval(() => {
      navigator.vibrate([900, 250, 900, 250, 900]);
    }, 3500);
  }
}

function stopVibration() {
  if (typeof window !== 'undefined' && vibrationTimer !== null) {
    window.clearInterval(vibrationTimer);
    vibrationTimer = null;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(0);
  }
}

export function getSosAudio() {
  if (!canUseBrowserAudio()) return null;
  if (!sosAudio) {
    sosAudio = new Audio(sosSoundSrc);
    sosAudio.loop = true;
    sosAudio.volume = 1.0;
    sosAudio.preload = 'auto';
  } else if (sosAudio.src && !sosAudio.src.endsWith(sosSoundSrc)) {
    const wasPaused = sosAudio.paused;
    sosAudio.pause();
    sosAudio.src = sosSoundSrc;
    sosAudio.load();
    if (!wasPaused) void sosAudio.play().catch(() => undefined);
  }

  sosAudio.loop = true;
  sosAudio.volume = 1.0;
  sosAudio.preload = 'auto';
  return sosAudio;
}

export function setSosSoundSource(src?: string) {
  const nextSrc = src || DEFAULT_SOS_SOUND_SRC;
  if (nextSrc === sosSoundSrc) return;
  sosSoundSrc = nextSrc;
  if (sosAudio) {
    sosAudio.pause();
    sosAudio.src = sosSoundSrc;
    sosAudio.load();
  }
}

export async function unlockSosSound() {
  const audio = getSosAudio();
  if (!audio) return false;

  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    return true;
  } catch {
    stopVibration();
    return false;
  }
}

export async function playSosSound(options: { loop?: boolean } = {}) {
  const audio = getSosAudio();
  if (!audio) return false;

  try {
    audio.loop = options.loop ?? true;
    await audio.play();
    startVibration();
    return true;
  } catch {
    stopVibration();
    return false;
  }
}

export function stopSosSound() {
  const audio = getSosAudio();
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  stopVibration();
}
