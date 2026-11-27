import { getDashboardDataModel, updateMaxCapacity } from '../db/dashboard.js';

export const getDashboardData = async (req, res) => {
  try {
    const data = await getDashboardDataModel();
    return res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    return res.status(500).json({ error: 'Error interno al procesar el dashboard' });
  }
};

export const setCapacity = async (req, res) => {
  try {
    const { maxCapacity } = req.body;
    const parsed = Number(maxCapacity);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El aforo debe ser un número entero mayor a 0',
      });
    }

    const updated = await updateMaxCapacity(parsed);
    const data = await getDashboardDataModel();

    return res.status(200).json({
      success: true,
      maxCapacity: updated,
      capacity: data.capacity,
    });
  } catch (error) {
    console.error('Error al actualizar aforo:', error);
    return res.status(500).json({
      success: false,
      error: 'No se pudo actualizar el aforo',
    });
  }
};