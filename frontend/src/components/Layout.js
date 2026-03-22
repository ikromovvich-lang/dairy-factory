import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { notificationsAPI } from '../services/api';
import { timeAgo } from '../utils/helpers';
import toast from 'react-hot-toast';

const navItems = [
  { section: 'Asosiy', items: [
    { path: '/', icon: '📊', label: 'Dashboard' },
  ]},
  { section: 'Xomashyo', items: [
    { path: '/farmers', icon: '🧑‍🌾', label: 'Fermerlar' },
    { path: '/milk', icon: '🥛', label: 'Sut qabul qilish' },
  ]},
  { section: 'Ishlab Chiqarish', items: [
    { path: '/production', icon: '🏭', label: 'Partiyalar' },
    { path: '/inventory', icon: '📦', label: 'Ombor' },
  ]},
  { section: 'Savdo', items: [
    { path: '/sales', icon: '🧾', label: 'Sotuv' },
    { path: '/customers', icon: '🏪', label: 'Mijozlar' },
  ]},
  { section: "Tahlil", items: [
    { path: '/analytics', icon: '📈', label: 'Tahlil & AI' },
  ]},
  { section: 'Tizim', items: [
    { path: '/users', icon: '👥', label: 'Foydalanuvchilar' },
  ]},
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const socket = useSocket();
  const [showNotif, setShowNotif] = useState(false);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allNotifications = [
    ...(socket?.notifications || []),
    ...dbNotifications.map(n => ({ ...n, id: n.id, title: n.title, message: n.message, read: n.is_read, timestamp: n.created_at }))
  ].slice(0, 30);

  const unreadCount = allNotifications.filter(n => !n.read).length;

  useEffect(() => {
    notificationsAPI.getAll().then(r => setDbNotifications(r.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Chiqildi');
    navigate('/login');
  };

  const handleMarkRead = async (id) => {
    try { await notificationsAPI.markRead(id); } catch {}
    setDbNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const pageTitle = {
    '/': 'Dashboard', '/farmers': 'Fermerlar', '/milk': 'Sut Qabul',
    '/production': 'Ishlab Chiqarish', '/inventory': 'Ombor', '/sales': 'Sotuv',
    '/customers': 'Mijozlar', '/analytics': 'AI Tahlil', '/users': 'Foydalanuvchilar',
  }[location.pathname] || 'Dashboard';

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AD';

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🥛</div>
          <div>
            <h1>SutFactory</h1>
            <span>Pro v1.0</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => {
                if (item.path === '/users' && !isAdmin) return null;
                return (
                  <button
                    key={item.path}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                    {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <h4>{user?.name}</h4>
              <p>{user?.role === 'admin' ? '👑 Admin' : user?.role === 'manager' ? '📋 Menejer' : '👷 Ishchi'}</p>
            </div>
            <button onClick={handleLogout} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 16 }} title="Chiqish">🚪</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h2>{pageTitle}</h2>
            <p>{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="topbar-right">
            {socket?.connected && (
              <span className="info-chip" style={{ fontSize: 11 }}>
                <span className="status-dot online"></span> Jonli
              </span>
            )}
            <button className="topbar-btn" onClick={() => setShowNotif(p => !p)}>
              🔔
              {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <button className="topbar-btn" onClick={() => setSidebarOpen(p => !p)} style={{ display: 'none' }}>☰</button>
          </div>
        </header>

        {/* Notification Panel */}
        {showNotif && (
          <div className="notif-panel">
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 15 }}>🔔 Bildirishnomalar</strong>
              <button onClick={() => { notificationsAPI.markAllRead().catch(() => {}); setDbNotifications(p => p.map(n => ({ ...n, is_read: true }))); }} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Barchasini o'qi</button>
            </div>

            {allNotifications.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <div className="empty-icon" style={{ fontSize: 36 }}>🔕</div>
                <p style={{ fontSize: 13 }}>Bildirishnomalar yo'q</p>
              </div>
            ) : (
              allNotifications.map((n, i) => (
                <div key={n.id || i} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => handleMarkRead(n.id)}>
                  {!n.read && <div className="notif-dot"></div>}
                  <div className="notif-content" style={{ flex: 1 }}>
                    <h4>{n.title}</h4>
                    <p>{n.message}</p>
                    <div className="notif-time">{timeAgo(n.created_at || n.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showNotif && <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowNotif(false)} />}

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
