import { useEffect, useState } from 'react';
import { membershipsApi } from '../../api/membershipsApi';
import { usersApi } from '../../api/usersApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserDetailsModal from '../../components/UserDetailsModal';
import UserEditModal from '../../components/UserEditModal';
import UserModal from '../../components/UserModal';
import { useAuth } from '../../context/AuthContext';
import '../../styles/clientes.css';

export default function Clientes() {
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('ALL'); // ALL | WITH_MEMBERSHIP | WITHOUT_MEMBERSHIP
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar clientes y membresías al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, membershipsRes] = await Promise.all([
        usersApi.getUsers(),
        membershipsApi.getAllMemberships().catch((err) => {
          console.warn('No se pudieron obtener todas las membresías:', err);
          return { memberships: [] };
        }),
      ]);

      const onlyClients = (usersRes?.users || []).filter(
        (user) => user.role === 'CLIENT'
      );
      setClients(onlyClients);
      setMemberships(membershipsRes?.memberships || []);
    } catch (error) {
      console.error('Error al cargar la información de clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = (newClient) => {
    setClients((prev) => [newClient, ...prev]);
  };

  const handleClientUpdated = (updatedClient) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? { ...c, ...updatedClient } : c))
    );
    if (selectedClient?.id === updatedClient.id) {
      setSelectedClient((prev) => ({ ...prev, ...updatedClient }));
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}` || 'C';
  };

  const formatDocType = (type) => {
    if (!type) return 'Doc.';
    switch (type.toLowerCase()) {
      case 'dni':
        return 'DNI';
      case 'carnet_extranjeria':
        return 'C.E.';
      case 'pasaporte':
        return 'Pasaporte';
      default:
        return type.toUpperCase();
    }
  };

  // Obtener la membresía activa más reciente de un cliente
  const getActiveMembership = (userId) => {
    return memberships.find(
      (m) => m.user_id === userId && m.status === 'ACTIVE'
    );
  };

  // Filtrado de clientes por búsqueda y membresía
  const filteredClients = clients.filter((client) => {
    const activeMem = getActiveMembership(client.id);

    if (membershipFilter === 'WITH_MEMBERSHIP' && !activeMem) return false;
    if (membershipFilter === 'WITHOUT_MEMBERSHIP' && activeMem) return false;

    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
    const docNum = (client.numero_documento || '').toLowerCase();
    const docType = (client.tipo_documento || '').toLowerCase();
    const phone = (client.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return (
      fullName.includes(query) ||
      docNum.includes(query) ||
      docType.includes(query) ||
      phone.includes(query)
    );
  });

  const canManageClients = ['MANAGER', 'RECEPTIONIST'].includes(currentUser?.role);

  return (
    <DashboardLayout title="Gestión de Clientes">
      <div className="clientes-container">
        
        {/* Barra de Búsqueda y Filtros */}
        <section className="clientes-action-bar">
          {/* Input de Búsqueda */}
          <div className="clientes-search-box">
            <svg 
              className="clientes-search-icon"
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente, documento o celular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="clientes-search-input"
            />
          </div>

          {/* Filtro por Estado de Membresía */}
          <div className="clientes-filters-right">
            <select
              value={membershipFilter}
              onChange={(e) => setMembershipFilter(e.target.value)}
              className="clientes-filter-select"
            >
              <option value="ALL">Todas las membresías</option>
              <option value="WITH_MEMBERSHIP">Con membresía activa</option>
              <option value="WITHOUT_MEMBERSHIP">Sin membresía</option>
            </select>

            {/* Botón Nuevo Cliente */}
            {canManageClients && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="clientes-btn-new"
              >
                <span>+</span> Nuevo cliente
              </button>
            )}
          </div>
        </section>

        {/* Contenedor de la Tabla */}
        <div className="table-card clientes-table-card">
          {loading ? (
            <p className="clientes-loading-text">Cargando clientes...</p>
          ) : (
            <table className="clientes-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>N° Documento</th>
                  <th>Teléfono</th>
                  <th>Membresía</th>
                  {canManageClients && <th className="text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const activeMem = getActiveMembership(client.id);
                  return (
                    <tr 
                      key={client.id} 
                      onClick={() => setSelectedClient(client)}
                      className="clientes-table-row"
                      title="Haz clic para ver la información detallada del cliente"
                    >
                      <td>
                        <div className="client-info-cell">
                          <div className="client-avatar">
                            {getInitials(client.first_name, client.last_name)}
                          </div>
                          <div>
                            <span className="client-name">
                              {client.first_name} {client.last_name}
                            </span>
                            <span className="client-email">
                              {client.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="client-doc-cell">
                        {client.numero_documento ? (
                          <>
                            <span className="doc-type-label">
                              {formatDocType(client.tipo_documento)}:
                            </span>
                            {client.numero_documento}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="client-phone-cell">
                        {client.phone || 'No registrado'}
                      </td>
                      <td>
                        {activeMem ? (
                          <span className="membership-badge active">
                            <span className="badge-dot"></span>
                            {activeMem.plan_name ? `Activa (${activeMem.plan_name})` : 'Activa'}
                          </span>
                        ) : (
                          <span className="membership-badge inactive">
                            Sin membresía
                          </span>
                        )}
                      </td>
                      {canManageClients && (
                        <td className="text-center" style={{ padding: '1.125rem 1.5rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClient(client);
                            }}
                            className="clientes-btn-edit"
                          >
                            Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={canManageClients ? 5 : 4} className="clientes-empty-state">
                      No se encontraron clientes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Detalle de Cliente */}
      <UserDetailsModal
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        user={selectedClient}
        membership={selectedClient ? getActiveMembership(selectedClient.id) : null}
        onEdit={canManageClients ? (c) => setEditingClient(c) : undefined}
      />

      {/* Modal para Crear Nuevo Cliente */}
      <UserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleClientCreated}
        title="Nuevo Cliente"
        defaultRole="CLIENT"
        allowedRoles={['CLIENT']}
      />

      {/* Modal para Editar Cliente */}
      <UserEditModal
        isOpen={Boolean(editingClient)}
        onClose={() => setEditingClient(null)}
        user={editingClient}
        onUserUpdated={handleClientUpdated}
      />
    </DashboardLayout>
  );
}