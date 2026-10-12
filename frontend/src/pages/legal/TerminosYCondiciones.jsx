import { useNavigate } from 'react-router-dom';
import LegalFooter from '../../components/layout/LegalFooter';
import '../../styles/legal.css';

export default function TerminosYCondiciones() {
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
          <button className="btn-back-legal" onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </header>

      <main className="legal-content-container">
        <h1>Términos y Condiciones del Servicio</h1>
        <p className="legal-updated">Última actualización: Octubre 2026 | Conforme a la legislación de la República del Perú</p>

        <section className="legal-section">
          <h2>1. Identificación del Proveedor</h2>
          <p>
            El presente contrato de servicios es celebrado entre el usuario y <strong>{companyName}</strong>, con <strong>RUC {ruc}</strong>, en adelante «GymStark», quien pone a disposición membresías para acceso y uso de instalaciones deportivas.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Naturaleza del Servicio y Membresías</h2>
          <p>
            Las membresías adquiridas a través de la plataforma otorgan derecho de acceso personal e intransferible a las instalaciones de GymStark durante la vigencia especificada en el plan seleccionado (30, 90, 180 o 365 días calendario).
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Precios, Moneda y Facturación (SUNAT)</h2>
          <p>
            Todos los precios publicados en el sitio web están expresados en Soles peruanos (PEN) e incluyen el 18% correspondiente al Impuesto General a las Ventas (IGV). Al completar el pago, se emitirá la respectiva Boleta de Venta Electrónica o Factura electrónica conforme a las disposiciones tributarias de la SUNAT.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Pasarela de Pagos y Seguridad</h2>
          <p>
            Los pagos en línea se procesan a través de la pasarela autorizada <strong>Mercado Pago</strong> (MercadoLibre Perú S.R.L.). GymStark no almacena ni tiene acceso directo a datos sensibles de tarjetas de crédito o débito, los cuales son procesados bajo estándares internacionales de seguridad PCI-DSS.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Política de Cancelación y Reembolsos</h2>
          <p>
            El usuario puede cancelar su membresía activa en cualquier momento a través de su panel de usuario. De conformidad con la naturaleza del servicio deportivo y el Código de Protección y Defensa del Consumidor (Ley N° 29571), la cancelación extingue el acceso inmediato y no genera reembolsos retroactivos por periodos de tiempo ya transcurridos o activados, salvo causales legalmente amparadas por el derecho de desistimiento dentro de los plazos establecidos por ley.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Jurisdicción y Solución de Controversias</h2>
          <p>
            Cualquier controversia derivada de la interpretación o ejecución de los presentes términos se someterá a la competencia de los jueces y tribunales del Distrito Judicial de Lima, Perú, y a la autoridad administrativa del INDECOPI.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
