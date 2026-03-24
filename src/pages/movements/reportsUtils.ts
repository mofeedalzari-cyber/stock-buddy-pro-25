// ============================================================================
// ملف: src/pages/movements/reportsUtils.ts
// ============================================================================
// هذا الملف يحتوي على جميع الدوال المساعدة لصفحة التقارير، بما في ذلك:
// - حساب الكميات مع دعم الحركات المتعددة (items)
// - توسيع الحركات لتفاصيل كل صنف
// - تصدير Excel و PDF
// - بناء HTML للتقارير المختلفة مع ترويسة موحدة تحتوي على:
//   * النص الرسمي (الجمهورية اليمنية، وزارة الدفاع، ...)
//   * الصورة العلوية (logn1.png) وفوقها الشعار الرئيسي (logo.png)
//   * التاريخ واليوم
// - تذييل بتوقيع مسؤول المخازن ومسجل التقرير

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { StockMovement } from '@/types/warehouse';

// ألوان المخططات البيانية
export const COLORS = ['hsl(174, 62%, 38%)', 'hsl(37, 95%, 55%)', 'hsl(220, 30%, 40%)', 'hsl(152, 60%, 40%)', 'hsl(0, 72%, 51%)'];

// ==========================================================================
// 1. دوال حساب الكميات (تدعم الحركات المتعددة)
// ==========================================================================

/**
 * حساب كمية منتج معين في مخزن محدد.
 * @param movements قائمة الحركات
 * @param productId معرف المنتج
 * @param warehouseId معرف المخزن
 * @returns إجمالي الكمية (موجب للوارد، سالب للصادر)
 */
export const getWarehouseQty = (
  movements: StockMovement[],
  productId: string,
  warehouseId: string
) => {
  let total = 0;
  movements.forEach(m => {
    if (m.warehouse_id !== warehouseId) return;
    if (m.product_id === productId) {
      total += m.type === 'in' ? m.quantity! : -m.quantity!;
    } else if (m.items) {
      const item = m.items.find(i => i.product_id === productId);
      if (item) {
        total += m.type === 'in' ? item.quantity! : -item.quantity!;
      }
    }
  });
  return total;
};

/**
 * حساب إجمالي كمية منتج معين من جميع الحركات (بغض النظر عن المخزن).
 */
export const getProductTotalQty = (movements: StockMovement[], productId: string) => {
  let total = 0;
  movements.forEach(m => {
    if (m.product_id === productId) {
      total += m.type === 'in' ? m.quantity! : -m.quantity!;
    } else if (m.items) {
      const item = m.items.find(i => i.product_id === productId);
      if (item) {
        total += m.type === 'in' ? item.quantity! : -item.quantity!;
      }
    }
  });
  return total;
};

/**
 * الحصول على أسماء المخازن التي تحتوي على حركات لمنتج معين.
 */
export const getProductWarehouses = (
  movements: StockMovement[],
  productId: string,
  getWarehouseName: (id: string) => string
) => {
  const whIds = new Set<string>();
  movements.forEach(m => {
    if (m.product_id === productId) {
      whIds.add(m.warehouse_id);
    } else if (m.items && m.items.some(i => i.product_id === productId)) {
      whIds.add(m.warehouse_id);
    }
  });
  return Array.from(whIds).map(id => getWarehouseName(id)).join('، ') || '-';
};

/**
 * الحصول على قائمة الموردين الذين تعاملوا مع منتج معين.
 */
export const getProductSuppliers = (
  movements: StockMovement[],
  productId: string,
  selectedWarehouse: string,
  getSupplierName: (id: string) => string
) => {
  const supplierIds = new Set<string>();
  movements.forEach(m => {
    if (m.entity_type !== 'supplier') return;
    if (selectedWarehouse && m.warehouse_id !== selectedWarehouse) return;
    if (m.product_id === productId) {
      supplierIds.add(m.entity_id);
    } else if (m.items && m.items.some(i => i.product_id === productId)) {
      supplierIds.add(m.entity_id);
    }
  });
  return Array.from(supplierIds).map(id => getSupplierName(id)).join('، ') || '-';
};

/**
 * الحصول على قائمة العملاء (جهات الصرف) الذين تعاملوا مع منتج معين.
 */
export const getProductClients = (
  movements: StockMovement[],
  productId: string,
  selectedWarehouse: string,
  getClientName: (id: string) => string
) => {
  const clientIds = new Set<string>();
  movements.forEach(m => {
    if (m.entity_type !== 'client') return;
    if (selectedWarehouse && m.warehouse_id !== selectedWarehouse) return;
    if (m.product_id === productId) {
      clientIds.add(m.entity_id);
    } else if (m.items && m.items.some(i => i.product_id === productId)) {
      clientIds.add(m.entity_id);
    }
  });
  return Array.from(clientIds).map(id => getClientName(id)).join('، ') || '-';
};

// ==========================================================================
// 2. توسيع الحركات (لتفاصيل كل صنف في الحركات المتعددة)
// ==========================================================================

/**
 * تحويل الحركات إلى مصفوفة مسطحة تحتوي كل صنف على حدة (مفردة أو من متعددة).
 */
export const expandMovements = (
  movements: StockMovement[],
  getProductName: (id: string) => string
) => {
  return movements.flatMap(m => {
    if (m.product_id) {
      // حركة مفردة
      return [{
        ...m,
        itemId: m.id,
        productName: getProductName(m.product_id),
        quantity: m.quantity,
        unit: m.unit,
      }];
    } else if (m.items) {
      // حركة متعددة: ننشئ عنصراً لكل صنف
      return m.items.map((item, idx) => ({
        ...m,
        itemId: `${m.id}-${idx}`,
        product_id: item.product_id,
        productName: getProductName(item.product_id),
        quantity: item.quantity,
        unit: item.unit,
        itemNotes: item.notes,
      }));
    }
    return [];
  });
};

// ==========================================================================
// 3. دوال التصدير والطباعة
// ==========================================================================

/**
 * تصدير البيانات إلى ملف Excel.
 */
export const exportExcel = (data: any[], sheetName: string, fileName: string) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * ✅ طباعة HTML وتحويله إلى PDF (يدعم الأندرويد والويب)
 * - على الأندرويد: حفظ الملف ومشاركته
 * - على الكمبيوتر: تحميل الملف مباشرة
 * @param html كود HTML للتقرير
 * @param title عنوان الملف
 * @param toast دالة الإشعارات (تُمرر من المكون)
 */
export const printPdfFromHtml = async (html: string, title: string, toast: any) => {
  const platform = Capacitor.getPlatform();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  tempDiv.style.position = 'fixed';
  tempDiv.style.top = '-10000px';
  tempDiv.style.width = '800px';
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, logging: false });
    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight > pdf.internal.pageSize.getHeight()) {
      // إذا كان المحتوى أطول من صفحة واحدة، نقسمه على عدة صفحات
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = position - pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    if (platform === 'android') {
      // ✅ على الأندرويد: حفظ ومشاركة الملف
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const savedFile = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache });
      await Share.share({ title, url: savedFile.uri, dialogTitle: title });
    } else {
      // ✅ على الكمبيوتر / المتصفح: تحميل الملف مباشرة
      const pdfDataUrl = pdf.output('datauristring');
      const link = document.createElement('a');
      link.href = pdfDataUrl;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'تم التحميل', description: 'تم إنشاء ملف PDF وبدء التحميل' });
    }
  } catch (error) {
    console.error('PDF error:', error);
    if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
    toast({ title: 'خطأ في الطباعة', description: 'حدث خطأ أثناء إنشاء ملف PDF. حاول مرة أخرى.', variant: 'destructive' });
  }
};

// ==========================================================================
// 4. بناء HTML للتقارير المختلفة (مع ترويسة موحدة)
// ==========================================================================

/**
 * بناء HTML لتقرير الموردين (كل مورد في جدول منفصل).
 */
export const buildSuppliersReportHtml = (
  selectedWarehouse: string,
  supplierItems: any[],
  suppliers: any[],
  getWarehouseName: (id: string) => string,
  getSupplierName: (id: string) => string,
  warehouseManager: string,
  userName: string
): string => {
  const warehouseName = selectedWarehouse ? getWarehouseName(selectedWarehouse) : 'جميع المخازن';
  const today = new Date().toLocaleDateString('ar-SA');
  const todayDay = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
  const topLogoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logn1.png` : '/logn1.png';

  let html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الموردين</title>
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
        .supplier-section {
          page-break-inside: avoid;
          margin-bottom: 30px;
          border: 1px solid #0f5b9c;
          border-radius: 8px;
          padding: 15px;
          background: #f9f9f9;
        }
        .supplier-header {
          background: #0f5b9c;
          color: #fff;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 15px;
        }
        .supplier-header h3 { margin: 0; font-size: 18px; }
        .supplier-header p { margin: 5px 0 0; font-size: 14px; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }
        th {
          background: #0f5b9c;
          color: #fff;
          padding: 8px;
          border: 1px solid #0f5b9c;
        }
        td {
          padding: 6px;
          border: 1px solid #ddd;
          text-align: right;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px dashed #aaa;
        }
        .signature-box {
          text-align: center;
          width: 45%;
        }
        .signature-box .title {
          font-weight: bold;
          color: #0f5b9c;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .signature-box .name {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 25px;
        }
        .signature-box .line {
          border-bottom: 1px solid #333;
          width: 100%;
          margin-top: 5px;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- الرأس: النص الرسمي على اليمين، صورتان في المنتصف، التاريخ واليوم على اليسار -->
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
            التاريخ: ${today}<br>
            اليوم: ${todayDay}
          </div>
        </div>

        <div class="header-main">
          <h1>نظام إدارة المخازن</h1>
          <p>تقرير الموردين - المخزن: ${warehouseName}</p>
        </div>
  `;

  // تجميع حركات الموردين حسب المورد
  const grouped = suppliers
    .filter(s => supplierItems.some(i => i.entity_id === s.id))
    .map(s => ({
      ...s,
      movements: supplierItems.filter(i => i.entity_id === s.id)
    }));

  grouped.forEach((supplier, idx) => {
    html += `
      <div class="supplier-section">
        <div class="supplier-header">
          <h3>المورد: ${supplier.name}</h3>
          <p>الهاتف: ${supplier.phone || '-'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>م</th>
              <th>التاريخ</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>الوحدة</th>
              <th>المخزن</th>
            </tr>
          </thead>
          <tbody>
    `;
    supplier.movements.forEach((item, i) => {
      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${item.date}</td>
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
          <td>${item.unit || '-'}</td>
          <td>${getWarehouseName(item.warehouse_id)}</td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
    if (idx < grouped.length - 1) html += `<div class="page-break"></div>`;
  });

  html += `
        <!-- التوقيعات -->
        <div class="signatures">
          <div class="signature-box">
            <div class="title">مسؤول المخازن</div>
            <div class="name">${warehouseManager || '__________'}</div>
            <div class="line"></div>
          </div>
          <div class="signature-box">
            <div class="title">مسجل التقرير</div>
            <div class="name">${userName || '__________'}</div>
            <div class="line"></div>
          </div>
        </div>
        <div class="footer">
          تم الطباعة بتاريخ ${today} | نظام إدارة المخازن - برمجة مفيد الزري 778492884
        </div>
        <div style="height: 10px;"></div>
      </div>
    </body>
    </html>`;
  return html;
};

/**
 * بناء HTML لتقرير جهات الصرف.
 */
export const buildClientsReportHtml = (
  selectedWarehouse: string,
  clientItems: any[],
  clients: any[],
  getWarehouseName: (id: string) => string,
  getClientName: (id: string) => string,
  warehouseManager: string,
  userName: string
): string => {
  const warehouseName = selectedWarehouse ? getWarehouseName(selectedWarehouse) : 'جميع المخازن';
  const today = new Date().toLocaleDateString('ar-SA');
  const todayDay = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
  const topLogoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logn1.png` : '/logn1.png';

  let html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير جهات الصرف</title>
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
        .client-section {
          page-break-inside: avoid;
          margin-bottom: 30px;
          border: 1px solid #0f5b9c;
          border-radius: 8px;
          padding: 15px;
          background: #f9f9f9;
        }
        .client-header {
          background: #0f5b9c;
          color: #fff;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 15px;
        }
        .client-header h3 { margin: 0; font-size: 18px; }
        .client-header p { margin: 5px 0 0; font-size: 14px; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }
        th {
          background: #0f5b9c;
          color: #fff;
          padding: 8px;
          border: 1px solid #0f5b9c;
        }
        td {
          padding: 6px;
          border: 1px solid #ddd;
          text-align: right;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px dashed #aaa;
        }
        .signature-box {
          text-align: center;
          width: 45%;
        }
        .signature-box .title {
          font-weight: bold;
          color: #0f5b9c;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .signature-box .name {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 25px;
        }
        .signature-box .line {
          border-bottom: 1px solid #333;
          width: 100%;
          margin-top: 5px;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
        .page-break { page-break-after: always; }
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
            التاريخ: ${today}<br>
            اليوم: ${todayDay}
          </div>
        </div>

        <div class="header-main">
          <h1>نظام إدارة المخازن</h1>
          <p>تقرير جهات الصرف - المخزن: ${warehouseName}</p>
        </div>
  `;

  const grouped = clients
    .filter(c => clientItems.some(i => i.entity_id === c.id))
    .map(c => ({
      ...c,
      movements: clientItems.filter(i => i.entity_id === c.id)
    }));

  grouped.forEach((client, idx) => {
    html += `
      <div class="client-section">
        <div class="client-header">
          <h3>جهة الصرف: ${client.name}</h3>
          <p>الهاتف: ${client.phone || '-'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>م</th>
              <th>التاريخ</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>الوحدة</th>
              <th>المخزن</th>
            </tr>
          </thead>
          <tbody>
    `;
    client.movements.forEach((item, i) => {
      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${item.date}</td>
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
          <td>${item.unit || '-'}</td>
          <td>${getWarehouseName(item.warehouse_id)}</td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
    if (idx < grouped.length - 1) html += `<div class="page-break"></div>`;
  });

  html += `
        <div class="signatures">
          <div class="signature-box">
            <div class="title">مسؤول المخازن</div>
            <div class="name">${warehouseManager || '__________'}</div>
            <div class="line"></div>
          </div>
          <div class="signature-box">
            <div class="title">مسجل التقرير</div>
            <div class="name">${userName || '__________'}</div>
            <div class="line"></div>
          </div>
        </div>
        <div class="footer">
          تم الطباعة بتاريخ ${today} | نظام إدارة المخازن - برمجة مفيد الزري 778492884
        </div>
        <div style="height: 10px;"></div>
      </div>
    </body>
    </html>`;
  return html;
};

/**
 * بناء HTML للتقارير البسيطة (المنتجات، الحركات، المخازن، المخزون المنخفض، الكيانات).
 */
export const buildSimplePdfHtml = (
  title: string,
  headers: string[],
  rows: string[][],
  selectedWarehouse: string,
  getWarehouseName: (id: string) => string,
  warehouseManager: string,
  userName: string
): string => {
  const warehouseName = selectedWarehouse ? getWarehouseName(selectedWarehouse) : 'جميع المخازن';
  const today = new Date().toLocaleDateString('ar-SA');
  const todayDay = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
  const topLogoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logn1.png` : '/logn1.png';

  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
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
        h1 { font-size: 24px; color: #0f5b9c; text-align: center; margin-bottom: 5px; }
        h2 { font-size: 18px; color: #333; text-align: center; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #0f5b9c; color: #fff; padding: 8px; border: 1px solid #0f5b9c; }
        td { padding: 6px; border: 1px solid #ddd; text-align: right; }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px dashed #aaa;
        }
        .signature-box {
          text-align: center;
          width: 45%;
        }
        .signature-box .title {
          font-weight: bold;
          color: #0f5b9c;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .signature-box .name {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 25px;
        }
        .signature-box .line {
          border-bottom: 1px solid #333;
          width: 100%;
          margin-top: 5px;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
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
            التاريخ: ${today}<br>
            اليوم: ${todayDay}
          </div>
        </div>
        <h1>نظام إدارة المخازن</h1>
        <h2>${title} - المخزن: ${warehouseName}</h2>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
        <div class="signatures">
          <div class="signature-box">
            <div class="title">مسؤول المخازن</div>
            <div class="name">${warehouseManager || '__________'}</div>
            <div class="line"></div>
          </div>
          <div class="signature-box">
            <div class="title">مسجل التقرير</div>
            <div class="name">${userName || '__________'}</div>
            <div class="line"></div>
          </div>
        </div>
        <div class="footer">
          تم الطباعة بتاريخ ${today} | نظام إدارة المخازن - برمجة مفيد الزري 778492884
        </div>
        <div style="height: 10px;"></div>
      </div>
    </body>
    </html>
  `;
};
