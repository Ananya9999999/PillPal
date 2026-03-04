import { useEffect, useRef, useCallback } from 'react';

/**
 * useSSE — connects to /api/events and calls handlers on received events.
 * Reconnects automatically on drop. Cleans up on unmount.
 *
 * @param {boolean} enabled — connect only when user is logged in
 * @param {object}  handlers — { eventName: (data) => void, ... }
 */
export function useSSE(enabled, handlers) {
  const esRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const token = localStorage.getItem('pillpal_token');
    if (!token) return;

    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onopen = () => console.log('🔌 SSE connected');

    es.onerror = () => {
      es.close();
      
      setTimeout(() => { if (enabled) connect(); }, 5000);
    };

    Object.keys(handlersRef.current).forEach(eventName => {
      es.addEventListener(eventName, e => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current[eventName]?.(data);
        } catch {}
      });
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => { esRef.current?.close(); esRef.current = null; };
  }, [enabled, connect]);
}
