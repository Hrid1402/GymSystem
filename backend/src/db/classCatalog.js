import { pool } from './index.js';

export const listCatalog = async ({ onlyActive = true } = {}) => {
  const { rows } = await pool.query(
    `
      SELECT id, nombre, categoria, is_active, created_at, updated_at
      FROM class_catalog
      ${onlyActive ? 'WHERE is_active = true' : ''}
      ORDER BY categoria ASC, nombre ASC
    `
  );
  return rows;
};

export const findCatalogById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, nombre, categoria, is_active FROM class_catalog WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
};

export const insertCatalogItem = async ({ id, nombre, categoria }) => {
  const { rows } = await pool.query(
    `
      INSERT INTO class_catalog (id, nombre, categoria, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id, nombre, categoria, is_active, created_at, updated_at
    `,
    [id, nombre, categoria]
  );
  return rows[0];
};

export const updateCatalogItem = async (id, fields) => {
  const allowed = ['nombre', 'categoria', 'is_active'];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k) && fields[k] !== undefined);
  if (keys.length === 0) return findCatalogById(id);

  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);

  const { rows } = await pool.query(
    `
      UPDATE class_catalog
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING id, nombre, categoria, is_active, created_at, updated_at
    `,
    [...values, id]
  );
  return rows[0] ?? null;
};

export const deleteCatalogItem = async (id) => {
  const { rowCount } = await pool.query(`DELETE FROM class_catalog WHERE id = $1`, [id]);
  return rowCount > 0;
};
