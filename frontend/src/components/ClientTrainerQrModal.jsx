import { QRCodeSVG } from 'qrcode.react';
import '../styles/clientQrModal.css';

export default function ClientTrainerQrModal({ isOpen, onClose, user }) {
  if (!isOpen || !user?.id) return null;

  const qrValue = `GYMSTARK_CLIENT:${user.id}`;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="qr-modal-container" role="dialog" aria-modal="true">
        <div className="qr-modal-header">
          <div className="qr-modal-title-wrap">
            <svg
              className="qr-modal-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <h2 className="qr-modal-title">Mi QR para Entrenador</h2>
          </div>
          <button
            type="button"
            className="qr-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <div className="qr-modal-body">
          <div className="qr-canvas-box">
            <QRCodeSVG
              value={qrValue}
              size={210}
              level="M"
              includeMargin={true}
            />
          </div>

          <div className="qr-instructions-box" style={{ marginTop: '14px' }}>
            <svg
              className="qr-instructions-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <p className="qr-instructions-text">
              Muestra este código a tu entrenador para que valide tu identidad y membresía vigente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}