// Web Push & In-App Notification Manager

let audioCtx: AudioContext | null = null;

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Subtle ascending double chime (880Hz -> 1320Hz)
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch (err) {
    // Non-blocking audio fallback
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    return 'denied';
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export function dispatchPushNotification(
  title: string,
  options?: { body?: string; icon?: string; tag?: string; taskId?: string; data?: any }
) {
  playNotificationChime();

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: options?.body || 'Task updated in ProjectPulse',
        icon: options?.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: options?.tag || 'project-notification',
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (err) {
      // Notification failed (e.g. inside restrictive iframe), visual chime & state already applied
    }
  }
}
