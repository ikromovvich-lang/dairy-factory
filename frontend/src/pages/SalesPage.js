import React, { useState, useEffect } from 'react';
import { salesAPI } from '../services/api';
import { formatNumber, formatCurrency, formatDateTime, PRODUCT_LABELS } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [form, setForm] = useState({ customer_id:'', items:[{ product_type:'milk', quantity:'', price_per_unit:5500, unit:'litr' }], payment_method:'naqd', notes:'' });

  const load = () => {
    setLoading(true);
    Promise.all([salesAPI.getAll({ limit:50 }), salesAPI.getCustomers()])
      .then(([s, c]) => { setSales(s.data.sales || []); setCustomers(c.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const PRICES = { milk:5500, yogurt:12000, tvorog:18000, smetana:15000 };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { product_type:'milk', quantity:'', price_per_unit:5500, unit:'litr' }] }));
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }));
  const updateItem = (i, field, val) => setForm(p => {
    const items = [...p.items];
    items[i] = { ...items[i], [field]: val };
    if (field === 'product_type') items[i].price_per_unit = PRICES[val] || 5500;
    return { ...p, items };
  });

  const totalAmount = form.items.reduce((a, item) => a + (parseFloat(item.quantity || 0) * parseFloat(item.price_per_unit || 0)), 0);

  const handleSubmit = async () => {
    if (!form.customer_id) return toast.error('Mijozni tanlang');
    if (!form.items.some(i => i.quantity > 0)) return toast.error('Mahsulot miqdorini kiriting');
    try {
      await salesAPI.create(form);
      toast.success('✅ Sotuv ro\'yxatga olindi!');
      setShowModal(false);
      setForm({ customer_id:'', items:[{ product_type:'milk', quantity:'', price_per_unit:5500, unit:'litr' }], payment_method:'naqd', notes:'' });
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Xatolik'); }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', marginBottom:'.25rem' }}>💰 Sotuvlar</h1>
          <p style={{ color:'var(--text2)', fontSize:'.875rem' }}>{sales.length} ta sotuv</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>+ Yangi sotuv</button>
      </div>

      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1rem', borderBottom:'1px solid var(--border)' }}>
        {[['sales','💰 Sotuvlar'], ['customers','🤝 Mijozlar']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'.6rem 1.25rem', border:'none', background:'none', cursor:'pointer', color: activeTab===id?'var(--accent)':'var(--text2)', borderBottom: activeTab===id?'2px solid var(--accent)':'2px solid transparent', fontWeight: activeTab===id?700:400, fontSize:'.875rem', marginBottom:'-1px' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && (
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Hisob-faktura</th><th>Sana</th><th>Mijoz</th><th>Summa</th><th>To'lov</th><th>Holat</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="6" style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{margin:'auto'}} /></td></tr>
                : sales.map(s => (
                  <tr key={s.id}>
                    <td><strong style={{ fontFamily:'monospace', color:'var(--accent)', fontSize:'.85rem' }}>{s.invoice_number}</strong></td>
                    <td style={{ fontSize:'.8rem', color:'var(--text2)' }}>{formatDateTime(s.sale_date)}</td>
                    <td>
                      <div style={{ fontWeight:600 }}>{s.customer_name}</div>
                      <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>{s.customer_type}</div>
                    </td>
                    <td style={{ fontWeight:700, color:'var(--success)' }}>{formatCurrency(s.final_amount)}</td>
                    <td style={{ fontSize:'.85rem' }}>{s.payment_method || '—'}</td>
                    <td>
                      <span className={`badge ${s.is_paid ? 'badge-success' : 'badge-warning'}`}>
                        {s.is_paid ? '✅ To\'landi' : '⏳ Kutilmoqda'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Mijoz</th><th>Turi</th><th>Telefon</th><th>Shahar</th><th>Chegirma</th><th>Holat</th></tr></thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td><span className="badge badge-info">{c.type === 'shop' ? '🏪 Do\'kon' : c.type === 'distributor' ? '🚛 Distribyutor' : c.type}</span></td>
                    <td style={{ fontFamily:'monospace' }}>{c.phone || '—'}</td>
                    <td>{c.city || '—'}</td>
                    <td>{c.discount_percent ? `${c.discount_percent}%` : '—'}</td>
                    <td><span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>{c.is_active ? '● Faol' : '○ Nofaol'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth:700 }}>
            <div className="modal-title">💰 Yangi sotuv</div>
            <div className="form-group" style={{ marginBottom:'1rem' }}>
              <label className="form-label">Mijoz *</label>
              <select className="input" value={form.customer_id} onChange={e => setForm(p => ({...p, customer_id:e.target.value}))}>
                <option value="">— Mijozni tanlang —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.type}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.75rem' }}>
                <label className="form-label" style={{ margin:0 }}>Mahsulotlar *</label>
                <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Qo'shish</button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:'.5rem', marginBottom:'.5rem', alignItems:'center' }}>
                  <select className="input" value={item.product_type} onChange={e => updateItem(i, 'product_type', e.target.value)}>
                    {['milk','yogurt','tvorog','smetana'].map(t => <option key={t} value={t}>{PRODUCT_LABELS[t]}</option>)}
                  </select>
                  <input type="number" className="input" placeholder="Miqdor (kg/L)" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  <input type="number" className="input" placeholder="Narx (so'm)" value={item.price_per_unit} onChange={e => updateItem(i, 'price_per_unit', e.target.value)} />
                  <button className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>✕</button>
                </div>
              ))}
            </div>

            <div className="grid grid-2" style={{ gap:'1rem', marginBottom:'1rem' }}>
              <div className="form-group">
                <label className="form-label">To'lov usuli</label>
                <select className="input" value={form.payment_method} onChange={e => setForm(p => ({...p, payment_method:e.target.value}))}>
                  <option value="naqd">💵 Naqd</option>
                  <option value="karta">💳 Karta</option>
                  <option value="bank">🏦 Bank o'tkazmasi</option>
                  <option value="nasiya">📝 Nasiya</option>
                </select>
              </div>
              <div style={{ background:'rgba(6,214,160,.1)', border:'1px solid rgba(6,214,160,.3)', borderRadius:8, padding:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'.75rem', color:'var(--text2)' }}>Jami summa</div>
                  <div style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--success)' }}>{formatCurrency(totalAmount)}</div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:'.75rem', justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Bekor qilish</button>
              <button className="btn btn-accent" onClick={handleSubmit}>✅ Sotuvni saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
