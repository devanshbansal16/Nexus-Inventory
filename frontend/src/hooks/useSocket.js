import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let globalSocket = null;

function getSocketInstance(token) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      auth: authToken ? { token: authToken } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    globalSocket.on('connect', () => {
      console.log('Socket connected');
    });

    globalSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    globalSocket.on('connect_error', (err) => {
      // Gracefully warn instead of throwing unhandled error when backend is offline
      console.warn('Socket connection notice:', err.message);
    });
  } else if (authToken && globalSocket.auth?.token !== authToken) {
    globalSocket.auth = { token: authToken };
  }

  return globalSocket;
}

export function useSocket(token) {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = getSocketInstance(token);
  }, [token]);

  const emit = useCallback((event, data) => {
    const s = socketRef.current || getSocketInstance(token);
    s?.emit(event, data);
  }, [token]);

  const on = useCallback((event, handler) => {
    const s = socketRef.current || getSocketInstance(token);
    s?.on(event, handler);
    return () => s?.off(event, handler);
  }, [token]);

  const off = useCallback((event, handler) => {
    const s = socketRef.current || getSocketInstance(token);
    if (handler) {
      s?.off(event, handler);
    } else {
      s?.off(event);
    }
  }, [token]);

  const currentSocket = socketRef.current || getSocketInstance(token);

  const wrapper = {
    socket: currentSocket,
    emit,
    on,
    off,
    disconnect: () => currentSocket?.disconnect(),
    connect: () => currentSocket?.connect(),
    get connected() {
      return currentSocket?.connected || false;
    },
  };

  return new Proxy(wrapper, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      if (currentSocket && typeof currentSocket[prop] === 'function') {
        return currentSocket[prop].bind(currentSocket);
      }
      return currentSocket ? currentSocket[prop] : undefined;
    },
  });
}

export default useSocket;
