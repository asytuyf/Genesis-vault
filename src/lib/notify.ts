// Shared browser notification + audio chime helpers.
// Used by the study pomodoro and by timed sub-tasks on the goals page.

import { showLocalNotification } from "@/lib/push";

/** Request browser notification permission once. */
export function requestNotifPermission() {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}

/**
 * Fire a system notification. Goes through the service worker when there is
 * one, which is the only way an installed app on Android or iPhone may show it.
 */
export function sendNotification(title: string, body: string, icon?: string) {
  showLocalNotification(title, { body, icon }).catch(() => {
    // Some browsers block programmatic notifications silently — ignore.
  });
}

/** Play a short, pleasant 3-note chime using the Web Audio API. */
export function playChime(type: "work" | "break") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // Work-done → ascending major triad  |  Break-done → descending soft tones
    const notes = type === "work" ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.start(start);
      osc.stop(start + 0.6);
    });
    // Close the context after all notes finish
    setTimeout(() => ctx.close(), 2500);
  } catch {
    // AudioContext not available — ignore.
  }
}
