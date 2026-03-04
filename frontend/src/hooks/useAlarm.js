import { useRef, useCallback } from 'react';

export function useAlarm() {
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  const playAlarm = useCallback((repeats = 3) => {
    try {
      const ctx = getCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.4, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const beepFreqs = [660, 784, 880]; 
      const beepDuration = 0.18;
      const beepGap = 0.08;
      const repGap = 0.6;

      for (let rep = 0; rep < repeats; rep++) {
        beepFreqs.forEach((freq, i) => {
          const t = ctx.currentTime + rep * (beepFreqs.length * (beepDuration + beepGap) + repGap) + i * (beepDuration + beepGap);

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(1, t + 0.02);
          gain.gain.setValueAtTime(1, t + beepDuration - 0.03);
          gain.gain.linearRampToValueAtTime(0, t + beepDuration);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + beepDuration);
          nodesRef.current.push(osc);
        });
      }
    } catch (err) {
      console.warn('Alarm audio failed:', err);
    }
  }, []);

  const stopAlarm = useCallback(() => {
    try {
      nodesRef.current.forEach(n => { try { n.stop(); } catch {} });
      nodesRef.current = [];
    } catch {}
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const showNotification = useCallback((title, body, iconColor = '#22d3ee') => {
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='${encodeURIComponent(iconColor)}'/><text y='.9em' font-size='80' x='10'>💊</text></svg>`,
      badge: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='80'>💊</text></svg>`,
      requireInteraction: true,
      tag: 'pillpal-dose',
    });
    setTimeout(() => n.close(), 30000);
    return n;
  }, []);

  return { playAlarm, stopAlarm, requestNotificationPermission, showNotification };
}
