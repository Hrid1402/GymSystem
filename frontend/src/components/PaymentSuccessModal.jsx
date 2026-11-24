import { useState } from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { invoicesApi } from '../api';
import '../styles/billingModal.css';

export default function PaymentSuccessModal({ isOpen, onClose, data }) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !data) return null;

  const { invoice, plan } = data;
  const docTypeLabel = invoice?.tipo_doc === '01' ? 'Factura Electrónica' : 'Boleta de Venta Electrónica';
  const docCode = invoice ? `${invoice.serie}-${String(invoice.correlativo).padStart(8, '0')}` : 'B001-00000001';

  const handleDownloadPdf = async () => {
    if (!invoice?.id) {
      toast.info('El comprobante se está procesando. Podrás descargarlo desde tu historial.');
      return;
    }
    setDownloading(true);
    try {
      await invoicesApi.downloadPdf(invoice.id, `${docCode}.pdf`);
      toast.success('Comprobante descargado con éxito');
    } catch (err) {
      toast.error(err.message || 'Error al descargar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="billing-modal-backdrop" onClick={onClose}>
      <div className="billing-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="success-modal-body">
          <div className="success-icon-wrap">
            <CheckCircle2 size={36} color="#16a34a" />
          </div>

          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>
            Comprobante de Pago Emitido
          </h3>

          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
            La membresía al <strong>{plan?.name || 'Plan GymStark'}</strong> ha sido activada en el sistema.
          </p>

          {invoice && (
            <div className="success-invoice-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}>
                  {docTypeLabel}
                </span>
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  SUNAT UBL 2.1
                </span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Nº {docCode}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div><strong>Cliente:</strong> {invoice.client_rzn_social}</div>
                <div><strong>Documento:</strong> {invoice.client_tipo_doc === '6' ? 'RUC' : 'DNI'} {invoice.client_num_doc}</div>
                <div><strong>Total:</strong> S/ {Number(invoice.total_venta).toFixed(2)} PEN</div>
              </div>
            </div>
          )}

          {invoice && (
            <button
              type="button"
              className="btn-download-pdf"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              <Download size={18} />
              <span>{downloading ? 'Descargando...' : 'Descargar Boleta de Venta (PDF)'}</span>
            </button>
          )}

          <button
            type="button"
            className="btn-billing-cancel"
            style={{ width: '100%', marginTop: '0.25rem' }}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
