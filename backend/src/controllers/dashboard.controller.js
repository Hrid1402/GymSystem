import { getDashboardDataModel } from '../db/dashboard.js';

export const getDashboardData = async (req, res) => {
    try {
        const data = await getDashboardDataModel();

        return res.json({
        success: true,
        ...data
        });
    } catch (error) {
        console.error('Error al obtener datos del dashboard:', error);
        return res.status(500).json({ error: 'Error interno al procesar el dashboard' });
    }
};