import { invoicesService } from '../services/invoices.service.js';
import { ROLES } from '../middleware/auth.middleware.js';

/**
 * Obtiene la lista de comprobantes del cliente autenticado
 * GET /api/invoices/my
 */
export const getMyInvoices = async (req, res) => {
  try {
    const invoices = await invoicesService.getInvoicesByUser(req.user.id);
    return res.json({ invoices });
  } catch (err) {
    console.error('Error al listar comprobantes:', err);
    return res.status(500).json({ error: 'Error al consultar los comprobantes' });
  }
};

/**
 * Transmite el archivo PDF oficial del comprobante electrónico on-the-fly
 * GET /api/invoices/:id/pdf
 */
export const getInvoicePdf = async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await invoicesService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    // Seguridad: los clientes solo pueden ver sus propios comprobantes
    if (req.user.role === ROLES.CLIENT && invoice.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para descargar este comprobante' });
    }

    const pdfBuffer = await invoicesService.getInvoicePdfStream(invoice);
    const fileName = `${invoice.serie}-${String(invoice.correlativo).padStart(8, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error al generar PDF del comprobante:', err);
    return res.status(500).json({ error: 'Error al generar la representación impresa del comprobante' });
  }
};
