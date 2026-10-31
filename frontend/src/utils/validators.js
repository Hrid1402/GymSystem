/**
 * Validaciones y sanitizaciones compartidas para el Frontend
 */

/**
 * Retorna la fecha máxima permitida (AAAA-MM-DD) para que una persona tenga al menos 18 años hoy.
 */
export const getEighteenYearsAgoDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Valida si una fecha de nacimiento (AAAA-MM-DD) corresponde a un mayor de edad (al menos 18 años).
 */
export const isAdult = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  const birthDate = new Date(year, month, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month ||
    birthDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }

  return age >= 18;
};

/**
 * Valida fecha de nacimiento completa (obligatoriedad, formato, rango y mayoría de edad).
 */
export const validateDateOfBirth = (dateStr, isRequired = true) => {
  if (!dateStr || !dateStr.trim()) {
    return isRequired ? 'La fecha de nacimiento es obligatoria' : '';
  }

  const clean = dateStr.trim();
  const parts = clean.split('-');
  if (parts.length !== 3) {
    return 'La fecha de nacimiento debe tener el formato AAAA-MM-DD';
  }

  const year = parseInt(parts[0], 10);
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
    return 'Ingrese una fecha de nacimiento válida';
  }

  const maxDate = getEighteenYearsAgoDate();
  if (clean > maxDate || !isAdult(clean)) {
    return 'El usuario debe ser mayor de edad (al menos 18 años)';
  }

  return '';
};

/**
 * Valida formato de DNI peruano (8 dígitos numéricos, no 00000000).
 */
export const validateDni = (dni, isRequired = true) => {
  if (!dni || !dni.trim()) {
    return isRequired ? 'El DNI es obligatorio' : '';
  }

  const clean = dni.trim();
  if (!/^\d{8}$/.test(clean)) {
    return 'El DNI debe tener exactamente 8 dígitos numéricos';
  }

  if (clean === '00000000') {
    return 'El número de DNI ingresado no es válido';
  }

  return '';
};

/**
 * Valida número celular peruano (9 dígitos, comenzando con 9).
 */
export const validatePhone = (phone, isRequired = false) => {
  if (!phone || !phone.trim()) {
    return isRequired ? 'El número celular es obligatorio' : '';
  }

  const clean = phone.trim();
  if (!/^9\d{8}$/.test(clean)) {
    return 'El número celular debe tener 9 dígitos y empezar con 9';
  }

  return '';
};

/**
 * Valida correo electrónico.
 */
export const validateEmail = (email, isRequired = true) => {
  if (!email || !email.trim()) {
    return isRequired ? 'El correo electrónico es obligatorio' : '';
  }

  const clean = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return 'El formato del correo es inválido (ejemplo: usuario@correo.com)';
  }

  return '';
};

/**
 * Valida contraseña (mínimo 8 caracteres).
 */
export const validatePassword = (password, isRequired = true) => {
  if (!password) {
    return isRequired ? 'La contraseña es obligatoria' : '';
  }

  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  return '';
};

/**
 * Valida nombres y apellidos (solo letras, tildes, ñ y espacios).
 */
export const validateName = (name, fieldLabel = 'El nombre', isRequired = true) => {
  if (!name || !name.trim()) {
    return isRequired ? `${fieldLabel} es obligatorio` : '';
  }

  const clean = name.trim();
  if (clean.length > 100) {
    return `${fieldLabel} no puede exceder 100 caracteres`;
  }

  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(clean)) {
    return `${fieldLabel} solo puede contener letras y espacios`;
  }

  return '';
};

/**
 * Sanitiza valores para permitir únicamente letras, tildes, ñ y espacios.
 */
export const sanitizeLettersOnly = (value) => {
  if (!value) return '';
  return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '');
};

/**
 * Sanitiza valores numéricos eliminando cualquier caracter no dígito y limitando longitud.
 */
export const sanitizeDigitsOnly = (value, maxLength = 8) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return maxLength ? digits.slice(0, maxLength) : digits;
};
