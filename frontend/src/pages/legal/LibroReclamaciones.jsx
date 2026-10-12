import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LegalFooter from '../../components/layout/LegalFooter';
import '../../styles/legal.css';

export default function LibroReclamaciones() {
  const navigate = useNavigate();
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'GymStark Perú S.A.C.';
  const ruc = import.meta.env.VITE_COMPANY_RUC || '20601234567';
  const address = import.meta.env.VITE_COMPANY_ADDRESS || 'Av. Principal 1234, Miraflores, Lima, Perú';

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    address: '',
    type: 'QUEJA', // RECLAMO o QUEJA
    amount: '',
    description: '',
    detail: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dni || !formData.email || !formData.detail) {
      toast.error('Por favor complete los campos obligatorios (*)');
      return;
    }

    setSubmitted(true);
    toast.success('Su reclamo/queja ha sido registrado exitosamente.');
  };

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
        <h1>Libro de Reclamaciones Virtual</h1>
        <p className="legal-updated">
          Conforme a lo establecido en el Código de Protección y Defensa del Consumidor (Ley N° 29571) y el D.S. N° 011-2011-PCM.
        </p>

        <div className="claim-establishment-info">
          <p><strong>Razón Social:</strong> {companyName}</p>
          <p><strong>RUC:</strong> {ruc}</p>
          <p><strong>Dirección:</strong> {address}</p>
        </div>

        {submitted ? (
          <div className="claim-success-card">
            <h3>¡Hoja de Reclamación Registrada!</h3>
            <p>
              Estimado(a) <strong>{formData.name}</strong>, hemos registrado su {formData.type.toLowerCase()} con código de seguimiento temporal <strong>REC-{Math.floor(100000 + Math.random() * 900000)}</strong>.
            </p>
            <p>
              De conformidad con la normativa de INDECOPI, la empresa dará respuesta a su solicitud en un plazo no mayor a quince (15) días hábiles al correo electrónico proporcionado ({formData.email}).
            </p>
            <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
              Volver al inicio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="complaint-form">
            <h3 className="form-subheading">1. Identificación del Consumidor Reclamante</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombres y Apellidos *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Documento de Identidad (DNI/CE) *</label>
                <input type="text" name="dni" value={formData.dni} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Correo Electrónico *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Teléfono / Celular</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
            </div>

            <h3 className="form-subheading">2. Identificación del Bien o Servicio Contratado</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo de Reclamación *</label>
                <select name="type" value={formData.type} onChange={handleChange}>
                  <option value="RECLAMO">Reclamo (Disconformidad relacionada a los servicios)</option>
                  <option value="QUEJA">Queja (Disconformidad frente a la mala atención al público)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Monto Reclamado (S/ - Opcional)</label>
                <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" />
              </div>
            </div>

            <h3 className="form-subheading">3. Detalle de la Reclamación y Pedido del Consumidor</h3>
            <div className="form-group">
              <label>Detalle de lo ocurrido *</label>
              <textarea
                name="detail"
                rows="4"
                value={formData.detail}
                onChange={handleChange}
                placeholder="Describa claramente los hechos ocurridos..."
                required
              />
            </div>

            <div className="form-group">
              <label>Pedido concreto del consumidor (Opcional)</label>
              <textarea
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="¿Qué solución solicita a la empresa?"
              />
            </div>

            <p className="claim-legal-disclaimer">
              * La formulación del reclamo no excluye el recurso a otros medios de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
            </p>

            <button type="submit" className="btn-primary" style={{ marginTop: '16px', padding: '12px 24px' }}>
              Enviar Hoja de Reclamación
            </button>
          </form>
        )}
      </main>

      <LegalFooter />
    </div>
  );
}
