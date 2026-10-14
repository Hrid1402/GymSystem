import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/authApi';
import { PATHS } from '../routes/paths';
import PasswordInput from '../components/common/PasswordInput';
import '../styles/login.css';

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(null);
  const [tokenError, setTokenError] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Extraer token de hash (#access_token=...&type=recovery)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
    const searchParams = new URLSearchParams(location.search);

    const extractedToken =
      hashParams.get('access_token') ||
      searchParams.get('access_token') ||
      searchParams.get('token');

    const errorDesc =
      hashParams.get('error_description') ||
      searchParams.get('error_description');

    if (errorDesc) {
      setTokenError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
      return;
    }

    if (extractedToken) {
      setToken(extractedToken);
    } else {
      setTokenError('No se encontró un token de recuperación válido en la URL.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      const msg = 'El enlace de recuperación es inválido o ha expirado';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!password) {
      const msg = 'La nueva contraseña es obligatoria';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (password.length < 8) {
      const msg = 'La nueva contraseña debe tener al menos 8 caracteres';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Las contraseñas no coinciden';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.');
      navigate(PATHS.LOGIN, { replace: true });
    } catch (err) {
      const message = err.message || 'Error al restablecer la contraseña';
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

        {tokenError ? (
          <div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px'
            }}>
              ✕
            </div>
            <h1>Enlace no válido o expirado</h1>
            <p className="login-description" style={{ fontSize: '11px', lineHeight: '1.5', marginTop: '10px' }}>
              {typeof tokenError === 'string'
                ? tokenError
                : 'El enlace para restablecer tu contraseña no es válido o ha expirado.'}
            </p>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to={PATHS.FORGOT_PASSWORD}
                className="login-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
              >
                Solicitar nuevo enlace
              </Link>
              <Link to={PATHS.LOGIN} style={{ fontSize: '11px', color: '#1769e0', textDecoration: 'none', fontWeight: 600 }}>
                Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Título */}
            <h1>Nueva contraseña</h1>
            <p className="login-description" style={{ fontSize: '11px', lineHeight: '1.4' }}>
              Ingresa y confirma tu nueva contraseña para acceder a tu cuenta.
            </p>

            {/* Mensaje de error visible */}
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
                <label htmlFor="password">Nueva contraseña (mínimo 8 caracteres)</label>
                <PasswordInput
                  id="password"
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={loading}
                  style={error && password.length < 8 ? { borderColor: '#ef4444' } : {}}
                />
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={loading}
                  style={error && password !== confirmPassword ? { borderColor: '#ef4444' } : {}}
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Actualizando...' : 'Restablecer contraseña'}
              </button>
            </form>

            <p className="register-text" style={{ marginTop: '20px' }}>
              <Link to={PATHS.LOGIN}>Cancelar y volver al inicio de sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
