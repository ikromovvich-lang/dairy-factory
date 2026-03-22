import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import { formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    notificationsAPI.getAll().then(r => setNotifications(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationsAPI.markRead(id);
    load();
  };
  const markAll = async () => {
    await notificationsAPI.markAllRead();
    toast.success('Barchasi o\'qilgan belgilandi');
    load();
  };

  const icons = { milk_quality:'🥛', low_stock:'📦', expiry:'⏰', production:'🏭', sale:'💰', info:'ℹ️' };
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', marginBottom:'.25rem' }}>🔔 Bildirishnomalar</h1>
          <p style={{ color:'var(--text2)', fontSize:'.875rem' }}>{unread} ta o'qilmagan</p>
        </div>
        {unread > 0 && <button className="btn btn-ghost" onClick={markAll}>✅ Barchasi o'qildi</button>}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
        {loading ? <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'auto' }} /></div>
        : notifications.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--text3)' }}>
            <div style={{ fontSize:'3rem' }}>🔔</div>
            <p style={{ marginTop:'1rem' }}>Bildirishnomalar yo'q</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} style={{
            background: n.is_read ? 'var(--card)' : 'rgba(0,180,216,.06)',
            border: `1px solid ${n.is_read ? 'var(--border)' : 'rgba(0,180,216,.3)'}`,
            borderRadius:10, padding:'1rem 1.25rem',
            display:'flex', alignItems:'flex-start', gap:'1rem',
          }}>
            <div style={{ fontSize:'1.5rem', flexShrink:0 }}>{icons[n.type] || '🔔'}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.25rem' }}>
                <div style={{ fontWeight: n.is_read ? 400 : 700 }}>{n.title}</div>
                <span style={{ fontSize:'.75rem', color:'var(--text3)', flexShrink:0, marginLeft:'1rem' }}>{formatDateTime(n.created_at)}</span>
              </div>
              <div style={{ fontSize:'.875rem', color:'var(--text2)' }}>{n.message}</div>
              <div style={{ display:'flex', gap:'.75rem', marginTop:'.5rem', alignItems:'center' }}>
                <span className={`badge ${n.severity === 'error' ? 'badge-danger' : n.severity === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                  {n.severity || 'info'}
                </span>
                {!n.is_read && (
                  <button className="btn btn-ghost btn-sm" onClick={() => markRead(n.id)}>✓ O'qildi</button>
                )}
              </div>
            </div>
            {!n.is_read && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:6 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
