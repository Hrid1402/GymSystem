import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

pg.types.setTypeParser(1082, (value) => value);pg.types.setTypeParser(1082, (value) => value);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);