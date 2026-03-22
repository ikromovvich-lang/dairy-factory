import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { dashboardAPI, analyticsAPI } from '../services/api';
import { formatCurrency, formatNumber, PRODUCT_NAMES, PRODUCT_COLORS } from '../utils/helpers';

const KPICard = ({ icon, label, value, sub, color, bgColor, change }) => (
  <div className="kpi-card" style={{ '--kpi-color': color, '--kpi-bg': bgColor }}>
    <div className="kpi-icon">{icon}</div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-label">{label}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    {change && <div className={`kpi-change ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}% bu oy</div>}
  </div>
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [trends, setTrends] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, k, t] = await Promise.all([
          dashboardAPI.getSummary(),
          analyticsAPI.getKPIs(),
          analyticsAPI.getTrends(14),
        ]);
        setSummary(s.data);
        setKpis(k.data);
        setTrends(t.data);
        // Try AI insights
        try {
          const res = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(':5000', ':8000') + '/insights/factory1');
          if (res.ok) { const d = await res.json(); setInsights(d.insights || []); }
        } catch {}
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p style={{ color: 'var(--text-muted)' }}>Ma'lumotlar yuklanmoqda...</p>
    </div>
  );

  const inventory = kpis?.inventory || [];
  const invData = inventory.map(i => ({
    name: PRODUCT_NAMES[i.product_type] || i.product_type,
    value: parseFloat(i.total_available || 0),
    color: PRODUCT_COLORS[i.product_type],
  }));

  // Build combined trend chart data
  const trendData = (trends?.milk_trend || []).map(m => {
    const salesDay = (trends?.sales_trend || []).find(s => s.date === m.date);
    return {
      date: m.date?.slice(5),
      sut: parseFloat(m.liters || 0).toFixed(0),
      daromad: parseFloat(salesDay?.revenue || 0) / 1000,
    };
  });

  const revenueChange = kpis?.revenue_comparison
    ? ((kpis.revenue_comparison.this_month - kpis.revenue_comparison.last_month) / Math.max(kpis.revenue_comparison.last_month, 1) * 100).toFixed(1)
    : 0;

  return (
    <div>
      {/* KPI Grid */}
      <div className="kpi-grid">
        <KPICard
          icon="🥛" label="Bugun qabul qilindi"
          value={`${formatNumber(summary?.today_milk_liters || 0, 0)} L`}
          sub={`${summary?.today_milk_count || 0} ta yetkazma`}
          color="#00b4d8" bgColor="rgba(0,180,216,0.1)"
        />
        <KPICard
          icon="💰" label="Bugungi daromad"
          value={formatCurrency(summary?.today_revenue || 0)}
          sub={`${summary?.today_sales_count || 0} ta sotuv`}
          color="#2d9e5f" bgColor="rgba(45,158,95,0.1)"
          change={parseFloat(revenueChange)}
        />
        <KPICard
          icon="🏭" label="So'nggi partiyalar"
          value={summary?.recent_batches?.length || 0}
          sub="Tayyor mahsulotlar"
          color="#f4a261" bgColor="rgba(244,162,97,0.1)"
        />
        <KPICard
          icon="🔔" label="O'qilmagan xabarlar"
          value={summary?.unread_notifications || 0}
          sub="Ogohlantirishlar"
          color={summary?.unread_notifications > 0 ? "#e63946" : "#2d9e5f"}
          bgColor={summary?.unread_notifications > 0 ? "rgba(230,57,70,0.1)" : "rgba(45,158,95,0.1)"}
        />
      </div>

      <div className="grid-7-3" style={{ marginBottom: 24 }}>
        {/* Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📈 14 kunlik dinamika</div>
              <div className="card-subtitle">Sut qabuli va daromad</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => n === 'sut' ? [`${v} L`, 'Sut'] : [`${v}K so'm`, 'Daromad']} />
              <Line yAxisId="left" type="monotone" dataKey="sut" stroke="#00b4d8" strokeWidth={2.5} dot={false} name="sut" />
              <Line yAxisId="right" type="monotone" dataKey="daromad" stroke="#2d9e5f" strokeWidth={2.5} dot={false} name="daromad" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Pie */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📦 Ombor</div>
              <div className="card-subtitle">Joriy zaxira</div>
            </div>
          </div>
          {invData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={invData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${value.toFixed(0)}`}>
                  {invData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip formatter={(v) => `${parseFloat(v).toFixed(1)} kg`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>Ombor bo'sh</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Recent Batches */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏭 So'nggi partiyalar</div>
          </div>
          {summary?.recent_batches?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Partiya</th><th>Mahsulot</th><th>Miqdor</th><th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent_batches.map(b => (
                    <tr key={b.batch_number}>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{b.batch_number}</td>
                      <td>{PRODUCT_NAMES[b.product_type]}</td>
                      <td>{formatNumber(b.quantity_produced)} {b.unit}</td>
                      <td><span className="badge badge-success">✅ Tayyor</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🏭</div>
              <p>Bugun partiya yo'q</p>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🤖 AI Tavsiyalar</div>
              <div className="card-subtitle">Sun'iy intellekt tahlili</div>
            </div>
          </div>
          {insights.length > 0 ? insights.map((ins, i) => (
            <div key={i} className={`alert alert-${ins.severity === 'success' ? 'success' : ins.severity === 'warning' ? 'warning' : 'info'}`} style={{ marginBottom: 12 }}>
              <div className="alert-icon">{ins.icon}</div>
              <div>
                <strong style={{ fontSize: 13 }}>{ins.title}</strong>
                <p style={{ fontSize: 12, marginTop: 2 }}>{ins.message}</p>
                {ins.recommendation && (
                  <p style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>💡 {ins.recommendation}</p>
                )}
              </div>
            </div>
          )) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '📊', text: 'Ishlab chiqarish ko\'rsatkichlari normada', color: 'success' },
                { icon: '💰', text: 'Smetana eng yuqori marjali mahsulot (55%)', color: 'info' },
                { icon: '⚠️', text: 'Tvorog zaxirasini tekshiring', color: 'warning' },
              ].map((tip, i) => (
                <div key={i} className={`alert alert-${tip.color}`}>
                  <span>{tip.icon}</span>
                  <span style={{ fontSize: 13 }}>{tip.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventory by product */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📊 Mahsulot zaxiralari</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {['milk', 'yogurt', 'tvorog', 'smetana'].map(pt => {
            const inv = inventory.find(i => i.product_type === pt);
            const stock = parseFloat(inv?.total_available || 0);
            const threshold = parseFloat(inv?.low_stock_threshold || 50);
            const pct = Math.min(100, (stock / Math.max(threshold * 3, 1)) * 100);
            const isLow = stock <= threshold;
            return (
              <div key={pt} style={{ padding: 16, background: 'var(--bg)', borderRadius: 12, border: isLow ? '2px solid var(--danger)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{PRODUCT_NAMES[pt]}</span>
                  {isLow && <span className="badge badge-danger">Kam!</span>}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: PRODUCT_COLORS[pt] }}>{stock.toFixed(1)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>kg / litr</div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${pct}%`, background: isLow ? 'var(--danger)' : PRODUCT_COLORS[pt] }}></div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Min: {threshold} kg</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
