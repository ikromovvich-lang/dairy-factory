const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

async function generateBatchQR(batch) {
  const qrData = {
    batchId: batch.batch_number,
    product: batch.product_type,
    produced: batch.production_date,
    expires: batch.expiration_date,
    quantity: `${batch.quantity_produced} ${batch.unit}`,
    fat: batch.fat_content ? `${batch.fat_content}%` : 'N/A',
    factory: 'Sut Kombinati',
    verify: `https://dairy.uz/verify/${batch.batch_number}`,
  };

  const qrString = JSON.stringify(qrData);

  // Generate QR as data URL (base64 PNG)
  const qrDataUrl = await QRCode.toDataURL(qrString, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    width: 300,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });

  // Also save to file
  const uploadsDir = path.join(__dirname, '../uploads/qrcodes');
  await fs.mkdir(uploadsDir, { recursive: true });
  const fileName = `qr_${batch.batch_number}.png`;
  const filePath = path.join(uploadsDir, fileName);
  
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  await fs.writeFile(filePath, base64Data, 'base64');

  return {
    dataUrl: qrDataUrl,
    filePath: `/uploads/qrcodes/${fileName}`,
    data: qrData,
  };
}

module.exports = { generateBatchQR };
