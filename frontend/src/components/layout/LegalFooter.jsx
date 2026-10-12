import { Link } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import '../../styles/footer.css';

export default function LegalFooter() {
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'GymStark Perú S.A.C.';
  const ruc = import.meta.env.VITE_COMPANY_RUC || '20601234567';
  const address = import.meta.env.VITE_COMPANY_ADDRESS || 'Av. Principal 1234, Lima, Perú';
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
            Centro de acondicionamiento y entrenamiento físico integral.
          </p>
          <div className="footer-tax-info">
            <p><strong>{companyName}</strong> · RUC: {ruc}</p>
            <p>{address}</p>
            <p>{email}</p>
          </div>
        </div>

        {/* Columna 2: Enlaces Legales */}
        <div className="footer-col">
          <h4 className="footer-heading">Políticas y Términos</h4>
          <ul className="footer-links">
            <li>
              <Link to={PATHS.TERMS}>Términos del Servicio</Link>
            </li>
            <li>
              <Link to={PATHS.PRIVACY}>Política de Privacidad</Link>
            </li>
          </ul>
        </div>

        {/* Columna 3: Información de Pagos y Precios */}
        <div className="footer-col">
          <h4 className="footer-heading">Pagos Seguros</h4>
          <p className="footer-security-text">
            Procesamos pagos de forma segura mediante <strong>Mercado Pago</strong> (tarjetas de crédito, débito y transferencias).
          </p>
          <p className="tax-notice">
            Precios en Soles (PEN) con IGV (18%) incluido.
          </p>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p>© {new Date().getFullYear()} {companyName}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
