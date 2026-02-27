// client/src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export const useSocket = () => {
  // 1. Lazy initialization: the arrow function ensures io() is only called ONCE 
  // during the initial render, avoiding both ref-read errors and sync-state errors.
  const [socket] = useState(() => io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false // 2. We keep it disconnected until the effect runs
  }));

  useEffect(() => {
    // 3. Connect safely only after the component has mounted
    socket.connect();

    // 4. Clean up gracefully if the component unmounts
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
};