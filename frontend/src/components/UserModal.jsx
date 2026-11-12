import '../styles/userModal.css';
import UserForm from './UserForm';

/**
 * User Creation Form Modal Component
 * Wraps the UserForm component inside a modal overlay.
 */
export default function UserModal({ 
  isOpen, 
  onClose, 
  onUserCreated, 
  title = 'Nuevo Usuario',
  defaultRole = 'RECEPTIONIST',
  allowedRoles = ['RECEPTIONIST', 'MANAGER'],
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <UserForm
            defaultRole={defaultRole}
            allowedRoles={allowedRoles}
            onSuccess={(newUser) => {
              if (onUserCreated) onUserCreated(newUser);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
