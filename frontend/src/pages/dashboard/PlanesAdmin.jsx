import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { plansApi } from '../../api/plansApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PlanModal from '../../components/plans/PlanModal';
import Loader from '../../components/common/Loader';
import '../../styles/users.css';

export default function PlanesAdmin() {
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await plansApi.getAllPlansAdmin();
      setPlans(response?.plans || []);
    } catch (err) {
      const msg = err.message || 'Error al obtener los planes';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handlePlanSaved = (savedPlan) => {
    setPlans((prev) => {
      const exists = prev.some((p) => p.id === savedPlan.id);
      if (exists) {
        return prev.map((p) => (p.id === savedPlan.id ? savedPlan : p));
      }
      return [savedPlan, ...prev];
    });
  };

  const handlePlanDeleted = (deletedId) => {
    setPlans((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const filteredPlans = plans.filter((plan) => {
    const query = searchTerm.toLowerCase();
    const name = (plan.name || '').toLowerCase();
    const description = (plan.description || '').toLowerCase();
    return name.includes(query) || description.includes(query);
  });

  return (
    <DashboardLayout title="Planes">
      {/* Barra de búsqueda y botón de nuevo plan */}
      <section className="action-bar">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="btn-add-user" onClick={handleOpenCreateModal}>
          <span>+</span> Nuevo plan
        </button>
      </section>

      {/* Banner de error de API */}
      {error && (
        <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Tabla de planes */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Loader text="Cargando planes..." />
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre del Plan</th>
                <th>Precio</th>
                <th>Duración</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.9375rem' }}>
                        {plan.name}
                      </strong>
                      {plan.description && (
                        <span style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '2px', display: 'block' }}>
                          {plan.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>
                      S/ {Number(plan.price).toFixed(2)}
                    </strong>
                  </td>
                  <td className="text-muted">
                    {plan.duration_days} {plan.duration_days === 1 ? 'día' : 'días'}
                  </td>
                  <td>
                    <span className={`status-badge ${plan.is_active ? 'active' : 'inactive'}`}>
                      {plan.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                      onClick={() => handleOpenEditModal(plan)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPlans.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No se encontraron planes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Creación / Edición */}
      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={selectedPlan}
        onPlanSaved={handlePlanSaved}
        onPlanDeleted={handlePlanDeleted}
      />
    </DashboardLayout>
  );
}
