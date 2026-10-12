import { useEffect, useState } from 'react';
import { usersApi } from '../../api/usersApi';
import { membershipsApi } from '../../api/membershipsApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserDetailsModal from '../../components/UserDetailsModal';

export default function Clientes() {
  const [clients, setClients] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('ALL'); // ALL | WITH_MEMBERSHIP | WITHOUT_MEMBERSHIP
  const [selectedClient, setSelectedClient] = useState(null);
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

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}` || 'C';
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
    const dni = (client.dni || '').toLowerCase();
    const phone = (client.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || dni.includes(query) || phone.includes(query);
  });

  return (
    <DashboardLayout title="Gestión de Clientes">
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Barra de Búsqueda y Filtros */}
        <section 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Input de Búsqueda */}
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: '#94a3b8'
              }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente, DNI o celular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Filtro por Estado de Membresía */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={membershipFilter}
              onChange={(e) => setMembershipFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: '0.9375rem',
                color: '#334155',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">Todas las membresías</option>
              <option value="WITH_MEMBERSHIP">Con membresía activa</option>
              <option value="WITHOUT_MEMBERSHIP">Sin membresía</option>
            </select>
          </div>
        </section>

        {/* Contenedor de la Tabla */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0', 
            overflow: 'hidden', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)' 
          }}
        >
          {loading ? (
            <p style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando clientes...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Cliente</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>DNI / Documento</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Teléfono</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Membresía</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const activeMem = getActiveMembership(client.id);
                  return (
                    <tr 
                      key={client.id} 
                      onClick={() => setSelectedClient(client)}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        fontSize: '0.9375rem', 
                        color: '#1e293b', 
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Haz clic para ver la información detallada del cliente"
                    >
                      <td style={{ padding: '1.125rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <div 
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '9999px',
                              backgroundColor: '#e0e7ff',
                              color: '#4338ca',
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {getInitials(client.first_name, client.last_name)}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>
                              {client.first_name} {client.last_name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.125rem 1.5rem', color: '#64748b' }}>
                        {client.dni || '—'}
                      </td>
                      <td style={{ padding: '1.125rem 1.5rem', color: '#64748b' }}>
                        {client.phone || '—'}
                      </td>
                      <td style={{ padding: '1.125rem 1.5rem' }}>
                        {activeMem ? (
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: '#dcfce7',
                              color: '#15803d'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                            {activeMem.plan_name ? `Activa (${activeMem.plan_name})` : 'Activa'}
                          </span>
                        ) : (
                          <span 
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              backgroundColor: '#f1f5f9',
                              color: '#64748b'
                            }}
                          >
                            Sin membresía
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron clientes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Detalle de Cliente (Read-Only) */}
      <UserDetailsModal
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        user={selectedClient}
        membership={selectedClient ? getActiveMembership(selectedClient.id) : null}
      />
    </DashboardLayout>
  );
}