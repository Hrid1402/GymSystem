// controllers/client.controller.js
const pool = require('../config/db');

exports.registerFace = async (req, res) => {
  const { userId, embedding } = req.body;

  try {
    if (!embedding || embedding.length === 0) {
      return res.status(400).json({ message: 'Descriptor facial inválido.' });
    }

    // 1. Verificar si el usuario existe y es estrictamente un CLIENTE
    const userCheck = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (userCheck.rows.totalCount > 0 || userCheck.rows[0].role !== 'CLIENT') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado: El registro facial solo está permitido para clientes.' 
      });
    }

    // 2. Limpiar registro previo y guardar el nuevo embedding
    await pool.query('DELETE FROM client_facials WHERE user_id = $1', [userId]);

    await pool.query(
      `INSERT INTO client_facials (user_id, embedding, updated_at) 
       VALUES ($1, $2, NOW())`,
      [userId, JSON.stringify(embedding)]
    );

    res.status(200).json({ success: true, message: 'Registro facial de cliente completado con éxito.' });
  } catch (error) {
    console.error('Error al registrar rostro:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};