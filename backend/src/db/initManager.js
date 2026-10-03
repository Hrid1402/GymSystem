import 'dotenv/config';
import { pool } from './index.js';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import { newId } from '../lib/ids.js';

const initializeManager = async () => {
  const email = process.env.INITIAL_MANAGER_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_MANAGER_PASSWORD;
  const firstName = process.env.INITIAL_MANAGER_FIRST_NAME || 'Genesis';
  const lastName = process.env.INITIAL_MANAGER_LAST_NAME || 'Manager';
  const dni = process.env.INITIAL_MANAGER_DNI || '00000000';

  if (!email || !password) {
    console.error('Missing INITIAL_MANAGER_EMAIL or INITIAL_MANAGER_PASSWORD in environment variables.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('INITIAL_MANAGER_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const client = await pool.connect();
  let authUserId = null;

  try {
    const check = await client.query("SELECT id FROM users WHERE role = 'MANAGER' LIMIT 1");

    if (check.rows.length > 0) {
      console.log('Manager account already exists. Skipping Genesis Manager creation.');
      return;
    }

    console.log('No Manager found. Creating Genesis Manager...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.code === 'email_exists' || error.message.includes('already')) {
        console.error(`Supabase Auth: ${email} already exists but has no row in users. Delete it in Supabase and re-run.`);
        process.exit(1);
      }
      throw new Error(`Supabase error: ${error.message}`);
    }

    authUserId = data.user.id;

    await client.query(
      `INSERT INTO users (id, supabase_user_id, email, first_name, last_name, dni, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'MANAGER')`,
      [newId('USR'), authUserId, email, firstName, lastName, dni]
    );

    console.log(`Genesis Manager created successfully: ${email}`);
  } catch (error) {
    // Don't leave an orphan auth user behind
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }
    console.error('Error creating initial manager:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

initializeManager();