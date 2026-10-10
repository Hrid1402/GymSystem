import UserForm from './UserForm';
import '../styles/userModal.css';

/**
 * User Creation Form Modal Component
 * Wraps the UserForm component inside a modal overlay.
 */
export default function UserModal({ isOpen, onClose, onUserCreated }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Usuario</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <UserForm
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
