import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import PasswordInput from "../components/common/PasswordInput";
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

  const getEighteenYearsAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  };
  const maxBirthDate = getEighteenYearsAgo();

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

    let sanitizedValue = value;

    if (fieldName === "first_name" || fieldName === "last_name") {
      // Permitir únicamente letras, tildes, ñ y espacios
      sanitizedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, "");
    } else if (fieldName === "dni") {
      // Solo dígitos numéricos, máximo 8
      sanitizedValue = value.replace(/\D/g, "").slice(0, 8);
    } else if (fieldName === "phone") {
      // Solo dígitos numéricos, máximo 9
      sanitizedValue = value.replace(/\D/g, "").slice(0, 9);
      if (sanitizedValue.length > 0 && sanitizedValue[0] !== '9') {
        setError("El celular debe iniciar con 9");
      } else {
        setError("");
      }
    } else if (fieldName === "date_of_birth") {
      if (value && value > maxBirthDate) {
        setError("Debes ser mayor de edad (al menos 18 años)");
        return;
      }
      setError("");
    }

    setFormData((prev) => ({ ...prev, [fieldName]: sanitizedValue }));
    if (fieldName !== "phone") setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const dni = formData.dni.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const dob = formData.date_of_birth;

    if (!firstName || !lastName || !dni || !email || !formData.password) {
      setError("Por favor complete todos los campos obligatorios");
      return;
    }

    if (!/^\d{8}$/.test(dni)) {
      setError("El DNI debe tener exactamente 8 dígitos numéricos");
      return;
    }

    if (dni === '00000000') {
      setError("El número de DNI ingresado no es válido");
      return;
    }

    if (phone && !/^9\d{8}$/.test(phone)) {
      setError("El celular debe tener 9 dígitos y empezar con 9");
      return;
    }

    if (dob) {
      if (dob > maxBirthDate) {
        setError("Debes ser mayor de edad (al menos 18 años)");
        return;
      }
      if (dob < "1920-01-01") {
        setError("Ingrese una fecha de nacimiento válida");
        return;
      }
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Ingrese un correo electrónico válido");
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
        first_name: firstName,
        last_name: lastName,
        dni,
        phone: phone || undefined,
        date_of_birth: dob || undefined,
        email,
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
          <span className="register-logo-icon">+</span>
          <span>GymStark</span>
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
              max={maxBirthDate}
              min="1920-01-01"
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
            <PasswordInput
              id="password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Confirmación de contraseña */}
          <div className="register-input-group">
            <label htmlFor="confirmPassword">Confirmar contraseña *</label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repetir contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
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