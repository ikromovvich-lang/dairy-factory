import React, { useState, useEffect } from 'react';
import { farmersAPI } from '../services/api';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY = { name: '', phone: '', location: '', region: '', bank_account: '', price_per_liter: 3500, notes: '' };

export default function FarmersPage() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editFarmer, setEditFarmer] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const load = async () => {
    try {
      const { data } = await farmersAPI.getAll({ search });
      setFarmers(data);
    } catch { toast.error('Xatolik'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setForm(EMPTY); setEditFarmer(null); setShowModal(true); };
  const openEdit = (f) => { setForm(f); setEditFarmer(f); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editFarmer) { await farmersAPI.update(editFarmer.id, form); toast.success('Fermer yangilandi'); }
      else { await farmersAPI.create(form); toast.success('Fermer qo\'shildi'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Fermerni o\'chirmoqchimisiz?')) return;
    await farmersAPI.delete(id);
    toast.success('O\'chirildi'); load();
  };

  const openStats = async (farmer) => {
    try {
      const { data } = await farmersAPI.getStats(farmer.id);
      setSelectedFarmer(data);
    } catch { toast.error('Xatolik'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>🧑‍🌾 Fermerlar bazasi</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{farmers.length} ta faol fermer</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>➕ Yangi fermer</button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <input
          type="text" className="form-input" placeholder="🔍 Ism yoki telefon bo'yicha qidirish..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-screen"><div className="spinner"></div></div>
        ) : farmers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧑‍🌾</div>
            <h3>Fermerlar topilmadi</h3>
            <p>Yangi fermer qo'shing</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fermer</th><th>Telefon</th><th>Joylashuv</th>
                  <th>Narx (L)</th><th>Bu oy (L)</th><th>Bu oy to'lov</th><th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.region}</div>
                    </td>
                    <td>{f.phone}</td>
                    <td style={{ fontSize: 13 }}>{f.location || '—'}</td>
                    <td>{formatCurrency(f.price_per_liter)}</td>
                    <td>{formatNumber(f.liters_this_month || 0, 0)} L</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(f.payment_this_month || 0)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openStats(f)}>📊</button>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(f)}>✏️</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleDelete(f.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editFarmer ? '✏️ Fermerni tahrirlash' : '➕ Yangi fermer'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ism Familiya *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefon *</label>
                    <input className="form-input" value={form.phone} placeholder="+998901234567" onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Viloyat</label>
                    <select className="form-select" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}>
                      <option value="">Tanlang</option>
                      {['Toshkent','Samarqand','Buxoro','Farg\'ona','Andijon','Namangan','Qashqadaryo','Surxondaryo','Jizzax','Sirdaryo','Navoiy','Xorazm','Qoraqalpog\'iston'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manzil</label>
                    <input className="form-input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">1 litr narxi (so'm)</label>
                    <input type="number" className="form-input" value={form.price_per_liter} onChange={e => setForm(p => ({ ...p, price_per_liter: e.target.value }))} min="1000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank hisob raqami</label>
                    <input className="form-input" value={form.bank_account} onChange={e => setForm(p => ({ ...p, bank_account: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Izoh</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Bekor</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳...' : editFarmer ? '💾 Saqlash' : '➕ Qo\'shish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {selectedFarmer && (
        <div className="modal-overlay" onClick={() => setSelectedFarmer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📊 {selectedFarmer.name}</h3>
              <button className="modal-close" onClick={() => setSelectedFarmer(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Jami yetkazmalar', value: selectedFarmer.total_deliveries || 0, icon: '🚚' },
                  { label: 'Jami sut (L)', value: `${formatNumber(selectedFarmer.total_liters || 0, 0)} L`, icon: '🥛' },
                  { label: "To'langan", value: formatCurrency(selectedFarmer.total_payment || 0), icon: '✅' },
                  { label: "To'lanmagan", value: formatCurrency(selectedFarmer.outstanding_payment || 0), icon: '⏳', danger: parseFloat(selectedFarmer.outstanding_payment) > 0 },
                ].map((s, i) => (
                  <div key={i} style={{ padding: 16, background: s.danger ? 'rgba(230,57,70,0.08)' : 'var(--bg)', borderRadius: 12, border: s.danger ? '1px solid var(--danger)' : '1px solid var(--border)' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <h4 style={{ marginBottom: 12, fontSize: 14 }}>📋 So'nggi yetkazmalar</h4>
              <div className="table-container" style={{ maxHeight: 240, overflow: 'auto' }}>
                <table>
                  <thead><tr><th>Sana</th><th>Litr</th><th>Yog'</th><th>Sifat</th><th>To'lov</th></tr></thead>
                  <tbody>
                    {(selectedFarmer.recent_deliveries || []).map(d => (
                      <tr key={d.id}>
                        <td style={{ fontSize: 12 }}>{formatDate(d.delivery_date, true)}</td>
                        <td>{d.liters} L</td>
                        <td>{d.fat_percent}%</td>
                        <td><span className={`badge badge-${d.quality_grade === 'premium' ? 'success' : d.quality_grade === 'first' ? 'info' : d.quality_grade === 'second' ? 'warning' : 'danger'}`}>{d.quality_grade}</span></td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(d.total_payment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
