import React, { useEffect, useState } from 'react';
import { analyticsAPI, productionAPI } from '../services/api';
import { formatNumber, formatCurrency, formatDate, PRODUCT_LABELS, PRODUCT_COLORS, getExpiryColor, daysUntilExpiry } from '../utils/helpers';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ label, value, sub, icon, color = 'blue', prefix = '', suffix = '' }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={{ fontSize: '1.6rem' }}>{prefix}{typeof value === 'number' ? formatNumber(value) : value}{suffix}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a2a3a', border: '1px solid #2a3f55', borderRadius: 8, padding: '8px 12px', fontSize: '.8rem' }}>
      <p style={{ color: '#8bacc0', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{formatNumber(p.value)}</strong></p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [trends, setTrends] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      analyticsAPI.getKPIs(),
      analyticsAPI.getTrends(14),
      analyticsAPI.getOptimization(),
      productionAPI.getExpiring(),
    ]).then(([k, t, o, e]) => {
      setKpis(k.data);
      setTrends(t.data);
      setOptimization(o.data);
      setExpiring(e.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥛</div>
        <div className="spinner" />
        <p style={{ marginTop: '1rem', color: 'var(--text2)' }}>Ma'lumotlar yuklanmoqda...</p>
      </div>
    </div>
  );

  const milkTrendData = trends?.milk_trend || [];
  const salesTrendData = trends?.sales_trend || [];

  const combinedTrend = milkTrendData.map(m => {
    const s = salesTrendData.find(s => s.date === m.date);
    return {
      date: m.date?.slice(5),
      sut: parseFloat(m.liters || 0),
      daromad: parseFloat(s?.revenue || 0) / 1000,
    };
  });

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '.25rem' }}>📊 Bosh panel</h1>
          <p style={{ color: 'var(--text2)', fontSize: '.875rem' }}>
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/milk')}>🥛 Sut qabul</button>
          <button className="btn btn-accent btn-sm" onClick={() => navigate('/production')}>+ Yangi partiya</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Bugungi sut qabuli" value={parseFloat(kpis?.milk?.today_liters || 0)} suffix=" L"
          icon="🥛" color="blue" sub={`${kpis?.milk?.active_farmers || 0} fermerdan`} />
        <StatCard label="Bugungi daromad" value={formatCurrency(kpis?.sales?.today_revenue || 0)} suffix=""
          icon="💰" color="green" sub={`${kpis?.sales?.today_sales_count || 0} ta sotuv`} />
        <StatCard label="Bugungi partiyalar" value={kpis?.production?.today_batches || 0} suffix=" ta"
          icon="🏭" color="yellow" sub="Ishlab chiqarilgan" />
        <StatCard label="Oy daromadi" value={formatCurrency(kpis?.revenue_comparison?.this_month || 0)} suffix=""
          icon="📈" color="red" sub="Joriy oy" />
      </div>

      {/* Inventory Quick View */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem' }}>📦 Hozirgi zaxira</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/inventory')}>Batafsil →</button>
        </div>
        <div className="grid grid-4">
          {['milk', 'yogurt', 'tvorog', 'smetana'].map(type => {
            const inv = kpis?.inventory?.find(i => i.product_type === type);
            return (
              <div key={type} style={{
                background: 'var(--bg2)', borderRadius: '10px', padding: '1rem',
                border: `1px solid ${inv?.is_low_stock ? 'rgba(239,71,111,.4)' : 'var(--border)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <span className={`product-pill product-${type}`}>{PRODUCT_LABELS[type]}</span>
                  {inv?.is_low_stock && <span className="badge badge-danger">Az!</span>}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Montserrat' }}>
                  {formatNumber(inv?.total_available || 0)}
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{inv?.price_unit || 'kg'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Trend Chart */}
        <div className="chart-container">
          <div className="chart-title">📈 14 kunlik tendensiya</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={combinedTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f55" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8bacc0' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8bacc0' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '.8rem' }} />
              <Line type="monotone" dataKey="sut" name="Sut (L)" stroke="#00b4d8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="daromad" name="Daromad (ming so'm)" stroke="#06d6a0" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI Optimization */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>🤖 AI Tavsiyalar</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analytics')}>AI Tahlil →</button>
          </div>
          {optimization?.recommendations?.length === 0 && (
            <div className="alert-banner alert-success">
              <span>✅</span>
              <div>
                <strong>Ajoyib!</strong>
                <p style={{ fontSize: '.85rem', marginTop: '2px', color: 'var(--text2)' }}>Barcha mahsulotlar zaxirasi yetarli.</p>
              </div>
            </div>
          )}
          {optimization?.recommendations?.slice(0, 3).map((rec, i) => (
            <div key={i} className={`alert-banner ${rec.priority === 'urgent' ? 'alert-danger' : rec.priority === 'high' ? 'alert-warning' : 'alert-info'}`}>
              <span>{rec.priority === 'urgent' ? '🚨' : rec.priority === 'high' ? '⚠️' : '💡'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{PRODUCT_LABELS[rec.product_type]}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text2)', margin: '2px 0' }}>{rec.reason}</div>
                <div style={{ fontSize: '.8rem' }}>
                  🥛 {formatNumber(rec.recommended_milk_liters)} L sut → 📦 {formatNumber(rec.expected_yield)} {rec.unit || 'kg'}
                </div>
              </div>
            </div>
          ))}
          {optimization && (
            <div style={{ marginTop: '.75rem', padding: '.75rem', background: 'var(--bg2)', borderRadius: 8, fontSize: '.8rem', color: 'var(--text2)' }}>
              💧 Mavjud sut: <strong style={{ color: 'var(--accent)' }}>{formatNumber(optimization.available_milk_liters)} L</strong>
            </div>
          )}
        </div>
      </div>

      {/* Expiring batches */}
      {expiring.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--warning)' }}>⏰ Muddati tugayotgan mahsulotlar</h3>
            <span className="badge badge-warning">{expiring.length} ta</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {expiring.map(b => {
              const days = daysUntilExpiry(b.expiration_date);
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem', background: 'var(--bg2)', borderRadius: 8, border: `1px solid ${getExpiryColor(b.expiration_date)}33` }}>
                  <span className={`product-pill product-${b.product_type}`}>{PRODUCT_LABELS[b.product_type]}</span>
                  <span style={{ fontSize: '.85rem', flex: 1 }}>{b.batch_number}</span>
                  <span style={{ fontSize: '.85rem' }}>{formatNumber(b.quantity_available)} {b.unit}</span>
                  <span style={{ fontSize: '.8rem', color: getExpiryColor(b.expiration_date), fontWeight: 600 }}>
                    {days <= 0 ? '⛔ Muddati tugagan' : `⏰ ${days} kun qoldi`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
