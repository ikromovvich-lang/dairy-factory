import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: 'admin@dairy.uz', password: 'Admin2024!' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Xush kelibsiz! 🥛');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Kirish xatoligi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-big">🥛</div>
          <h1>SutFactory Pro</h1>
          <p>Sut kombinati boshqaruv tizimi</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" className="form-input"
              value={form.email} placeholder="admin@dairy.uz"
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Parol</label>
            <input
              type="password" className="form-input"
              value={form.password} placeholder="••••••••"
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, height: 48 }}
            disabled={loading}
          >
            {loading ? '⏳ Kirilmoqda...' : '🔐 Kirish'}
          </button>
        </form>

        <div style={{ marginTop: 28, padding: '16px', background: 'var(--bg)', borderRadius: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Demo kirish:</p>
          <p style={{ fontSize: 12 }}>📧 <strong>admin@dairy.uz</strong></p>
          <p style={{ fontSize: 12 }}>🔑 <strong>Admin2024!</strong></p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            🔒 256-bit SSL himoyalangan • v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}
