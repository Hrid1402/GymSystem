import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import "../styles/register.css";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    phone: "",
    date_of_birth: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const fieldMap = {
      nombres: "first_name",
      apellidos: "last_name",
      dni: "dni",
      celular: "phone",
      fechaNacimiento: "date_of_birth",
      email: "email",
      password: "password",
      confirmPassword: "confirmPassword",
    };
    const fieldName = fieldMap[id] || id;
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.dni || !formData.email || !formData.password) {
      setError("Por favor complete todos los campos obligatorios");
      return;
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        first_name: formData.first_name,
        last_name: formData.last_name,
        dni: formData.dni,
        phone: formData.phone || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        email: formData.email,
        password: formData.password,
      });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        {/* Logo */}
        <Link to="/" className="register-logo">
          <span className="register-logo-icon">✚</span>
          <span>GymFlow</span>
        </Link>

        {/* Título */}
        <h1>Registrarse</h1>
        <p className="register-description">Crea tu cuenta y empieza hoy</p>

        {error && <div className="form-error-banner" style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Nombres */}
          <div className="register-input-group">
            <label htmlFor="nombres">Nombres *</label>
            <input
              id="nombres"
              type="text"
              placeholder="Nombres"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Apellidos */}
          <div className="register-input-group">
            <label htmlFor="apellidos">Apellidos *</label>
            <input
              id="apellidos"
              type="text"
              placeholder="Apellidos"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* DNI */}
          <div className="register-input-group">
            <label htmlFor="dni">DNI *</label>
            <input
              id="dni"
              type="text"
              placeholder="DNI (8 dígitos)"
              maxLength="8"
              value={formData.dni}
              onChange={handleChange}
              required
            />
          </div>

          {/* Celular */}
          <div className="register-input-group">
            <label htmlFor="celular">Celular</label>
            <input
              id="celular"
              type="tel"
              placeholder="Celular (9 dígitos)"
              maxLength="9"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Fecha de nacimiento */}
          <div className="register-input-group">
            <label htmlFor="fechaNacimiento">Fecha de nacimiento</label>
            <input
              id="fechaNacimiento"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>

          {/* Correo */}
          <div className="register-input-group">
            <label htmlFor="email">Correo electrónico *</label>
            <input
              id="email"
              type="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Contraseña */}
          <div className="register-input-group">
            <label htmlFor="password">Contraseña *</label>
            <input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Confirmación de contraseña */}
          <div className="register-input-group">
            <label htmlFor="confirmPassword">Confirmar contraseña *</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repetir contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {/* Botón */}
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        {/* Login */}
        <p className="login-text">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;