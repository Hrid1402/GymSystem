import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/authApi';
import { PATHS } from '../routes/paths';
import '../styles/login.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      const msg = 'El correo electrónico es obligatorio';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      const msg = 'El formato del correo es inválido (ejemplo: usuario@correo.com)';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(cleanEmail);
      setSuccessInfo(res);
      toast.success('Solicitud enviada. Revisa tu bandeja de entrada.');
    } catch (err) {
      const message = err.message || 'Error al procesar la solicitud';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <Link to="/" className="login-logo">
          <span className="login-logo-icon">+</span>
          <span>GymStark</span>
        </Link>

        {successInfo ? (
          <div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px'
            }}>
              ✓
            </div>
            <h1>¡Revisa tu correo!</h1>
            <p className="login-description" style={{ fontSize: '11px', lineHeight: '1.5', marginTop: '10px' }}>
              {successInfo.message || 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.'}
            </p>

            {successInfo.action_link && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600, display: 'block' }}>
                  Enlace de recuperación directo:
                </span>
                <a
                  href={successInfo.action_link}
                  style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#15803d',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    wordBreak: 'break-all'
                  }}
                >
                  Restablecer contraseña ahora →
                </a>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="login-button"
                onClick={() => {
                  setSuccessInfo(null);
                  setEmail('');
                }}
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                Probar con otro correo
              </button>
              <Link to={PATHS.LOGIN} style={{ fontSize: '11px', color: '#1769e0', textDecoration: 'none', fontWeight: 600 }}>
                Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Título */}
            <h1>Recuperar contraseña</h1>
            <p className="login-description" style={{ fontSize: '11px', lineHeight: '1.4' }}>
              Ingresa tu correo electrónico registrado y te enviaremos las instrucciones para restablecer tu contraseña.
            </p>

            {/* Mensaje de error visible en texto rojo */}
            {error && (
              <div style={{
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="email">Correo electrónico registrado</label>
                <input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={loading}
                  style={error ? { borderColor: '#ef4444' } : {}}
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <p className="register-text" style={{ marginTop: '20px' }}>
              ¿Recordaste tu contraseña? <Link to={PATHS.LOGIN}>Inicia sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
