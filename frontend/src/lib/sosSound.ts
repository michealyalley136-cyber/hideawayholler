const SOS_SIREN_SRC = '/sounds/sos-siren.mp3';

let sosAudio: HTMLAudioElement | null = null;
let vibrationTimer: number | null = null;

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
    sosAudio = new Audio(SOS_SIREN_SRC);
    sosAudio.loop = true;
    sosAudio.volume = 1.0;
    sosAudio.preload = 'auto';
  }

  sosAudio.loop = true;
  sosAudio.volume = 1.0;
  sosAudio.preload = 'auto';
  return sosAudio;
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

export async function playSosSound() {
  const audio = getSosAudio();
  if (!audio) return false;

  try {
    startVibration();
    await audio.play();
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
