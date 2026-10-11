import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

if (!accessToken) {
  console.warn('⚠️ MERCADO_PAGO_ACCESS_TOKEN is not defined in environment variables.');
}

// Inicializar cliente Mercado Pago SDK
export const client = new MercadoPagoConfig({
  accessToken: accessToken || '',
  options: {
    timeout: 7000,
  },
});

// Instancias de servicios Mercado Pago
export const preferenceClient = new Preference(client);
export const paymentClient = new Payment(client);
