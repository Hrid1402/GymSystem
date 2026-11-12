import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import { newId } from '../lib/id.js';

export const initializeManager = async ({ closePool = true } = {}) => {
  const email = process.env.INITIAL_MANAGER_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_MANAGER_PASSWORD;
  const firstName = process.env.INITIAL_MANAGER_FIRST_NAME || 'Genesis';
  const lastName = process.env.INITIAL_MANAGER_LAST_NAME || 'Manager';
  const dni = process.env.INITIAL_MANAGER_DNI || '00000000';

  if (!email || !password) {
    console.error('Missing INITIAL_MANAGER_EMAIL or INITIAL_MANAGER_PASSWORD in environment variables.');
    if (closePool) process.exit(1);
    throw new Error('Missing INITIAL_MANAGER_EMAIL or INITIAL_MANAGER_PASSWORD');
  }
  if (password.length < 8) {
    console.error('INITIAL_MANAGER_PASSWORD must be at least 8 characters.');
    if (closePool) process.exit(1);
    throw new Error('INITIAL_MANAGER_PASSWORD must be at least 8 characters.');
  }

  const client = await pool.connect();
  let authUserId = null;
  let isReusedAuthUser = false;

  try {
    const check = await client.query("SELECT id, supabase_user_id FROM users WHERE role = 'MANAGER' LIMIT 1");

    if (check.rows.length > 0) {
      console.log('Manager account already exists in database.');
      // Ensure Supabase Auth password matches environment variable
      if (check.rows[0].supabase_user_id) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(check.rows[0].supabase_user_id, {
            password,
            email_confirm: true,
          });
          console.log('Manager credentials synced in Supabase Auth.');
        } catch (syncErr) {
          console.warn('Could not sync manager auth password:', syncErr.message);
        }
      }
      return;
    }

    console.log('No Manager found. Creating Genesis Manager...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.code === 'email_exists' || error.message?.includes('already')) {
        console.log(`Supabase Auth user for ${email} already exists. Re-linking and updating password...`);
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email);
        if (!existing) {
          throw new Error(`User with email ${email} reported to exist, but could not be located in Supabase Auth.`);
        }
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
        });
        authUserId = existing.id;
        isReusedAuthUser = true;
      } else {
        throw new Error(`Supabase error: ${error.message}`);
      }
    } else {
      authUserId = data.user.id;
    }

    await client.query(
      `INSERT INTO users (id, supabase_user_id, email, first_name, last_name, tipo_documento, numero_documento, role)
       VALUES ($1, $2, $3, $4, $5, 'dni', $6, 'MANAGER')`,
      [newId('USR'), authUserId, email, firstName, lastName, dni]
    );

    console.log(`Genesis Manager created successfully: ${email}`);
  } catch (error) {
    // Don't leave an orphan auth user behind if it was freshly created in this run
    if (authUserId && !isReusedAuthUser) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }
    console.error('Error creating initial manager:', error);
    if (closePool) process.exit(1);
    throw error;
  } finally {
    client.release();
    if (closePool) {
      await pool.end();
    }
  }
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  initializeManager({ closePool: true }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

