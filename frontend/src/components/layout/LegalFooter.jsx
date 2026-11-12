import { Link } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import '../../styles/footer.css';

export default function LegalFooter() {
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'GymStark Perú S.A.C.';
  const ruc = import.meta.env.VITE_COMPANY_RUC || '20601234567';
  const address = import.meta.env.VITE_COMPANY_ADDRESS || 'Av. Principal 1234, Miraflores, Lima, Perú';
  const email = import.meta.env.VITE_COMPANY_EMAIL || 'contacto@gymstark.com';

  return (
    <footer className="legal-footer">
      <div className="legal-footer-container">
        {/* Columna 1: Marca y RUC */}
        <div className="footer-col">
          <div className="footer-brand">
            <span className="footer-logo-icon">+</span>
            <span className="footer-brand-name">GymStark</span>
          </div>
          <p className="footer-company-desc">
            Centro de acondicionamiento, entrenamiento funcional y bienestar físico integral.
          </p>
          <div className="footer-tax-info">
            <p><strong>{companyName}</strong> · RUC: {ruc}</p>
            <p>{address}</p>
            <p>{email}</p>
          </div>
        </div>

        {/* Columna 2: Enlaces Legales */}
        <div className="footer-col">
          <h4 className="footer-heading">Legal y Normativas</h4>
          <ul className="footer-links">
            <li>
              <Link to={PATHS.TERMS}>Términos y Condiciones</Link>
            </li>
            <li>
              <Link to={PATHS.PRIVACY}>Política de Privacidad</Link>
            </li>
            <li>
              <Link to={PATHS.COMPLAINTS}>Libro de Reclamaciones</Link>
            </li>
          </ul>
        </div>

        {/* Columna 3: Información de Pagos y Facturación */}
        <div className="footer-col">
          <h4 className="footer-heading">Pagos Seguros y SUNAT</h4>
          <p className="footer-security-text">
            Pagos procesados de forma segura mediante <strong>Culqi</strong> (Grupo Credicorp) con tarjetas de crédito/débito, Yape y PagoEfectivo bajo certificación PCI-DSS.
          </p>
          <p className="tax-notice">
            Emisión de Boletas y Facturas electrónicas SUNAT (UBL 2.1). Precios con 18% IGV incluido. Membresías no reembolsables de uso personal e intransferible.
          </p>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p>© {new Date().getFullYear()} {companyName}. Todos los derechos reservados. Conforme a las leyes de la República del Perú.</p>
      </div>
    </footer>
  );
}
