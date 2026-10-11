import { useEffect, useState } from 'react';
import { usersApi } from '../../api/usersApi';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function Clientes() {
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cargar la lista de usuarios al montar el componente
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await usersApi.getUsers();
      // Filtrar estrictamente para que solo queden los usuarios con rol 'CLIENT'
      const onlyClients = (data.users || []).filter(
        (user) => user.role === 'CLIENT'
      );
      setClients(onlyClients);
    } catch (error) {
      console.error('Error al cargar la lista de clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar los clientes en tiempo real por nombre, apellido o DNI (para la búsqueda interna)
  const filteredClients = clients.filter((client) => {
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
    const dni = (client.dni || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || dni.includes(query);
  });

  return (
    <DashboardLayout title="Gestión de Clientes">
      <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Barra de búsqueda por Nombre o DNI */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o DNI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '15px',
              outline: 'none',
              background: '#ffffff',
            }}
          />
        </div>

        {/* Contenedor de la Tabla */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <p style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Cargando clientes...</p>
          ) : filteredClients.length === 0 ? (
            <p style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No se encontraron clientes registrados.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '14px' }}>
                  <th style={{ padding: '14px 16px' }}>Nombres</th>
                  <th style={{ padding: '14px 16px' }}>Apellidos</th>
                  <th style={{ padding: '14px 16px' }}>Correo Electrónico</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>{client.first_name}</td>
                    <td style={{ padding: '14px 16px' }}>{client.last_name}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{client.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}