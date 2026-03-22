import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { formatNumber, PRODUCT_LABELS, PRODUCT_COLORS } from '../utils/helpers';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import toast from 'react-hot-toast';
import axios from 'axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1a2a3a', border:'1px solid #2a3f55', borderRadius:8, padding:'8px 12px', fontSize:'.8rem' }}>
      <p style={{ color:'#8bacc0', marginBottom:4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color:p.color }}>{p.name}: <strong>{formatNumber(p.value)}</strong></p>)}
    </div>
  );
};

export default function AnalyticsPage() {
  const [trends, setTrends] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [salesForecast, setSalesForecast] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forecastDays, setForecastDays] = useState(7);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      analyticsAPI.getTrends(30),
      analyticsAPI.getForecast({ days: forecastDays }),
      analyticsAPI.getSalesForecast(),
      analyticsAPI.getOptimization(),
      axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/analytics/optimize`),
    ]).then(([t, f, sf, o]) => {
      setTrends(t.data);
      setForecast(f.data);
      setSalesForecast(sf.data);
      setOptimization(o.data);
    }).catch(() => {}).finally(() => setLoading(false));

    // Load AI insights
    fetch(`${process.env.REACT_APP_AI_URL || 'http://localhost:8000'}/insights/factory1`)
      .then(r => r.json()).then(d => setInsights(d.insights || [])).catch(() => {
        setInsights([
          { type:'efficiency', icon:'📊', title:'Ishlab chiqarish tahlili', message:'Tvorog hosildorligi optimal (12%).',recommendation:'Davom ettiring', severity:'success' },
          { type:'demand', icon:'📈', title:'Smetana talabi oshmoqda', message:'23% o\'sish kuzatildi.', recommendation:'Ishlab chiqarishni oshiring', severity:'info' },
        ]);
      });
  }, [forecastDays]);

  const milkForecastData = forecast?.forecast || [];
  const salesData = trends?.sales_trend?.map(d => ({ date: d.date?.slice(5), daromad: parseFloat(d.revenue || 0) / 1000 })) || [];

  const productionByType = trends?.production_trend
    ? ['milk','yogurt','tvorog','smetana'].map(type => ({
        product: PRODUCT_LABELS[type],
        qty: trends.production_trend.filter(t => t.product_type === type).reduce((a, b) => a + parseFloat(b.quantity || 0), 0),
      }))
    : [];

  const tabs = [
    { id:'overview', label:'📊 Umumiy' },
    { id:'forecast', label:'🔮 Bashorat' },
    { id:'ai', label:'🤖 AI Maslahat' },
    { id:'optimize', label:'⚙️ Optimizatsiya' },
  ];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem' }}>🤖</div>
        <div className="spinner" style={{ marginTop:'1rem' }} />
        <p style={{ marginTop:'1rem', color:'var(--text2)' }}>AI tahlil yuklanmoqda...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.5rem', marginBottom:'.25rem' }}>🤖 AI Tahlil & Bashorat</h1>
        <p style={{ color:'var(--text2)', fontSize:'.875rem' }}>Sun'iy intellekt asosida ishlab chiqarish va sotuv prognozi</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.5rem', borderBottom:'1px solid var(--border)', paddingBottom:'0' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding:'.6rem 1.25rem', border:'none', background:'none', cursor:'pointer',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text2)',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === t.id ? 700 : 400, fontSize:'.875rem',
              marginBottom:'-1px', transition:'all .2s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-2" style={{ marginBottom:'1.5rem' }}>
            <div className="chart-container">
              <div className="chart-title">📈 30 kunlik sut qabuli</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trends?.milk_trend?.map(d => ({ date: d.date?.slice(5), litr: parseFloat(d.liters||0) })) || []}>
                  <defs><linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00b4d8" stopOpacity={0.3}/><stop offset="95%" stopColor="#00b4d8" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3f55" />
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#8bacc0' }} />
                  <YAxis tick={{ fontSize:10, fill:'#8bacc0' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="litr" name="Sut (L)" stroke="#00b4d8" fill="url(#milkGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-container">
              <div className="chart-title">💰 30 kunlik daromad (ming so'm)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3f55" />
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#8bacc0' }} />
                  <YAxis tick={{ fontSize:10, fill:'#8bacc0' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="daromad" name="Daromad" fill="#06d6a0" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-container">
            <div className="chart-title">🏭 Mahsulot turlariga ko'ra ishlab chiqarish</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={productionByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3f55" />
                <XAxis type="number" tick={{ fontSize:10, fill:'#8bacc0' }} />
                <YAxis type="category" dataKey="product" tick={{ fontSize:11, fill:'#8bacc0' }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="qty" name="Miqdor" fill="#48cae4" radius={[0,4,4,0]}>
                  {productionByType.map((e, i) => (
                    <rect key={i} fill={Object.values(PRODUCT_COLORS)[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'forecast' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem' }}>
            <span style={{ color:'var(--text2)', fontSize:'.875rem' }}>Prognoz davri:</span>
            {[7, 14, 30].map(d => (
              <button key={d} className={`btn btn-sm ${forecastDays === d ? 'btn-accent' : 'btn-ghost'}`}
                onClick={() => setForecastDays(d)}>{d} kun</button>
            ))}
            {forecast && (
              <span style={{ marginLeft:'auto', fontSize:'.8rem', color:'var(--text2)' }}>
                📡 Model: <strong>{forecast.model}</strong> | Aniqlik: <strong style={{ color:'var(--success)' }}>{forecast.accuracy}%</strong>
              </span>
            )}
          </div>

          <div className="chart-container" style={{ marginBottom:'1.5rem' }}>
            <div className="chart-title">🔮 Sut talabi bashorati</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={milkForecastData}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd166" stopOpacity={0.3}/><stop offset="95%" stopColor="#ffd166" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3f55" />
                <XAxis dataKey="ds" tick={{ fontSize:10, fill:'#8bacc0' }} />
                <YAxis tick={{ fontSize:10, fill:'#8bacc0' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="yhat_upper" name="Maksimum" stroke="none" fill="url(#forecastGrad)" opacity={0.4} />
                <Line type="monotone" dataKey="yhat" name="Prognoz (L)" stroke="#ffd166" strokeWidth={2.5} dot={{ r:4, fill:'#ffd166' }} />
                <Line type="monotone" dataKey="yhat_lower" name="Minimum" stroke="#ffd16660" strokeWidth={1} dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
            {forecast?.insights && (
              <div style={{ display:'flex', gap:'1rem', marginTop:'1rem', flexWrap:'wrap' }}>
                <div style={{ background:'var(--bg2)', borderRadius:8, padding:'.75rem 1rem', flex:1 }}>
                  <div style={{ fontSize:'.75rem', color:'var(--text2)' }}>O'rtacha prognoz</div>
                  <div style={{ fontWeight:700, color:'var(--accent)' }}>{formatNumber(forecast.insights.avg_predicted)} L/kun</div>
                </div>
                <div style={{ background:'var(--bg2)', borderRadius:8, padding:'.75rem 1rem', flex:1 }}>
                  <div style={{ fontSize:'.75rem', color:'var(--text2)' }}>Eng yuqori kun</div>
                  <div style={{ fontWeight:700, color:'var(--warning)' }}>{forecast.insights.peak_day}</div>
                </div>
                <div style={{ background:'var(--bg2)', borderRadius:8, padding:'.75rem 1rem', flex:1 }}>
                  <div style={{ fontSize:'.75rem', color:'var(--text2)' }}>Tendensiya</div>
                  <div style={{ fontWeight:700, color:'var(--success)' }}>{forecast.trend}</div>
                </div>
              </div>
            )}
          </div>

          {salesForecast?.forecast && (
            <div className="grid grid-2">
              {Object.entries(salesForecast.forecast).map(([product, data]) => (
                <div key={product} className="chart-container">
                  <div className="chart-title">{PRODUCT_LABELS[product]} — Sotuv bashorati</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data}>
                      <XAxis dataKey="ds" tick={{ fontSize:9, fill:'#8bacc0' }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fontSize:9, fill:'#8bacc0' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="yhat" name="Prognoz" fill={PRODUCT_COLORS[product]} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Insights Tab */}
      {activeTab === 'ai' && (
        <div>
          <div style={{ marginBottom:'1rem', padding:'1rem', background:'rgba(0,180,216,.08)', borderRadius:10, border:'1px solid rgba(0,180,216,.2)' }}>
            <div style={{ fontSize:'.875rem', color:'var(--text2)' }}>
              🤖 <strong style={{ color:'var(--accent)' }}>AI tahlil tizimi</strong> — Mahsulot sarfi, savdo tendensiyalari va sifat ko'rsatkichlari asosida avtomatik maslahatlar
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {insights.map((insight, i) => (
              <div key={i} className={`alert-banner alert-${insight.severity === 'success' ? 'success' : insight.severity === 'warning' ? 'warning' : 'info'}`}>
                <span style={{ fontSize:'1.5rem' }}>{insight.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, marginBottom:'.25rem' }}>{insight.title}</div>
                  <div style={{ fontSize:'.875rem', color:'var(--text2)', marginBottom:'.5rem' }}>{insight.message}</div>
                  <div style={{ fontSize:'.85rem', fontWeight:600, color: insight.severity === 'success' ? 'var(--success)' : insight.severity === 'warning' ? 'var(--warning)' : 'var(--accent)' }}>
                    💡 {insight.recommendation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Tab */}
      {activeTab === 'optimize' && optimization && (
        <div>
          <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'1rem 1.5rem', flex:1 }}>
              <div style={{ fontSize:'.75rem', color:'var(--text2)' }}>Mavjud sut</div>
              <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--accent)' }}>{formatNumber(optimization.available_milk_liters)} L</div>
            </div>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'1rem 1.5rem', flex:1 }}>
              <div style={{ fontSize:'.75rem', color:'var(--text2)' }}>Tavsiya etilgan sarif</div>
              <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--warning)' }}>{formatNumber(optimization.total_milk_needed)} L</div>
            </div>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'1rem 1.5rem', flex:1 }}>
              <div style={{ fontSize:'.75rem', color:'var(--text2)' }}>Optimizatsiya darajasi</div>
              <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--success)' }}>{optimization.optimization_score}%</div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {optimization.recommendations?.length === 0 ? (
              <div className="alert-banner alert-success"><span>✅</span><div>Barcha mahsulotlar zaxirasi yetarli. Hozircha qo'shimcha ishlab chiqarish tavsiya etilmaydi.</div></div>
            ) : optimization.recommendations?.map((rec, i) => (
              <div key={i} style={{ background:'var(--card)', border:`1px solid ${rec.priority === 'urgent' ? 'rgba(239,71,111,.4)' : rec.priority === 'high' ? 'rgba(255,209,102,.4)' : 'var(--border)'}`, borderRadius:12, padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.75rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
                    <span className={`product-pill product-${rec.product_type}`}>{PRODUCT_LABELS[rec.product_type]}</span>
                    <span className={`badge ${rec.priority === 'urgent' ? 'badge-danger' : rec.priority === 'high' ? 'badge-warning' : 'badge-info'}`}>
                      {rec.priority === 'urgent' ? '🚨 Shoshilinch' : rec.priority === 'high' ? '⚠️ Muhim' : '💡 Tavsiya'}
                    </span>
                  </div>
                  <span style={{ fontSize:'.8rem', color:'var(--text2)' }}>Marja: <strong style={{ color:'var(--success)' }}>{rec.profit_margin}</strong></span>
                </div>
                <p style={{ fontSize:'.875rem', color:'var(--text2)', marginBottom:'.75rem' }}>{rec.reason}</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', background:'var(--bg2)', borderRadius:8, padding:'.75rem' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>Joriy zaxira</div>
                    <div style={{ fontWeight:700 }}>{formatNumber(rec.current_stock)} kg</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>Sut sarfi</div>
                    <div style={{ fontWeight:700, color:'var(--accent)' }}>{formatNumber(rec.milk_liters)} L</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>Hosil</div>
                    <div style={{ fontWeight:700, color:'var(--success)' }}>{formatNumber(rec.expected_yield)} kg</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
