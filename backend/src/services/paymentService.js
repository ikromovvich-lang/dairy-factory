const QUALITY = { premium: 1.20, first: 1.10, second: 1.00, rejected: 0.00 };
const FAT_BONUS = [
  { min: 4.5, bonus: 500 }, { min: 4.0, bonus: 300 },
  { min: 3.6, bonus: 150 }, { min: 3.2, bonus: 0 }, { min: 0, bonus: -200 }
];

const calculatePayment = (liters, fat, grade, basePrice) => {
  const mult = QUALITY[grade] || 1.0;
  const bonus = FAT_BONUS.find(t => fat >= t.min)?.bonus || 0;
  const effective = basePrice * mult + bonus;
  return {
    base_price: basePrice, quality_multiplier: mult,
    fat_bonus: bonus, effective_price: effective,
    total_payment: parseFloat((liters * Math.max(effective, 0)).toFixed(2))
  };
};

module.exports = { calculatePayment };
