import { pool } from './index.js';

export const migrateInvoices = async () => {
  const client = await pool.connect();
  try {
    console.log('Migrating invoices table...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(30) PRIMARY KEY,
        payment_id VARCHAR(30) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo_doc VARCHAR(2) NOT NULL,
        serie VARCHAR(4) NOT NULL,
        correlativo INTEGER NOT NULL,
        fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        client_tipo_doc VARCHAR(2) NOT NULL,
        client_num_doc VARCHAR(20) NOT NULL,
        client_rzn_social VARCHAR(255) NOT NULL,
        client_address TEXT,
        mto_oper_gravadas NUMERIC(10, 2) NOT NULL,
        mto_igv NUMERIC(10, 2) NOT NULL,
        total_venta NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        sunat_response JSONB,
        ubl_payload JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_serie_correlativo ON invoices(serie, correlativo);
      CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices(payment_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
    `);

    await client.query('COMMIT');
    console.log('Invoices table created or verified successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error migrating invoices table:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Si se ejecuta directamente desde CLI
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  migrateInvoices()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
