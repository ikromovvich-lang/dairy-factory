import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);
const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';

export function SocketProvider({ children, token }) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (notif) => {
      setNotifications(prev => [{ ...notif, id: Date.now(), read: false }, ...prev].slice(0, 50));
    });

    socket.on('alert', (alert) => {
      const icons = { error: '🚨', warning: '⚠️', info: 'ℹ️', success: '✅' };
      const icon = icons[alert.severity] || '🔔';
      
      if (alert.severity === 'error') {
        toast.error(`${icon} ${alert.title}\n${alert.message}`, { duration: 6000 });
      } else if (alert.severity === 'warning') {
        toast(`${icon} ${alert.title}`, { icon: '⚠️', duration: 5000 });
      } else {
        toast.success(`${icon} ${alert.title}`, { duration: 4000 });
      }
    });

    socket.on('batch_created', (data) => {
      toast.success(`✅ Yangi partiya tayyor: ${data.batch_number}`, { duration: 4000 });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const clearNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearAll = () => setNotifications([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SocketContext.Provider value={{ connected, notifications, unreadCount, clearNotification, clearAll, socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
