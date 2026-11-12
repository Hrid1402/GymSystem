import PDFDocument from 'pdfkit';
import { numberToWords } from './numberToWords.js';

const INVOICE_API_BASE = process.env.APISPERU_API_URL || 'https://facturacion.apisperu.com/api/v1';

const getInvoiceToken = () => {
  return process.env.APISPERU_INVOICE_TOKEN || process.env.APISPERU_TOKEN || '';
};

/**
 * Construye el payload UBL 2.1 estricto para APIsPERU / Greenter
 */
export const buildUblPayload = ({ tipoDoc, serie, correlativo, client, plan, amount }) => {
  const totalVenta = Number(Number(amount).toFixed(2));
  const valorUnitario = Math.round((totalVenta / 1.18) * 100) / 100;
  const igv = Math.round((totalVenta - valorUnitario) * 100) / 100;

  return {
    ublVersion: '2.1',
    tipoOperacion: '0101',
    tipoDoc, // '03' (Boleta) o '01' (Factura)
    serie,   // 'B001' o 'F001'
    correlativo: String(correlativo),
    fechaEmision: new Date().toISOString().slice(0, 19) + '-05:00',
    formaPago: {
      moneda: 'PEN',
      tipo: 'Contado',
    },
    tipoMoneda: 'PEN',
    client: {
      tipoDoc: client.tipoDoc, // '1' (DNI) o '6' (RUC)
      numDoc: String(client.numDoc),
      rznSocial: String(client.rznSocial).toUpperCase(),
      address: client.address
        ? {
            direccion: String(client.address).toUpperCase(),
          }
        : undefined,
    },
    company: {
      ruc: process.env.COMPANY_RUC || '20601234567',
      razonSocial: process.env.COMPANY_NAME || 'GYMSTARK PERU S.A.C.',
      nombreComercial: 'GymStark',
      address: {
        ubigueo: process.env.COMPANY_UBIGEO || '150101',
        departamento: 'LIMA',
        provincia: 'LIMA',
        distrito: 'MIRAFLORES',
        urbanizacion: '-',
        direccion: process.env.COMPANY_ADDRESS || 'Av. Principal 1234, Miraflores, Lima',
        codLocal: '0000',
      },
    },
    mtoOperGravadas: valorUnitario,
    mtoIGV: igv,
    totalImpuestos: igv,
    valorVenta: valorUnitario,
    subTotal: totalVenta,
    mtoImpVenta: totalVenta,
    details: [
      {
        codProducto: 'GYM-SUB',
        unidad: 'ZZ',
        cantidad: 1,
        descripcion: `MEMBRESÍA GYMSTARK - ${String(plan.name || 'PLAN').toUpperCase()}`,
        mtoValorUnitario: valorUnitario,
        mtoValorVenta: valorUnitario,
        mtoBaseIgv: valorUnitario,
        porcentajeIgv: 18,
        igv: igv,
        tipAfeIgv: 10,
        totalImpuestos: igv,
        mtoPrecioUnitario: totalVenta,
      },
    ],
    legends: [
      {
        code: '1000',
        value: numberToWords(totalVenta),
      },
    ],
  };
};

/**
 * Envía el comprobante electrónico a SUNAT a través de APIsPERU
 * POST /api/v1/invoice/send
 */
export const sendInvoice = async (ublPayload) => {
  const token = getInvoiceToken();

  if (!token) {
    console.warn('⚠️ APISPERU_INVOICE_TOKEN no configurado. Operando en modo Mock/Local.');
    return {
      success: true,
      mock: true,
      sunatResponse: {
        hash: `mock_hash_${Date.now()}`,
        description: 'Comprobante simulado exitosamente (Modo Desarrollo/Offline).',
        cdrResponse: {
          code: '0',
          description: 'La Boleta/Factura ha sido aceptada en modo simulado.',
        },
      },
    };
  }

  const url = `${INVOICE_API_BASE}/invoice/send`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(ublPayload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data.message || data.error || `Error APIsPERU (${res.status})`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return {
      success: true,
      sunatResponse: data,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Genera el PDF del comprobante usando APIsPERU o fallback local
 */
export const getPdf = async (ublPayload) => {
  const token = getInvoiceToken();

  if (token) {
    try {
      const url = `${INVOICE_API_BASE}/invoice/pdf`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ublPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      console.warn('APIsPERU PDF falló con status:', res.status, '- usando fallback local');
    } catch (apiErr) {
      console.warn('Error al conectar con APIsPERU PDF:', apiErr.message, '- usando fallback local');
    }
  }

  // Generador local de PDF con PDFKit para modo desarrollo y resiliencia offline
  return generateFallbackPdf(ublPayload);
};

/**
 * Genera un PDF estéticamente pulido localmente con PDFKit
 */
export const generateFallbackPdf = (ubl) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const isBoleta = ubl.tipoDoc === '03';
      const docTitle = isBoleta ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
      const docNum = `${ubl.serie}-${String(ubl.correlativo).padStart(8, '0')}`;

      // Cabecera de la empresa
      doc.fillColor('#0f172a').fontSize(16).text(ubl.company.razonSocial, 40, 40, { bold: true });
      doc.fontSize(9).fillColor('#475569');
      doc.text(`Nombre comercial: ${ubl.company.nombreComercial}`);
      doc.text(ubl.company.address.direccion);
      doc.text(`${ubl.company.address.distrito} - ${ubl.company.address.provincia} - ${ubl.company.address.departamento}`);

      // Caja de RUC y Número de Comprobante (esquina superior derecha)
      doc.roundedRect(360, 35, 200, 85, 6).lineWidth(1.5).stroke('#2563eb');
      doc.fontSize(11).fillColor('#0f172a').text(`R.U.C. ${ubl.company.ruc}`, 360, 48, { align: 'center', width: 200, bold: true });
      doc.rect(360, 68, 200, 24).fill('#2563eb');
      doc.fontSize(10).fillColor('#ffffff').text(docTitle, 360, 75, { align: 'center', width: 200, bold: true });
      doc.fontSize(12).fillColor('#0f172a').text(docNum, 360, 100, { align: 'center', width: 200, bold: true });

      doc.moveDown(3);

      // Datos del Cliente y Emisión
      const yClient = 140;
      doc.roundedRect(40, yClient, 520, 65, 4).lineWidth(0.8).stroke('#cbd5e1');
      doc.fontSize(9).fillColor('#334155');

      const clientDocLabel = ubl.client.tipoDoc === '6' ? 'R.U.C.:' : 'D.N.I.:';
      doc.text(`Fecha de Emisión: ${new Date(ubl.fechaEmision).toLocaleDateString('es-PE')}`, 50, yClient + 10);
      doc.text(`Forma de Pago: ${ubl.formaPago.tipo}`, 320, yClient + 10);
      doc.text(`Cliente: ${ubl.client.rznSocial}`, 50, yClient + 26, { width: 480 });
      doc.text(`${clientDocLabel} ${ubl.client.numDoc}`, 50, yClient + 42);
      if (ubl.client.address?.direccion) {
        doc.text(`Dirección: ${ubl.client.address.direccion}`, 220, yClient + 42, { width: 330 });
      }

      // Tabla de Items
      const yTable = 220;
      doc.rect(40, yTable, 520, 20).fill('#0f172a');
      doc.fontSize(8).fillColor('#ffffff');
      doc.text('CANT.', 50, yTable + 6);
      doc.text('UNIDAD', 90, yTable + 6);
      doc.text('DESCRIPCIÓN', 150, yTable + 6);
      doc.text('VALOR UNIT.', 370, yTable + 6, { align: 'right', width: 70 });
      doc.text('TOTAL', 460, yTable + 6, { align: 'right', width: 80 });

      let currentY = yTable + 20;
      (ubl.details || []).forEach((item) => {
        doc.rect(40, currentY, 520, 25).fill(currentY % 2 === 0 ? '#f8fafc' : '#ffffff');
        doc.fontSize(8.5).fillColor('#0f172a');
        doc.text(String(item.cantidad), 50, currentY + 7);
        doc.text(item.unidad, 90, currentY + 7);
        doc.text(item.descripcion, 150, currentY + 7, { width: 210 });
        doc.text(`S/ ${Number(item.mtoValorUnitario).toFixed(2)}`, 370, currentY + 7, { align: 'right', width: 70 });
        doc.text(`S/ ${Number(item.mtoPrecioUnitario).toFixed(2)}`, 460, currentY + 7, { align: 'right', width: 80 });
        currentY += 25;
      });

      // Leyenda en letras
      doc.fontSize(8).fillColor('#475569');
      const legendText = ubl.legends?.[0]?.value || '';
      doc.text(legendText, 50, currentY + 20, { width: 320, italic: true });

      // Resumen de Totales
      const yTotals = currentY + 10;
      doc.fontSize(9).fillColor('#334155');
      doc.text('Op. Gravadas:', 370, yTotals, { align: 'right', width: 80 });
      doc.text(`S/ ${Number(ubl.mtoOperGravadas).toFixed(2)}`, 460, yTotals, { align: 'right', width: 80 });

      doc.text('I.G.V. (18%):', 370, yTotals + 15, { align: 'right', width: 80 });
      doc.text(`S/ ${Number(ubl.mtoIGV).toFixed(2)}`, 460, yTotals + 15, { align: 'right', width: 80 });

      doc.rect(360, yTotals + 32, 200, 24).fill('#2563eb');
      doc.fontSize(10).fillColor('#ffffff');
      doc.text('IMPORTE TOTAL:', 370, yTotals + 38, { width: 90, bold: true });
      doc.text(`S/ ${Number(ubl.mtoImpVenta).toFixed(2)}`, 460, yTotals + 38, { align: 'right', width: 80, bold: true });

      // Pie de página oficial
      const yFooter = 680;
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, yFooter).lineTo(560, yFooter).stroke();
      doc.fontSize(8).fillColor('#64748b');
      doc.text('Representación impresa de la Boleta/Factura Electrónica generada para GymStark Perú.', 40, yFooter + 10, { align: 'center', width: 520 });
      doc.text('Emisión electrónica autorizada por SUNAT según estándar UBL 2.1.', 40, yFooter + 22, { align: 'center', width: 520 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
