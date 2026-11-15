import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

pg.types.setTypeParser(1082, (value) => value);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables');
}

const isRemoteDb =
  process.env.NODE_ENV === 'production' ||
  process.env.DATABASE_URL?.includes('supabase.com') ||
  process.env.DATABASE_URL?.includes('sslmode=require');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const query = (text, params) => pool.query(text, params);