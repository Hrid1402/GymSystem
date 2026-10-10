import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/usersApi';
import DashboardLayout from '../components/layout/DashboardLayout';
import UserModal from '../components/UserModal';
import Loader from '../components/common/Loader';
import '../styles/users.css';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await usersApi.getUsers();
      if (response?.users) {
        setUsers(response.users);
      } else {
        setUsers([]);
      }
    } catch (err) {
      const msg = err.message || 'Error al obtener los usuarios';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = (newUser) => {
    setUsers((prev) => [newUser, ...prev]);
  };

  const getRoleLabel = (role) => {
    if (role === 'MANAGER') return 'Gerente';
    if (role === 'RECEPTIONIST') return 'Recepcionista';
    return role;
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}` || 'U';
  };

  // Filtrar en la UI exclusivamente usuarios que no sean de tipo CLIENTE (personal administrativo)
  const staffUsers = users.filter((user) => user.role !== 'CLIENT');

  const filteredUsers = staffUsers.filter((user) => {
    const query = searchTerm.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const dni = (user.dni || '').toLowerCase();
    return fullName.includes(query) || email.includes(query) || dni.includes(query);
  });

  return (
    <DashboardLayout title="Gestionar usuarios">
      {/* Search & Actions Bar */}
      <section className="action-bar">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, correo o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {currentUser?.role === 'MANAGER' && (
          <button className="btn-add-user" onClick={() => setIsModalOpen(true)}>
            <span>+</span> Nuevo usuario
          </button>
        )}
      </section>

      {/* Error Feedback */}
      {error && (
        <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Users Table Card */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Loader text="Cargando usuarios..." />
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar-badge">
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                      <span className="user-fullname">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted">{user.email}</td>
                  <td className="text-muted">{getRoleLabel(user.role)}</td>
                  <td>
                    <span className={`status-badge ${user.is_active !== false ? 'active' : 'inactive'}`}>
                      {user.is_active !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="action-menu-btn" title="Acciones">
                      &#8942;
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Registration / Creation User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </DashboardLayout>
  );
}
