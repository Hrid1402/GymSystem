import { pool } from '../db/index.js';

export const checkHealth = async (req, res) => {
  const healthProfile = {
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    database: 'disconnected',
    db_time: null
  };

  try {
    const dbTest = await pool.query('SELECT NOW()');
    
    healthProfile.database = 'connected';
    healthProfile.db_time = dbTest.rows[0].now;
    
    return res.status(200).json({ 
      success: true, 
      data: healthProfile 
    });
  } catch (err) {
    console.error('Database connection error during health check:', err);
    healthProfile.status = 'degraded';
    
    return res.status(503).json({ 
      success: false, 
      data: healthProfile 
    });
  }
};