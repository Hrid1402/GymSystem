import { useState } from 'react';
import { toast } from 'sonner';
import { invoicesApi } from '../api';
import '../styles/billingModal.css';

export default function PaymentSuccessModal({ isOpen, onClose, data }) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !data) return null;

  const { membership, invoice, plan } = data;
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
            &#10003;
          </div>

          <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 700 }}>
            ¡Pago Confirmado y Membresía Activa!
          </h3>

          <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>
            Tu suscripción al <strong>{plan?.name || 'Plan GymStark'}</strong> ya se encuentra activa para ingresar al gimnasio.
          </p>

          {invoice && (
            <div className="success-invoice-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}>
                  {docTypeLabel}
                </span>
                <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  SUNAT Aceptado
                </span>
              </div>

              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Nº {docCode}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                <div><strong>Receptor:</strong> {invoice.client_rzn_social}</div>
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
              {downloading ? 'Descargando...' : '📥 Descargar Comprobante (PDF)'}
            </button>
          )}

          <button
            type="button"
            className="btn-billing-cancel"
            style={{ width: '100%', marginTop: '0.25rem' }}
            onClick={onClose}
          >
            Ir a Mi Estado
          </button>
        </div>
      </div>
    </div>
  );
}
