import { useNavigate, Link } from 'react-router-dom';
import LegalFooter from '../../components/layout/LegalFooter';
import { PATHS } from '../../routes/paths';
import '../../styles/legal.css';

export default function PoliticaPrivacidad() {
  const navigate = useNavigate();
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'GymStark Perú S.A.C.';
  const ruc = import.meta.env.VITE_COMPANY_RUC || '20601234567';
  const companyEmail = import.meta.env.VITE_COMPANY_EMAIL || 'contacto@gymstark.com';

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
        <p className="legal-updated">
          Conforme a la Ley N° 29733 (Ley de Protección de Datos Personales de la República del Perú) y su Reglamento aprobado por D.S. N° 003-2013-JUS.
        </p>

        <section className="legal-section">
          <h2>1. Titular del Banco de Datos Personales</h2>
          <p>
            El responsable del tratamiento de sus datos personales es <strong>{companyName}</strong>, con <strong>RUC {ruc}</strong>. Los datos personales recolectados a través de nuestro sitio web, aplicaciones móviles y mostradores presenciales forman parte de nuestro banco de datos debidamente protegido e inscrito conforme a ley.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Datos Recopilados y Finalidades del Tratamiento</h2>
          <p>
            GymStark recopila datos personales indispensables para la prestación del servicio, incluyendo nombres, apellidos, documento de identidad (DNI o Carné de Extranjería), correo electrónico, número telefónico, fecha de nacimiento, así como patrones biométricos faciales y fotografías para control de acceso presencial. Dichos datos son tratados exclusivamente para:
          </p>
          <ul>
            <li>
              <strong>Gestión de Membresías y Control de Acceso:</strong> Identificar fehacientemente al usuario en nuestras instalaciones mediante códigos QR, validación de DNI o sistemas de reconocimiento biométrico facial.
            </li>
            <li>
              <strong>Procesamiento Seguro de Pagos:</strong> Gestionar el cobro electrónico de membresías mediante la pasarela segura autorizada <strong>Culqi</strong> (Compañía Incubadora de Soluciones Móviles S.A.C. - Grupo Credicorp). GymStark no almacena ni procesa directamente información de tarjetas bancarias.
            </li>
            <li>
              <strong>Facturación Electrónica SUNAT:</strong> Emitir los comprobantes de pago electrónicos obligatorios (Boletas de Venta o Facturas) conforme a los estándares Greenter UBL 2.1 exigidos por la Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT).
            </li>
            <li>
              <strong>Atención de Consultas y Reclamaciones:</strong> Gestionar el soporte al usuario y atender quejas o reclamos formulados en nuestro{' '}
              <Link to={PATHS.COMPLAINTS} style={{ color: '#2563eb', fontWeight: 600 }}>
                Libro de Reclamaciones Virtual
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Seguridad de la Información y Pasarela Culqi</h2>
          <p>
            GymStark implementa medidas técnicas, organizativas y legales para garantizar la confidencialidad de la información y prevenir cualquier acceso no autorizado, pérdida o alteración de datos personales.
          </p>
          <p>
            Las transacciones bancarias se ejecutan en servidores certificados bajo el estándar internacional <strong>PCI-DSS Nivel 1</strong> provistos por Culqi, garantizando cifrado de punto a punto para proteger la información de pago en todo momento.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Ejercicio de Derechos ARCO</h2>
          <p>
            El titular de los datos personales puede ejercer en cualquier momento sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong> reconocidos por la Ley N° 29733, dirigiendo una comunicación escrita al correo electrónico oficial: <strong>{companyEmail}</strong>, acompañando copia de su documento de identidad.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Modificaciones a la Presente Política</h2>
          <p>
            GymStark se reserva el derecho de actualizar la presente Política de Privacidad para adecuarla a novedades legislativas o mejoras tecnológicas. Cualquier actualización sustancial será notificada a través de nuestra plataforma web.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
