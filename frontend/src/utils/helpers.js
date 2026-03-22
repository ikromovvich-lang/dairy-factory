export const PRODUCT_LABELS = {
  milk: 'Sut 🥛',
  yogurt: 'Yogurt 🫙',
  tvorog: 'Tvorog 🧀',
  smetana: 'Smetana 🫕'
};

export const PRODUCT_COLORS = {
  milk: '#e8f4f8',
  yogurt: '#ffd166',
  tvorog: '#f4a261',
  smetana: '#48cae4'
};

export const QUALITY_LABELS = {
  premium: 'Premium ⭐',
  first: 'Birinchi 🟢',
  second: 'Ikkinchi 🟡',
  rejected: 'Rad etildi 🔴'
};

export const ROLE_LABELS = {
  admin: 'Admin 👑',
  manager: 'Menejer 💼',
  worker: 'Ishchi 🔧'
};

export const formatNumber = (n, dec = 0) =>
  n == null ? '—' : Number(n).toLocaleString('uz-UZ', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });

export const formatCurrency = (n) =>
  n == null ? '—' : `${formatNumber(n)} so'm`;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) : '—';

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—';

export const daysUntilExpiry = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d) - Date.now()) / 86400000);
};

export const getExpiryColor = (d) => {
  const days = daysUntilExpiry(d);
  if (days == null) return '';
  if (days <= 0) return 'var(--danger)';
  if (days <= 2) return 'var(--danger)';
  if (days <= 5) return 'var(--warning)';
  return 'var(--success)';
};

export const productClass = (type) => `product-${type}`;
export const qualityClass = (grade) => `quality-${grade}`;
export const timeAgo = (d) => {
  if (!d) return '—';
  const seconds = Math.floor((Date.now() - new Date(d)) / 1000);
  if (seconds < 60) return 'Hozirgina';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
};
export const today = () => new Date().toISOString().split('T')[0];

export const todayFormatted = () =>
  new Date().toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

export const getExpiryBadge = (d) => {
  const days = daysUntilExpiry(d);
  if (days == null) return { text: '—', class: '' };
  if (days <= 0) return { text: '⛔ Tugagan', class: 'badge-danger' };
  if (days <= 2) return { text: `⚠️ ${days} kun`, class: 'badge-danger' };
  if (days <= 5) return { text: `⏰ ${days} kun`, class: 'badge-warning' };
  return { text: `✅ ${days} kun`, class: 'badge-success' };
};

export const getStatusBadge = (status) => {
  const map = {
    completed: { text: '✅ Tayyor', class: 'badge-success' },
    in_progress: { text: '⚙️ Jarayonda', class: 'badge-warning' },
    planned: { text: '📋 Rejalashtirilgan', class: 'badge-info' },
    rejected: { text: '❌ Rad etildi', class: 'badge-danger' },
    pending: { text: '⏳ Kutilmoqda', class: 'badge-warning' },
    delivered: { text: '✅ Yetkazildi', class: 'badge-success' },
    cancelled: { text: '❌ Bekor', class: 'badge-danger' },
  };
  return map[status] || { text: status, class: 'badge-info' };
};

export const formatPercent = (n) =>
  n == null ? '—' : `${parseFloat(n).toFixed(1)}%`;

export const sumBy = (arr, key) =>
  arr.reduce((a, b) => a + parseFloat(b[key] || 0), 0);

export const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const group = item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
export const PRODUCT_NAMES = {
  milk: 'Sut',
  yogurt: 'Yogurt',
  tvorog: 'Tvorog',
  smetana: 'Smetana'
};
