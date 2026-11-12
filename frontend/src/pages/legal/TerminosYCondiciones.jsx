import { useNavigate, Link } from 'react-router-dom';
import LegalFooter from '../../components/layout/LegalFooter';
import { PATHS } from '../../routes/paths';
import '../../styles/legal.css';

export default function TerminosYCondiciones() {
  const navigate = useNavigate();
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'GymStark Perú S.A.C.';
  const ruc = import.meta.env.VITE_COMPANY_RUC || '20601234567';
  const address = import.meta.env.VITE_COMPANY_ADDRESS || 'Av. Principal 1234, Miraflores, Lima, Perú';

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
        <h1>Términos y Condiciones del Servicio</h1>
        <p className="legal-updated">Última actualización: Noviembre 2026 | Conforme a la legislación de la República del Perú (Ley N° 29571)</p>

        <section className="legal-section">
          <h2>1. Identificación del Proveedor</h2>
          <p>
            El presente contrato de prestación de servicios regula la adquisición y disfrute de los servicios deportivos prestados por <strong>{companyName}</strong>, con <strong>RUC {ruc}</strong>, con domicilio legal en {address}, en adelante «GymStark», a través de su plataforma digital y sus sedes físicas de entrenamiento.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Naturaleza del Servicio y Membresías</h2>
          <p>
            Las membresías contratadas otorgan el derecho de acceso presencial, uso de instalaciones y equipamiento deportivo de GymStark durante la vigencia exacta (días calendario contratados) del plan seleccionado por el usuario.
          </p>
          <p>
            <strong>Carácter Personal e Intransferible:</strong> Todas las membresías son de uso exclusivo y personal del titular registrado. Queda estrictamente prohibida la transferencia, cesión, préstamo, venta o uso compartido de las credenciales de acceso (código QR o registro biométrico facial) a favor de terceras personas.
          </p>
          <p>
            <strong>Continuidad del Servicio y Tarifas:</strong> Las membresías adquiridas y activas conservan plenamente su vigencia y derechos contratados hasta su fecha formal de vencimiento, con total independencia de que GymStark actualice sus tarifas, pause o retire del catálogo comercial el plan contratado para nuevos clientes.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Pasarela de Pagos Segura (Culqi)</h2>
          <p>
            Las transacciones de pago en línea dentro de la plataforma son procesadas de forma segura y confidencial a través de la pasarela de pagos oficial <strong>Culqi</strong> (operada por <em>Compañía Incubadora de Soluciones Móviles S.A.C.</em>, empresa del grupo <strong>Credicorp</strong>).
          </p>
          <p>
            <strong>Medios de Pago Habilitados:</strong> Tarjetas de crédito y débito (Visa, Mastercard, American Express, Diners Club), billeteras digitales (Yape), transferencias vía banca móvil e internet y pagos en agentes autorizados (PagoEfectivo).
          </p>
          <p>
            <strong>Seguridad de Datos Financieros:</strong> GymStark no almacena ni tiene acceso directo a los números completos de tarjeta de crédito/débito ni códigos de validación (CVV/CVC). Toda la información bancaria es encriptada y tokenizada bajo estándares de seguridad internacional <strong>PCI-DSS Nivel 1</strong> y protocolos TLS.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Precios y Facturación Electrónica SUNAT (UBL 2.1)</h2>
          <p>
            Todos los precios publicados en la plataforma están expresados en Soles de la República del Perú (PEN) e incluyen el 18% correspondiente al Impuesto General a las Ventas (IGV).
          </p>
          <p>
            <strong>Emisión Automática de Comprobantes:</strong> De acuerdo con la normativa tributaria emitida por la Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT), por cada pago efectuado se emitirá de manera automática el Comprobante de Pago Electrónico correspondiente (<strong>Boleta de Venta Electrónica</strong> o <strong>Factura Electrónica</strong>) bajo el estándar oficial Greenter UBL 2.1 canalizado a través de APIsPERU.
          </p>
          <p>
            <strong>Disponibilidad y Descarga:</strong> El usuario puede consultar y descargar su comprobante oficial en formato PDF en cualquier momento desde su panel de usuario («Mi Membresía» / «Mi Estado» &gt; Historial de membresías y pagos).
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Política Estricta de NO Reembolsos y Cancelaciones</h2>
          <p>
            De conformidad con la naturaleza del servicio deportivo de suscripción y el <strong>Código de Protección y Defensa del Consumidor (Ley N° 29571)</strong>:
          </p>
          <ul>
            <li>
              <strong>Pagos Definitivos y No Reembolsables:</strong> Una vez efectuado el pago y activada la membresía, <strong>no se realizarán devoluciones ni reembolsos de dinero bajo ningún concepto</strong>, sea de manera total o parcial.
            </li>
            <li>
              <strong>Inasistencia o Desuso Voluntario:</strong> La inasistencia, falta de uso de las instalaciones, cambio de lugar de residencia, modificaciones en horarios personales/laborales o cualquier otra causal ajena al funcionamiento operativo de GymStark no otorgará derecho a reembolsos, prórrogas de tiempo ni congelamientos de membresía, salvo que el plan comercial adquirido lo estipule explícitamente en sus condiciones particulares.
            </li>
            <li>
              <strong>Cancelación Voluntaria por el Usuario:</strong> El usuario puede solicitar la baja voluntaria de su membresía activa a través de su panel de control en cualquier momento. La cancelación extingue el acceso físico a las instalaciones de forma inmediata y no genera derecho a devolución económica ni compensación proporcional por los días no disfrutados.
            </li>
            <li>
              <strong>Excepciones Legales:</strong> Únicamente procederá el reembolso o restitución en casos legalmente amparados donde se acredite una falla grave, insubsanable y directamente imputable a GymStark en la prestación del servicio contratado.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Control de Acceso y Verificación de Identidad</h2>
          <p>
            Para garantizar la seguridad integral de nuestras instalaciones y evitar suplantaciones de identidad, GymStark implementa sistemas de control de acceso mediante:
          </p>
          <ul>
            <li>Lectura de Códigos QR únicos y dinámicos generados desde la aplicación.</li>
            <li>Validación de Documento Nacional de Identidad (DNI) o Carné de Extranjería en recepción.</li>
            <li>Reconocimiento biométrico facial automatizado en terminales de acceso autorizados.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Libro de Reclamaciones Virtual</h2>
          <p>
            En cumplimiento del D.S. N° 011-2011-PCM y la Ley N° 29571, ponemos a disposición de nuestros clientes y público en general nuestro{' '}
            <Link to={PATHS.COMPLAINTS} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>
              Libro de Reclamaciones Virtual
            </Link>
            , a través del cual podrá registrar quejas o reclamos, los cuales serán atendidos en un plazo máximo de quince (15) días hábiles.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Jurisdicción y Solución de Controversias</h2>
          <p>
            Los presentes Términos y Condiciones se rigen por las leyes de la República del Perú. Para la resolución de cualquier controversia o discrepancia derivada del presente contrato, ambas partes se someten a la competencia de los jueces y tribunales del Distrito Judicial de Lima, Perú, sin perjuicio de las facultades fiscalizadoras y sancionadoras del INDECOPI.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
