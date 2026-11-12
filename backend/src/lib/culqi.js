const CULQI_API_BASE = 'https://api.culqi.com/v2';

const getSecretKey = () => {
  const key = process.env.CULQI_SECRET_KEY;
  if (!key) {
    console.warn('⚠️ CULQI_SECRET_KEY no está configurada en las variables de entorno.');
  }
  return key || '';
};

/**
 * Cliente HTTP ligero y nativo para la API REST de Culqi v2.
 */
async function culqiRequest(endpoint, { method = 'GET', body, timeoutMs = 10000 } = {}) {
  const secretKey = getSecretKey();
  const url = `${CULQI_API_BASE}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.user_message ||
        data.merchant_message ||
        data.message ||
        `Error en Culqi API (${response.status})`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.culqiData = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con Culqi');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const culqi = {
  /**
   * Crea una orden de pago en Culqi (soporta Tarjetas, Yape y PagoEfectivo en Checkout v4)
   * POST /v2/orders
   */
  createOrder: async ({
    amount, // Monto en céntimos enteros (ej. 15000 para S/ 150.00)
    currencyCode = 'PEN',
    description,
    orderNumber,
    clientDetails,
    expirationDate,
    metadata = {},
  }) => {
    // Culqi requiere obligatoriamente expiration_date en timestamp Unix (segundos) en el futuro
    const defaultExpiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const expirationSeconds = expirationDate
      ? Math.floor(new Date(expirationDate).getTime() / 1000)
      : defaultExpiration;

    const payload = {
      amount: Math.round(Number(amount)),
      currency_code: currencyCode,
      description: String(description || 'Membresía GymStark').slice(0, 80),
      order_number: String(orderNumber).slice(0, 30),
      expiration_date: expirationSeconds,
      client_details: {
        first_name: clientDetails?.firstName || 'Cliente',
        last_name: clientDetails?.lastName || 'GymStark',
        email: clientDetails?.email,
        phone_number: clientDetails?.phone || '+51999999999',
      },
      metadata,
    };

    return culqiRequest('/orders', {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Procesa un cargo contra un token generado por Culqi Checkout
   * POST /v2/charges
   */
  createCharge: async ({
    amount, // Monto en céntimos enteros
    currencyCode = 'PEN',
    email,
    sourceId, // Token de tarjeta: tkn_live_... o tkn_test_...
    orderId, // Opcional si se vincula a una orden previa: ord_...
    installments = 0,
    metadata = {},
  }) => {
    const payload = {
      amount: Math.round(Number(amount)),
      currency_code: currencyCode,
      email,
      source_id: sourceId,
      installments: Number(installments) || 0,
      metadata,
    };

    if (orderId) {
      payload.order_id = orderId;
    }

    return culqiRequest('/charges', {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Consulta una orden de pago por su ID (ord_...)
   * GET /v2/orders/:id
   */
  getOrder: async (orderId) => {
    return culqiRequest(`/orders/${orderId}`, { method: 'GET' });
  },

  /**
   * Consulta un cargo por su ID (chr_...)
   * GET /v2/charges/:id
   */
  getCharge: async (chargeId) => {
    return culqiRequest(`/charges/${chargeId}`, { method: 'GET' });
  },
};
