import { useNavigate } from 'react-router-dom';
import LegalFooter from '../../components/layout/LegalFooter';
import '../../styles/legal.css';

export default function PoliticaPrivacidad() {
  const navigate = useNavigate();
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'GymStark Perú S.A.C.';
  const ruc = import.meta.env.VITE_COMPANY_RUC || '20601234567';

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <div className="legal-logo" onClick={() => navigate('/')}>
            <span>+</span> GymStark
          </div>
          <button className="btn-back-legal" onClick={() => navigate('/')}>
            Volver
          </button>
        </div>
      </header>

      <main className="legal-content-container">
        <h1>Política de Privacidad y Protección de Datos Personales</h1>
        <p className="legal-updated">Conforme a la Ley N° 29733 (Ley de Protección de Datos Personales de la República del Perú) y su Reglamento D.S. 003-2013-JUS.</p>

        <section className="legal-section">
          <h2>1. Titular del Banco de Datos</h2>
          <p>
            El responsable del tratamiento de sus datos personales es <strong>{companyName}</strong>, con <strong>RUC {ruc}</strong>. Los datos recopilados formarán parte del banco de datos personales denominado «Usuarios y Clientes de GymStark».
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Finalidad del Tratamiento</h2>
          <p>
            Los datos personales facilitados (nombres, apellidos, documento de identidad DNI, correo electrónico, fecha de nacimiento y teléfono) son tratados con las siguientes finalidades:
          </p>
          <ul>
            <li>Gestionar el registro de usuario, control de acceso físico y validación de membresías en nuestras sedes.</li>
            <li>Procesar y verificar la suscripción y pagos en línea a través de la pasarela autorizada Mercado Pago.</li>
            <li>Emitir comprobantes de pago electrónicos conforme a las disposiciones tributarias de la SUNAT.</li>
            <li>Brindar soporte técnico y atender consultas, reclamos o incidencias.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Seguridad de la Información</h2>
          <p>
            GymStark implementa medidas técnicas, legales y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizado.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Ejercicio de Derechos ARCO</h2>
          <p>
            El titular de los datos personales puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) dirigiendo una solicitud formal al correo electrónico: <strong>{import.meta.env.VITE_COMPANY_EMAIL || 'contacto@gymstark.com'}</strong>.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
