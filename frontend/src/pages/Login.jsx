import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { PATHS } from '../routes/paths';
import PasswordInput from '../components/common/PasswordInput';
import '../styles/login.css';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
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

    if (!password) {
      const msg = 'La contraseña es obligatoria';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(cleanEmail, password);
      toast.success('Sesión iniciada correctamente');

      if (loggedUser?.role === 'MANAGER') {
        navigate(PATHS.USERS);
      } else if (loggedUser?.role === 'RECEPTIONIST') {
        navigate(PATHS.CLIENTS);
      } else {
        navigate(PATHS.INICIO);
      }
    } catch (err) {
      const message = err.message || 'Error al iniciar sesión';
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

        {/* Título */}
        <h1>Iniciar sesión</h1>
        <p className="login-description">Accede a tu cuenta para continuar</p>

        {/* Mensaje de error visible en texto rojo */}
        {error && (
          <div style={{
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Correo */}
          <div className="input-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={handleEmailChange}
              disabled={loading}
              style={error && !email.includes('@') ? { borderColor: '#ef4444' } : {}}
            />
          </div>

          {/* Contraseña */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="password" style={{ marginBottom: 0 }}>Contraseña</label>
              <Link
                to={PATHS.FORGOT_PASSWORD}
                style={{ fontSize: '9px', color: '#1769e0', textDecoration: 'none', fontWeight: 500 }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="Contraseña"
              value={password}
              onChange={handlePasswordChange}
              disabled={loading}
              style={error && !password ? { borderColor: '#ef4444' } : {}}
            />
          </div>

          {/* Botón */}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Registro */}
        <p className="register-text">
          ¿No tienes una cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;