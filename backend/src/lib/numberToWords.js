/**
 * Convierte un importe numérico a su representación en letras según la normativa SUNAT
 * Ejemplo: 100.00 -> "SON CIEN CON 00/100 SOLES"
 *          240.50 -> "SON DOSCIENTOS CUARENTA CON 50/100 SOLES"
 */

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS_ESPECIALES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertGroup(n) {
  let output = '';
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  if (n === 100) return 'CIEN';

  if (c > 0) output += CENTENAS[c] + ' ';

  const du = n % 100;
  if (du >= 10 && du <= 19) {
    output += DECENAS_ESPECIALES[du - 10] + ' ';
    return output.trim();
  }

  if (du >= 21 && du <= 29) {
    output += 'VEINTI' + UNIDADES[u] + ' ';
    return output.trim();
  }

  if (d > 0) {
    output += DECENAS[d];
    if (u > 0) output += ' Y ' + UNIDADES[u];
    output += ' ';
  } else if (u > 0) {
    output += UNIDADES[u] + ' ';
  }

  return output.trim();
}

export function numberToWords(amount) {
  const num = Math.round(Number(amount) * 100) / 100;
  if (isNaN(num) || num < 0) return 'SON CERO CON 00/100 SOLES';

  const enteros = Math.floor(num);
  const centavos = Math.round((num - enteros) * 100);
  const centavosStr = String(centavos).padStart(2, '0') + '/100 SOLES';

  if (enteros === 0) return `SON CERO CON ${centavosStr}`;

  let palabras = '';

  const miles = Math.floor(enteros / 1000);
  const unidades = enteros % 1000;

  if (miles === 1) {
    palabras += 'MIL ';
  } else if (miles > 1) {
    palabras += convertGroup(miles) + ' MIL ';
  }

  if (unidades > 0) {
    palabras += convertGroup(unidades);
  }

  return `SON ${palabras.trim()} CON ${centavosStr}`;
}
