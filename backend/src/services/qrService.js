const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const QR_DIR = path.join(__dirname, '../../qrcodes');
(async () => { await fs.mkdir(QR_DIR, { recursive: true }); })();

async function generateBatchQR(batchNumber, data) {
  const filename = `${batchNumber}.png`;
  const filepath = path.join(QR_DIR, filename);
  const content = `SUT ZAVODI | ${data.batchNumber} | ${data.product} | Yaroqli: ${data.expiryDate} | ${data.quantity}`;
  await QRCode.toFile(filepath, content, { errorCorrectionLevel:'H', type:'png', quality:1, margin:2, color:{dark:'#1a472a',light:'#ffffff'}, width:400 });
  return `/qrcodes/${filename}`;
}
async function generateQRBase64(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return await QRCode.toDataURL(content, { errorCorrectionLevel:'M', width:300, color:{dark:'#1a472a',light:'#ffffff'} });
}
module.exports = { generateBatchQR, generateQRBase64 };
