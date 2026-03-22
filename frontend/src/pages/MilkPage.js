import React, { useState, useEffect } from 'react';
import { milkAPI, farmersAPI } from '../services/api';
import { formatCurrency, formatDate, QUALITY_LABELS, today } from '../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY = { farmer_id: '', liters: '', fat_percent: '', protein_percent: '', temperature: '4', quality_grade: 'first', notes: '' };

export default function MilkPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState(today());
  const [tab, setTab] = useState('list');
  const [preview, setPreview] = useState(null);

  const loadAll = async () => {
    try {
      const [d, f, r] = await Promise.all([
        milkAPI.getAll({ date: filterDate }),
        farmersAPI.getAll(),
        milkAPI.dailyReport(filterDate),
      ]);
      setDeliveries(d.data.deliveries || []);
      setFarmers(f.data);
      setReport(r.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [filterDate]);

  // Live payment preview
  useEffect(() => {
    if (form.farmer_id && form.liters && form.fat_percent) {
      const farmer = farmers.find(f => f.id === form.farmer_id);
      if (!farmer) return;
      const multipliers = { premium: 1.15, first: 1.0, second: 0.85, rejected: 0 };
      const mult = multipliers[form.quality_grade] || 1;
      const price = farmer.price_per_liter * mult;
      const total = parseFloat(form.liters) * price;
      setPreview({ price: price.toFixed(0), total: total.toFixed(0), farmer });
    } else { setPreview(null); }
  }, [form.farmer_id, form.liters, form.fat_percent, form.quality_grade, farmers]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await milkAPI.create(form);
      toast.success('Sut qabul qilindi! 🥛');
      setShowModal(false);
      setForm(EMPTY);
      setPreview(null);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handlePay = async (id) => {
    await milkAPI.markPaid(id);
    toast.success("To'lov amalga oshirildi ✅");
    loadAll();
  };

  const rpt = report?.summary;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>🥛 Sut Qabul Qilish</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Fermerlardan sut qabul qilish va hisob-kitob</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="date" className="form-input" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: 180 }} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Sut qabul qilish</button>
        </div>
      </div>

      {/* Summary */}
      {rpt && (
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          {[
            { icon: '🥛', label: 'Jami sut', value: `${parseFloat(rpt.total_liters || 0).toFixed(0)} L`, color: '#00b4d8' },
            { icon: '🚚', label: 'Yetkazmalar', value: rpt.delivery_count || 0, color: '#2d9e5f' },
            { icon: '📊', label: "O'rtacha yog'", value: `${parseFloat(rpt.avg_fat || 0).toFixed(2)}%`, color: '#f4a261' },
            { icon: '💰', label: "Jami to'lov", value: formatCurrency(rpt.total_payment || 0), color: '#e63946' },
          ].map((k, i) => (
            <div key={i} className="kpi-card" style={{ '--kpi-color': k.color }}>
              <div className="kpi-icon" style={{ background: k.color + '20' }}>{k.icon}</div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quality breakdown */}
      {rpt && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>🏆 Sifat bo'yicha taqsimot</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Premium', key: 'premium_liters', color: 'var(--success)' },
              { label: '1-sort', key: 'first_liters', color: 'var(--accent)' },
              { label: '2-sort', key: 'second_liters', color: 'var(--warning)' },
              { label: 'Rad etildi', key: 'rejected_liters', color: 'var(--danger)' },
            ].map(q => {
              const v = parseFloat(rpt[q.key] || 0);
              const total = parseFloat(rpt.total_liters || 1);
              const pct = ((v / total) * 100).toFixed(0);
              return (
                <div key={q.key} style={{ textAlign: 'center', padding: 12, background: 'var(--bg)', borderRadius: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: q.color }}>{v.toFixed(0)} L</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>{q.label}</div>
                  <div className="progress"><div className="progress-bar" style={{ width: `${pct}%`, background: q.color }}></div></div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Yetkazmalar ro'yxati</div>
          <span className="badge badge-info">{deliveries.length} ta</span>
        </div>
        {loading ? (
          <div className="loading-screen"><div className="spinner"></div></div>
        ) : deliveries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🥛</div>
            <h3>Bu kun yetkazma yo'q</h3>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Vaqt</th><th>Fermer</th><th>Litr</th><th>Yog'%</th><th>Sifat</th><th>Narx/L</th><th>Jami</th><th>To'lov</th></tr>
              </thead>
              <tbody>
                {deliveries.map(d => {
                  const q = QUALITY_LABELS[d.quality_grade];
                  return (
                    <tr key={d.id}>
                      <td style={{ fontSize: 12 }}>{formatDate(d.delivery_date, true)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.farmer_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.farmer_location}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{d.liters} L</td>
                      <td>{d.fat_percent}%</td>
                      <td><span className={`badge badge-${q?.color}`}>{q?.label}</span></td>
                      <td>{formatCurrency(d.price_per_liter)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(d.total_payment)}</td>
                      <td>
                        {d.is_paid ? (
                          <span className="badge badge-success">✅ To'landi</span>
                        ) : (
                          <button className="btn btn-success btn-sm" onClick={() => handlePay(d.id)}>To'lash</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🥛 Sut qabul qilish</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Fermer *</label>
                  <select className="form-select" value={form.farmer_id} onChange={e => setForm(p => ({ ...p, farmer_id: e.target.value }))} required>
                    <option value="">Fermerni tanlang</option>
                    {farmers.map(f => <option key={f.id} value={f.id}>{f.name} — {f.phone}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Litr (L) *</label>
                    <input type="number" className="form-input" value={form.liters} onChange={e => setForm(p => ({ ...p, liters: e.target.value }))} min="1" step="0.1" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yog' % *</label>
                    <input type="number" className="form-input" value={form.fat_percent} onChange={e => setForm(p => ({ ...p, fat_percent: e.target.value }))} min="0" max="10" step="0.1" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Oqsil %</label>
                    <input type="number" className="form-input" value={form.protein_percent} onChange={e => setForm(p => ({ ...p, protein_percent: e.target.value }))} min="0" max="10" step="0.1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harorat (°C)</label>
                    <input type="number" className="form-input" value={form.temperature} onChange={e => setForm(p => ({ ...p, temperature: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sifat darajasi</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {Object.entries(QUALITY_LABELS).map(([k, v]) => (
                      <button key={k} type="button"
                        onClick={() => setForm(p => ({ ...p, quality_grade: k }))}
                        className={`btn btn-sm ${form.quality_grade === k ? `btn-${v.color === 'success' ? 'success' : v.color === 'info' ? 'accent' : v.color === 'warning' ? '' : 'danger'}` : 'btn-outline'}`}
                        style={form.quality_grade === k && v.color === 'warning' ? { background: 'var(--warning)', color: 'white' } : {}}
                      >{v.label}</button>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                {preview && (
                  <div className="alert alert-info">
                    <span>💰</span>
                    <div>
                      <strong>Hisob-kitob:</strong>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        {form.liters} L × {formatCurrency(preview.price)} = <strong style={{ color: 'var(--success)' }}>{formatCurrency(preview.total)}</strong>
                        {form.quality_grade !== 'first' && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                            (sifat koeffitsienti qo'llanildi)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Izoh</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saqlanmoqda...' : '✅ Qabul qilish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
