import { pool } from './index.js';

const SELECT = `
  SELECT i.id, i.payment_id, i.user_id, i.tipo_doc, i.serie, i.correlativo,
         i.fecha_emision, i.client_tipo_doc, i.client_num_doc, i.client_rzn_social,
         i.client_address, i.mto_oper_gravadas, i.mto_igv, i.total_venta,
         i.status, i.sunat_response, i.ubl_payload, i.created_at, i.updated_at,
         p.plan_id, p.membership_id, pl.name AS plan_name, pl.duration_days,
         u.first_name, u.last_name, u.email
  FROM invoices i
  JOIN payments p ON p.id = i.payment_id
  JOIN plans pl ON pl.id = p.plan_id
  JOIN users u ON u.id = i.user_id
`;

export const getNextCorrelativo = async (serie) => {
  const query = `
    SELECT COALESCE(MAX(correlativo), 0) + 1 AS next_correlativo
    FROM invoices
    WHERE serie = $1;
  `;
  const { rows } = await pool.query(query, [serie]);
  return Number(rows[0]?.next_correlativo || 1);
};

export const createInvoiceRecord = async ({
  id,
  paymentId,
  userId,
  tipoDoc,
  serie,
  correlativo,
  fechaEmision = new Date(),
  clientTipoDoc,
  clientNumDoc,
  clientRznSocial,
  clientAddress = '',
  mtoOperGravadas,
  mtoIgv,
  totalVenta,
  status = 'PENDIENTE',
  sunatResponse = null,
  ublPayload,
}) => {
  const query = `
    INSERT INTO invoices (
      id, payment_id, user_id, tipo_doc, serie, correlativo,
      fecha_emision, client_tipo_doc, client_num_doc, client_rzn_social,
      client_address, mto_oper_gravadas, mto_igv, total_venta,
      status, sunat_response, ubl_payload
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    id,
    paymentId,
    userId,
    tipoDoc,
    serie,
    correlativo,
    fechaEmision,
    clientTipoDoc,
    clientNumDoc,
    clientRznSocial,
    clientAddress,
    mtoOperGravadas,
    mtoIgv,
    totalVenta,
    status,
    sunatResponse ? JSON.stringify(sunatResponse) : null,
    JSON.stringify(ublPayload),
  ]);
  return rows[0];
};

export const findInvoiceById = async (id) => {
  const { rows } = await pool.query(`${SELECT} WHERE i.id = $1`, [id]);
  return rows[0] ?? null;
};

export const findInvoiceByPaymentId = async (paymentId) => {
  const { rows } = await pool.query(`${SELECT} WHERE i.payment_id = $1`, [paymentId]);
  return rows[0] ?? null;
};

export const listInvoicesByUser = async (userId) => {
  const { rows } = await pool.query(
    `${SELECT} WHERE i.user_id = $1 ORDER BY i.created_at DESC`,
    [userId]
  );
  return rows;
};

export const listAllInvoices = async () => {
  const { rows } = await pool.query(`${SELECT} ORDER BY i.created_at DESC`);
  return rows;
};

export const updateInvoiceStatus = async ({ id, status, sunatResponse }) => {
  const query = `
    UPDATE invoices
    SET status = $2,
        sunat_response = COALESCE($3, sunat_response),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    id,
    status,
    sunatResponse ? JSON.stringify(sunatResponse) : null,
  ]);
  return rows[0] ?? null;
};
