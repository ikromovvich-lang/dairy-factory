import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { productionAPI } from '../services/api';
import { formatDate, formatNumber, PRODUCT_NAMES, PRODUCT_COLORS, getExpiryBadge } from '../utils/helpers';
import toast from 'react-hot-toast';

const PRODUCTS = [
  { type: 'milk', name: 'Sut', icon: '🥛', ratio: 0.97, shelf: 7, desc: '1L sut → 0.97L sut' },
  { type: 'yogurt', name: 'Yogurt', icon: '🍦', ratio: 0.85, shelf: 14, desc: '1L sut → 850g yogurt' },
  { type: 'tvorog', name: 'Tvorog', icon: '🧀', ratio: 0.12, shelf: 5, desc: '1L sut → 120g tvorog' },
  { type: 'smetana', name: 'Smetana', icon: '🍶', ratio: 0.25, shelf: 10, desc: '1L sut → 250g smetana' },
];

const EMPTY = { product_type: 'milk', milk_used_liters: '', fat_content: '', notes: '' };

export default function ProductionPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [qrBatch, setQrBatch] = useState(null);
  const [filterType, setFilterType] = useState('');

  const load = async () => {
    try {
      const { data } = await productionAPI.getAll({ product_type: filterType || undefined });
      setBatches(data.batches || []);
    } catch { toast.error('Xatolik'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType]);

  const selectedProduct = PRODUCTS.find(p => p.type === form.product_type);
  const expectedYield = form.milk_used_liters ? (parseFloat(form.milk_used_liters) * (selectedProduct?.ratio || 1)).toFixed(2) : null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.milk_used_liters || parseFloat(form.milk_used_liters) < 1) {
      toast.error('Sut miqdori kiritilishi shart'); return;
    }
    setSaving(true);
    try {
      const { data } = await productionAPI.create(form);
      toast.success(`✅ Partiya tayyor! ${data.batch_number}`);
      setShowModal(false);
      setForm(EMPTY);
      setQrBatch(data);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>🏭 Ishlab Chiqarish</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Mahsulot partiyalarini boshqarish</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Yangi partiya</button>
      </div>

      {/* Product filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn btn-sm ${!filterType ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterType('')}>Barchasi</button>
        {PRODUCTS.map(p => (
          <button key={p.type} className={`btn btn-sm ${filterType === p.type ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterType(p.type)}>
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : batches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏭</div>
          <h3>Partiyalar yo'q</h3>
          <p>Yangi partiya yarating</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {batches.map(b => {
            const expiry = getExpiryBadge(b.expiration_date);
            const product = PRODUCTS.find(p => p.type === b.product_type);
            return (
              <div key={b.id} className="card" style={{ border: `2px solid ${PRODUCT_COLORS[b.product_type]}25` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 24 }}>{product?.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>{product?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{b.batch_number}</div>
                  </div>
                  {expiry && <span className={`badge badge-${expiry.color}`}>{expiry.text}</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Miqdor', value: `${formatNumber(b.quantity_produced)} ${b.unit}` },
                    { label: 'Sut sarfi', value: `${formatNumber(b.milk_used_liters)} L` },
                    { label: 'Sana', value: formatDate(b.production_date) },
                    { label: 'Yaroqlilik', value: formatDate(b.expiration_date) },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setQrBatch(b)}>
                    📱 QR Kod
                  </button>
                  <div style={{ padding: '6px 10px', background: 'rgba(45,158,95,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                    ✅ {b.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🏭 Yangi ishlab chiqarish partiyasi</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mahsulot turi</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {PRODUCTS.map(p => (
                      <button key={p.type} type="button"
                        onClick={() => setForm(pr => ({ ...pr, product_type: p.type }))}
                        className={`btn ${form.product_type === p.type ? 'btn-primary' : 'btn-outline'}`}
                        style={{ flexDirection: 'column', gap: 2, padding: '10px 6px', fontSize: 12 }}>
                        <span style={{ fontSize: 22 }}>{p.icon}</span>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedProduct && (
                  <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    <span>ℹ️</span>
                    <div>
                      <strong>{selectedProduct.desc}</strong>
                      <br />
                      <span style={{ fontSize: 12 }}>Yaroqlilik muddati: {selectedProduct.shelf} kun</span>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ishlatilgan sut (L) *</label>
                    <input type="number" className="form-input" value={form.milk_used_liters}
                      onChange={e => setForm(p => ({ ...p, milk_used_liters: e.target.value }))} min="1" step="0.1" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yog' miqdori (%)</label>
                    <input type="number" className="form-input" value={form.fat_content}
                      onChange={e => setForm(p => ({ ...p, fat_content: e.target.value }))} min="0" max="50" step="0.1" />
                  </div>
                </div>

                {expectedYield && (
                  <div style={{ padding: 14, background: 'rgba(45,158,95,0.08)', borderRadius: 12, border: '1px solid rgba(45,158,95,0.2)', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                      📊 Kutilayotgan hosil: <span style={{ fontSize: 18 }}>{expectedYield} {selectedProduct?.unit || 'kg'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Hosildorlik: {(selectedProduct?.ratio * 100).toFixed(0)}%
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
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Ishlanmoqda...' : '🏭 Ishlab chiqarish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrBatch && (
        <div className="modal-overlay" onClick={() => setQrBatch(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📱 QR Kod - {qrBatch.batch_number}</h3>
              <button className="modal-close" onClick={() => setQrBatch(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div className="qr-container">
                <QRCodeSVG
                  value={JSON.stringify({
                    batch: qrBatch.batch_number,
                    product: qrBatch.product_type,
                    produced: qrBatch.production_date,
                    expires: qrBatch.expiration_date,
                    qty: `${qrBatch.quantity_produced} ${qrBatch.unit}`,
                    factory: 'SutFactory Pro',
                  })}
                  size={220} level="M"
                  style={{ border: '4px solid white', borderRadius: 8, padding: 8, background: 'white' }}
                />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{PRODUCT_NAMES[qrBatch.product_type]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{qrBatch.batch_number}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Miqdori: <strong>{formatNumber(qrBatch.quantity_produced)} {qrBatch.unit}</strong>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Yaroqlilik: <strong>{formatDate(qrBatch.expiration_date)}</strong>
                  </div>
                </div>
              </div>
              <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => window.print()}>🖨️ Chop etish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
