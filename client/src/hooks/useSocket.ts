import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(token: string | null) {
  const [status, setStatus] = useState<'disconnected'|'connecting'|'connected'>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    setStatus('connecting');
    const envAny = (import.meta as any).env;
    const url = envAny.VITE_SOCKET_URL || envAny.VITE_API_URL || 'http://localhost:4000';
    const s = io(url, { auth: { token } });
    socketRef.current = s;

    s.on('connect', () => setStatus('connected'));
    s.on('disconnect', () => setStatus('disconnected'));
    s.on('connect_error', () => setStatus('disconnected'));

    return () => { s.disconnect(); };
  }, [token]);

  return useMemo(() => ({ socket: socketRef.current, status }), [status]);
}
