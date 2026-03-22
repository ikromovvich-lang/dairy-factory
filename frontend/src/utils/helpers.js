export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export const formatNumber = (n, decimals = 1) => {
  if (!n && n !== 0) return '—';
  return parseFloat(n).toFixed(decimals).replace(/\.0$/, '');
};

export const formatDate = (date, includeTime = false) => {
  if (!date) return '—';
  const d = new Date(date);
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
  return d.toLocaleDateString('ru-RU', options);
};

export const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'hozir';
  if (diff < 3600) return `${Math.floor(diff/60)} daq oldin`;
  if (diff < 86400) return `${Math.floor(diff/3600)} soat oldin`;
  return `${Math.floor(diff/86400)} kun oldin`;
};

export const PRODUCT_NAMES = {
  milk: '🥛 Sut',
  yogurt: '🍦 Yogurt',
  tvorog: '🧀 Tvorog',
  smetana: '🍶 Smetana',
};

export const PRODUCT_COLORS = {
  milk: '#00b4d8',
  yogurt: '#f4a261',
  tvorog: '#2d9e5f',
  smetana: '#e63946',
};

export const QUALITY_LABELS = {
  premium: { label: 'Premium', color: 'success' },
  first: { label: '1-sort', color: 'info' },
  second: { label: '2-sort', color: 'warning' },
  rejected: { label: 'Rad etildi', color: 'danger' },
};

export const ROLE_LABELS = {
  admin: '👑 Admin',
  manager: '📋 Menejer',
  worker: '👷 Ishchi',
};

export const getDaysUntilExpiry = (date) => {
  if (!date) return null;
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
};

export const getExpiryBadge = (date) => {
  const days = getDaysUntilExpiry(date);
  if (days === null) return null;
  if (days < 0) return { color: 'danger', text: `${Math.abs(days)} kun o'tdi` };
  if (days === 0) return { color: 'danger', text: 'Bugun tugaydi' };
  if (days <= 2) return { color: 'danger', text: `${days} kun` };
  if (days <= 5) return { color: 'warning', text: `${days} kun` };
  return { color: 'success', text: `${days} kun` };
};

export const today = () => new Date().toISOString().split('T')[0];
