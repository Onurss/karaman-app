'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ORDER_SOUND } from '@karaman/utils';

export function useOrderSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const ensureContext = () => {
    if (!audioCtxRef.current) {
      const Ctor =
        (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctor();
    }
    return audioCtxRef.current;
  };

  const beep = useCallback(
    (durationSec: number = ORDER_SOUND.beepDurationSec, freq: number = ORDER_SOUND.frequencyHz) => {
      try {
        const ctx = ensureContext();
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
        oscillator.start();
        oscillator.stop(ctx.currentTime + durationSec);
      } catch (e) {
        console.warn('[order-sound] beep failed', e);
      }
    },
    [],
  );

  const playLoop = useCallback(
    (durationMs: number = ORDER_SOUND.totalDurationMs) => {
      stop();
      beep();
      intervalRef.current = setInterval(beep, ORDER_SOUND.beepIntervalMs);
      stopTimeoutRef.current = setTimeout(stop, durationMs);
    },
    [beep, stop],
  );

  const desktopNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192.png' });
    } else if (Notification.permission !== 'denied') {
      void Notification.requestPermission().then(perm => {
        if (perm === 'granted') new Notification(title, { body });
      });
    }
  }, []);

  return { playLoop, stop, beep, desktopNotification };
}
