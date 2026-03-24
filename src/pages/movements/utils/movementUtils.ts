import { StockMovement } from '@/types/warehouse';

export const UNITS = ['قطعة', 'كرتون', 'علبة', 'درزن', 'شدة', 'كيس', 'طرد', 'لفة', 'زجاجة', 'عبوة'];

let receiptCounter = 1000;
export const getReceiptNumber = () => { receiptCounter++; return receiptCounter; };

// ============================================================================
// دالة بناء HTML للسند (حركة واحدة) مع النص الديني فوق الشعار
// ============================================================================
export const buildMovementHtml = (
  m: StockMovement,
  productName: string,
  warehouseName: string,
  entityName: string,
  userName: string,
  warehouseManager: string,
  baseUrl: string = ''
) => {
  const typeLabel = m.type === 'in' ? 'وارد' : 'صادر';
  const entityLabel = m.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف';
  const receiptNo = getReceiptNumber();
  const unitLabel = m.unit || 'قطعة';
  const today = new Date();
  const todayDate = today.toLocaleDateString('ar-EG');
  const todayDay = today.toLocaleDateString('ar-EG', { weekday: 'long' });
  const logoUrl = baseUrl ? `${baseUrl}/logo.png` : '/logo.png';
  const topLogoUrl = baseUrl ? `${baseUrl}/logn1.png` : '/logn1.png';

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سند حركة مخزون (${typeLabel}) - ${receiptNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Cairo', sans-serif; margin: 0; background: #f5f5f5; }
    .container { 
      width: 210mm; 
      min-height: 297mm; 
      margin: auto; 
      padding: 25px 35px 40px 35px; 
      border: 2px solid #0f5b9c; 
      border-radius: 10px; 
      background: #fff; 
      box-sizing: border-box; 
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .header-right {
      text-align: right;
      line-height: 1.6;
      font-size: 14px;
      flex: 1;
    }
    .header-center {
      text-align: center;
      flex: 0 0 auto;
      margin: 0 15px;
    }
    .header-center .top-logo {
      height: 40px; /* حجم الصورة العلوية */
      width: auto;
      margin-bottom: 5px;
    }
    .header-center .main-logo {
      height: 70px; /* حجم الشعار الرئيسي */
      width: auto;
    }
    .header-left {
      text-align: left;
      font-size: 14px;
      line-height: 1.6;
      flex: 1;
    }
    .header-main { 
      text-align: center; 
      margin-bottom: 20px; 
    }
    .header-main h1 { 
      margin: 0; 
      font-size: 28px; 
      color: #0f5b9c; 
    }
    .header-main p { 
      margin: 5px 0 0; 
      font-size: 16px; 
      color: #555; 
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px 0; 
      border-bottom: 1px solid #ddd; 
      font-size: 15px; 
    }
    .info-row div { 
      flex: 1; 
      text-align: center; 
    }
    .info-row div:first-child { 
      font-weight: bold; 
      color: #0f5b9c; 
    }
    .items-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 25px; 
      font-size: 14px; 
    }
    .items-table th { 
      background: #0f5b9c; 
      color: #fff; 
      padding: 10px; 
      border: 1px solid #0f5b9c; 
    }
    .items-table td { 
      padding: 8px; 
      border: 1px solid #ddd; 
      text-align: center; 
    }
    .items-table tr:nth-child(even) { 
      background: #f9f9f9; 
    }
    .notes { 
      margin-top: 15px; 
      padding: 12px; 
      border: 1px dashed #0f5b9c; 
      border-radius: 6px; 
      font-size: 14px; 
      background: #f0f7ff; 
    }
    .signatures { 
      display: flex; 
      justify-content: space-between; 
      margin-top: 35px; 
    }
    .signature-box { 
      text-align: center; 
      flex: 1; 
    }
    .signature-box p { 
      margin: 6px 0; 
    }
    .signature-box .title { 
      font-weight: bold; 
      color: #0f5b9c; 
    }
    .footer { 
      margin-top: 30px; 
      text-align: center; 
      font-size: 12px; 
      color: #777; 
      border-top: 1px dashed #aaa; 
      padding-top: 12px; 
    }
    @media print { 
      body { background: #fff; } 
      .container { border:none; } 
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- الرأس: النص الرسمي على اليمين، الصور في المنتصف، التاريخ على اليسار -->
    <div class="header-row">
      <div class="header-right">
            الجمهورية اليمنية<br>
            وزارة الدفاع<br>
            رئاسة هيئة الأركان العامة<br>
            المنطقة العسكرية الخامسة<br>
            اللـــ105ـــــو ا ء مشاه
          </div>
      <div class="header-center">
        <!-- الصورة العلوية (النص الديني) -->
        <img src="${topLogoUrl}" alt="سبحانه وتعالى" class="top-logo" onerror="this.style.display='none'">
        <!-- الشعار الرئيسي -->
        <img src="${logoUrl}" alt="شعار الجمهورية اليمنية" class="main-logo" onerror="this.style.display='none'">
      </div>
      <div class="header-left">
        التاريخ: ${todayDate}<br>
        اليوم: ${todayDay}
      </div>
    </div>

    <!-- عنوان السند -->
    <div class="header-main">
      <h1>نظام إدارة المخازن</h1>
      <p>سند حركة مخزون (${typeLabel})</p>
    </div>

    <!-- بيانات السند -->
    <div class="info-row">
      <div>رقم السند</div><div>${receiptNo}</div>
      <div>المخزن</div><div>${warehouseName}</div>
    </div>
    <div class="info-row">
      <div>${entityLabel}</div><div colspan="3">${entityName}</div>
    </div>

    <!-- جدول المنتج -->
    <table class="items-table">
      <thead>
        <tr><th>م</th><th>اسم المنتج</th><th>الكمية</th><th>الوحدة</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>${productName}</td><td>${m.quantity}</td><td>${unitLabel}</td></tr>
      </tbody>
    </table>

    ${m.notes ? `<div class="notes"><strong>ملاحظات:</strong> ${m.notes}</div>` : ''}

    <!-- التواقيع -->
    <div class="signatures">
      <div class="signature-box">
        <p class="title">أمين المخزن</p>
        <p>${warehouseManager || '__________'}</p>
      </div>
      <div class="signature-box">
        <p class="title">${entityLabel}</p>
        <p>${entityName || '__________'}</p>
      </div>
    </div>

    <!-- الفوتر -->
    <div class="footer">
      تم الطباعة بتاريخ ${todayDate} | برمجة مفيد الزري 778492884
    </div>
  </div>
</body>
</html>`;
};

// ============================================================================
// دالة بناء HTML للسند المتعدد المنتجات مع النص الديني فوق الشعار
// ============================================================================
export const buildMultiMovementHtml = (
  m: StockMovement,
  warehouseName: string,
  entityName: string,
  userName: string,
  warehouseManager: string,
  productsMap: Map<string, string>,
  baseUrl: string = ''
) => {
  const typeLabel = m.type === 'in' ? 'وارد' : 'صادر';
  const entityLabel = m.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف';
  const receiptNo = getReceiptNumber();
  const today = new Date();
  const todayDate = today.toLocaleDateString('ar-EG');
  const todayDay = today.toLocaleDateString('ar-EG', { weekday: 'long' });
  const logoUrl = baseUrl ? `${baseUrl}/logo.png` : '/logo.png';
  const topLogoUrl = baseUrl ? `${baseUrl}/logn1.png` : '/logn1.png';

  const rows = (m.items || []).map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${productsMap.get(item.product_id) || 'غير معروف'}</td>
      <td>${item.quantity}</td>
      <td>${item.unit}</td>
      <td>${item.notes || '—'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سند حركة مخزون (${typeLabel}) متعدد - ${receiptNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Cairo', sans-serif; margin: 0; background: #f5f5f5; }
    .container { 
      width: 210mm; 
      min-height: 297mm; 
      margin: auto; 
      padding: 25px 35px 40px 35px; 
      border: 2px solid #0f5b9c; 
      border-radius: 10px; 
      background: #fff; 
      box-sizing: border-box; 
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .header-right {
      text-align: right;
      line-height: 1.6;
      font-size: 14px;
      flex: 1;
    }
    .header-center {
      text-align: center;
      flex: 0 0 auto;
      margin: 0 15px;
    }
    .header-center .top-logo {
      height: 40px;
      width: auto;
      margin-bottom: 5px;
    }
    .header-center .main-logo {
      height: 70px;
      width: auto;
    }
    .header-left {
      text-align: left;
      font-size: 14px;
      line-height: 1.6;
      flex: 1;
    }
    .header-main { 
      text-align: center; 
      margin-bottom: 20px; 
    }
    .header-main h1 { 
      margin: 0; 
      font-size: 28px; 
      color: #0f5b9c; 
    }
    .header-main p { 
      margin: 5px 0 0; 
      font-size: 16px; 
      color: #555; 
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px 0; 
      border-bottom: 1px solid #ddd; 
      font-size: 15px; 
    }
    .info-row div { 
      flex: 1; 
      text-align: center; 
    }
    .info-row div:first-child { 
      font-weight: bold; 
      color: #0f5b9c; 
    }
    .items-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 25px; 
      font-size: 14px; 
    }
    .items-table th { 
      background: #0f5b9c; 
      color: #fff; 
      padding: 10px; 
      border: 1px solid #0f5b9c; 
    }
    .items-table td { 
      padding: 8px; 
      border: 1px solid #ddd; 
      text-align: center; 
    }
    .items-table tr:nth-child(even) { 
      background: #f9f9f9; 
    }
    .notes { 
      margin-top: 15px; 
      padding: 12px; 
      border: 1px dashed #0f5b9c; 
      border-radius: 6px; 
      font-size: 14px; 
      background: #f0f7ff; 
    }
    .signatures { 
      display: flex; 
      justify-content: space-between; 
      margin-top: 35px; 
    }
    .signature-box { 
      text-align: center; 
      flex: 1; 
    }
    .signature-box p { 
      margin: 6px 0; 
    }
    .signature-box .title { 
      font-weight: bold; 
      color: #0f5b9c; 
    }
    .footer { 
      margin-top: 30px; 
      text-align: center; 
      font-size: 12px; 
      color: #777; 
      border-top: 1px dashed #aaa; 
      padding-top: 12px; 
    }
    @media print { 
      body { background: #fff; } 
      .container { border:none; } 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-row">
      <div class="header-right">
            الجمهورية اليمنية<br>
            وزارة الدفاع<br>
            رئاسة هيئة الأركان العامة<br>
            المنطقة العسكرية الخامسة<br>
            اللـــ105ـــــو ا ء مشاه
          </div>
      <div class="header-center">
        <img src="${topLogoUrl}" alt="سبحانه وتعالى" class="top-logo" onerror="this.style.display='none'">
        <img src="${logoUrl}" alt="شعار الجمهورية اليمنية" class="main-logo" onerror="this.style.display='none'">
      </div>
      <div class="header-left">
        التاريخ: ${todayDate}<br>
        اليوم: ${todayDay}
      </div>
    </div>

    <div class="header-main">
      <h1>نظام إدارة المخازن</h1>
      <p>سند حركة مخزون (${typeLabel}) - متعدد المنتجات</p>
    </div>

    <div class="info-row">
      <div>رقم السند</div><div>${receiptNo}</div>
      <div>المخزن</div><div>${warehouseName}</div>
    </div>
    <div class="info-row">
      <div>${entityLabel}</div><div colspan="3">${entityName}</div>
    </div>
    ${m.notes ? `<div class="info-row"><div>ملاحظات عامة</div><div colspan="3">${m.notes}</div></div>` : ''}

    <table class="items-table">
      <thead>
        <tr><th>م</th><th>اسم المنتج</th><th>الكمية</th><th>الوحدة</th><th>ملاحظات</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="signatures">
      <div class="signature-box">
        <p class="title">أمين المخزن</p>
        <p>${warehouseManager || '__________'}</p>
      </div>
      <div class="signature-box">
        <p class="title">${entityLabel}</p>
        <p>${entityName || '__________'}</p>
      </div>
    </div>

    <div class="footer">
      تم الطباعة بتاريخ ${todayDate} | برمجة مفيد الزري 778492884
    </div>
  </div>
</body>
</html>`;
};
