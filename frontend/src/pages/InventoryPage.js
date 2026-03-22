import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';
import { formatNumber, formatDate, PRODUCT_LABELS, getExpiryColor, daysUntilExpiry } from '../utils/helpers';

export default function InventoryPage() {
  const [inv, setInv] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');

  useEffect(() => {
    Promise.all([inventoryAPI.getCurrent(), inventoryAPI.getBatches(), inventoryAPI.getMovements()])
      .then(([i, b, m]) => { setInv(i.data); setBatches(b.data); setMovements(m.data); })
      .finally(() => setLoading(false));
  }, []);

  const PRODUCT_DESCS = { milk: 'Sutni qayta ishlash', yogurt: 'Fermentlangan mahsulot', tvorog: 'Silos / Qo\'rg\'oshin', smetana: 'Qaymaq asosida' };

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.5rem', marginBottom:'.25rem' }}>📦 Ombor boshqaruvi</h1>
        <p style={{ color:'var(--text2)', fontSize:'.875rem' }}>Real-vaqt zaxira monitoringi</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-4" style={{ marginBottom:'1.5rem' }}>
        {['milk','yogurt','tvorog','smetana'].map(type => {
          const item = inv.find(i => i.product_type === type);
          const stock = parseFloat(item?.total_available || 0);
          const threshold = parseFloat(item?.low_stock_threshold || 50);
          const pct = Math.min(100, (stock / (threshold * 2)) * 100);
          const isLow = stock <= threshold;
          return (
            <div key={type} style={{ background:'var(--card)', border:`1px solid ${isLow ? 'rgba(239,71,111,.5)' : 'var(--border)'}`, borderRadius:12, padding:'1.25rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.75rem' }}>
                <span className={`product-pill product-${type}`}>{PRODUCT_LABELS[type]}</span>
                {isLow ? <span className="badge badge-danger">⚠️ Az</span> : <span className="badge badge-success">✅ OK</span>}
              </div>
              <div style={{ fontSize:'1.8rem', fontWeight:800, fontFamily:'Montserrat', marginBottom:'.25rem' }}>
                {formatNumber(stock)}
              </div>
              <div style={{ fontSize:'.75rem', color:'var(--text3)', marginBottom:'.75rem' }}>{item?.price_unit || 'kg'} | Min: {formatNumber(threshold)}</div>
              <div style={{ background:'var(--bg2)', borderRadius:20, height:6, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: isLow ? 'var(--danger)' : pct > 70 ? 'var(--success)' : 'var(--warning)', borderRadius:20, transition:'width .5s' }} />
              </div>
              {item?.earliest_expiry && (
                <div style={{ fontSize:'.72rem', color: getExpiryColor(item.earliest_expiry), marginTop:'.5rem' }}>
                  Yaqin muddat: {formatDate(item.earliest_expiry)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1rem', borderBottom:'1px solid var(--border)' }}>
        {[['stock','📦 Partiyalar'], ['movements','📋 Harakatlar']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'.6rem 1.25rem', border:'none', background:'none', cursor:'pointer', color: activeTab===id?'var(--accent)':'var(--text2)', borderBottom: activeTab===id?'2px solid var(--accent)':'2px solid transparent', fontWeight: activeTab===id?700:400, fontSize:'.875rem', marginBottom:'-1px' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Partiya №</th><th>Mahsulot</th><th>Zaxira</th><th>Ishlab chiqarilgan</th><th>Muddat</th><th>Holat</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="6" style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{margin:'auto'}} /></td></tr>
                : batches.length === 0 ? <tr><td colSpan="6" style={{ textAlign:'center', padding:'2rem', color:'var(--text3)' }}>📦 Zaxira topilmadi</td></tr>
                : batches.map(b => {
                  const days = daysUntilExpiry(b.expiration_date);
                  return (
                    <tr key={b.id}>
                      <td><strong style={{ fontFamily:'monospace', color:'var(--accent)', fontSize:'.85rem' }}>{b.batch_number}</strong></td>
                      <td><span className={`product-pill product-${b.product_type}`}>{PRODUCT_LABELS[b.product_type]}</span></td>
                      <td><strong>{formatNumber(b.quantity_available)}</strong> {b.unit}</td>
                      <td style={{ fontSize:'.8rem', color:'var(--text2)' }}>{formatDate(b.production_date)}</td>
                      <td>
                        <span style={{ color:getExpiryColor(b.expiration_date), fontWeight:600, fontSize:'.85rem' }}>
                          {days == null ? '—' : days <= 0 ? '⛔ Tugagan' : `${days} kun`}
                        </span>
                        <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>{formatDate(b.expiration_date)}</div>
                      </td>
                      <td>
                        {b.expiring_soon ? <span className="badge badge-warning">⏰ Tugaydi</span>
                         : b.expired ? <span className="badge badge-danger">⛔ Tugagan</span>
                         : <span className="badge badge-success">✅ Yaxshi</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Sana</th><th>Tur</th><th>Mahsulot</th><th>Miqdor</th><th>Ref</th></tr></thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontSize:'.8rem', color:'var(--text2)' }}>{formatDate(m.date)}</td>
                    <td><span className={`badge ${m.type === 'production' ? 'badge-info' : 'badge-success'}`}>{m.type === 'production' ? '🏭 Ishlab chiqarish' : '💰 Sotuv'}</span></td>
                    <td><span className={`product-pill product-${m.product_type}`}>{PRODUCT_LABELS[m.product_type]}</span></td>
                    <td style={{ color: m.quantity > 0 ? 'var(--success)' : 'var(--danger)', fontWeight:700 }}>
                      {m.quantity > 0 ? '+' : ''}{formatNumber(m.quantity)}
                    </td>
                    <td style={{ fontSize:'.8rem', color:'var(--text3)', fontFamily:'monospace' }}>{m.batch_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
