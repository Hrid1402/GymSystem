import { useCallback, useEffect, useState } from 'react';
import { classesApi } from '../../api/classesApi';
import { usersApi } from '../../api/usersApi';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/clases.css';

const SALAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5'];

const STATUS_LABELS = {
  programada: 'Programada',
  en_curso: 'En curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const INITIAL_FORM = {
  nombre_clase: '',
  descripcion: '',
  entrenador_id: '',
  sala: 'Sala 1',
  fecha_clase: '',
  hora_inicio: '08:00',
  hora_fin: '09:00',
  cupo_maximo: 20,
};

function getCurrentRole() {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.role) return parsed.role;
    }
  } catch {
    // ignorar error de parseo
  }
  return localStorage.getItem('role') || 'MANAGER';
}

function formatTimeShort(timeStr) {
  if (!timeStr) return '-';
  return String(timeStr).slice(0, 5);
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  return String(dateStr).slice(0, 10);
}

export default function Clases() {
  const role = getCurrentRole();
  const isManager = role === 'MANAGER';
  const isClient = role === 'CLIENT';

  const [classes, setClasses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [enrollingId, setEnrollingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const classesRes = await classesApi.getClasses();
      const classList = Array.isArray(classesRes)
        ? classesRes
        : classesRes?.classes || [];
      setClasses(classList);

      if (isManager) {
        const usersRes = await usersApi.getUsers();
        const allUsers = Array.isArray(usersRes)
          ? usersRes
          : usersRes?.users || [];
        const trainerList = allUsers.filter((u) => u.role === 'TRAINER');
        setTrainers(trainerList);
        setForm((prev) => ({
          ...prev,
          entrenador_id: prev.entrenador_id || trainerList[0]?.id || '',
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'No se pudieron cargar las clases.');
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenCreate = () => {
    if (!isManager) return;
    setEditingClass(null);
    setErrorMsg('');
    setSuccessMsg('');
    setForm({
      ...INITIAL_FORM,
      entrenador_id: trainers[0]?.id || '',
    });
    setModalOpen(true);
  };

  const handleEditClick = (cls) => {
    if (!isManager) return;
    setEditingClass(cls);
    setSuccessMsg('');
    setErrorMsg('');
    setForm({
      nombre_clase: cls.nombre_clase || '',
      descripcion: cls.descripcion || '',
      entrenador_id: cls.entrenador_id || '',
      sala: SALAS.includes(cls.sala) ? cls.sala : 'Sala 1',
      fecha_clase:
        formatDateShort(cls.fecha_clase) === '-' ? '' : formatDateShort(cls.fecha_clase),
      hora_inicio: formatTimeShort(cls.hora_inicio) || '08:00',
      hora_fin: formatTimeShort(cls.hora_fin) || '09:00',
      cupo_maximo: cls.cupo_maximo ?? 20,
    });
    setModalOpen(true);
  };

  const handleEnrollClick = async (cls) => {
    setEnrollingId(cls.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await classesApi.enrollClass(cls.id);
      setSuccessMsg('Te has inscrito a la clase correctamente.');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo completar la inscripción.');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!isManager || !editingClass) return;

    const inscritos = editingClass.inscritos_actuales ?? 0;
    if (inscritos > 0) {
      setErrorMsg('Solo se pueden eliminar clases que no tienen inscritos.');
      return;
    }

    setDeletingId(editingClass.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await classesApi.deleteClass(editingClass.id);
      setSuccessMsg('Clase eliminada correctamente.');
      setModalOpen(false);
      setEditingClass(null);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo eliminar la clase.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseModal = () => {
    if (submitting || deletingId) return;
    setModalOpen(false);
    setEditingClass(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isManager) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      nombre_clase: form.nombre_clase.trim(),
      descripcion: form.descripcion.trim() ? form.descripcion.trim() : null,
      entrenador_id: form.entrenador_id,
      sala: form.sala,
      fecha_clase: form.fecha_clase,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      cupo_maximo: Number(form.cupo_maximo),
    };

    try {
      if (editingClass) {
        await classesApi.updateClass(editingClass.id, payload);
        setSuccessMsg('Clase actualizada correctamente.');
      } else {
        await classesApi.createClass(payload);
        setSuccessMsg('Clase creada con estado programada.');
      }

      setModalOpen(false);
      setEditingClass(null);
      setForm({
        ...INITIAL_FORM,
        entrenador_id: trainers[0]?.id || '',
      });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo guardar la clase.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTrainerName = (cls) => {
    if (cls.entrenador_nombre || cls.entrenador_apellido) {
      return `${cls.entrenador_nombre || ''} ${cls.entrenador_apellido || ''}`.trim();
    }
    const found = trainers.find((t) => t.id === cls.entrenador_id);
    return found ? `${found.first_name} ${found.last_name}`.trim() : cls.entrenador_id;
  };

  const canDeleteEditingClass =
    isManager && Boolean(editingClass) && (editingClass.inscritos_actuales ?? 0) === 0;

  return (
    <DashboardLayout title={isClient ? 'Clases disponibles' : 'Gestión de Clases'}>
      <div className="classes-page">
        <div className="classes-card">
          <div className="classes-header-row">
            <h2 className="classes-card-title">
              {isClient ? 'Clases disponibles' : 'Clases programadas'}
            </h2>
            {isManager && (
              <button
                type="button"
                className="btn-primary classes-create-btn"
                onClick={handleOpenCreate}
              >
                Crear clase
              </button>
            )}
          </div>

          {!modalOpen && errorMsg && (
            <div role="alert" className="classes-alert classes-alert--error">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div role="status" className="classes-alert classes-alert--success">
              {successMsg}
            </div>
          )}

          {loading ? (
            <Loader text="Cargando clases..." />
          ) : classes.length === 0 ? (
            <p className="classes-empty-text">Aún no hay clases programadas.</p>
          ) : (
            <div className="classes-table-wrap">
              <table className="classes-table">
                <thead>
                  <tr>
                    <th>Nombre de clase</th>
                    <th>Entrenador</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Sala</th>
                    <th>Cupo</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => {
                    const estadoActual = cls.estado || 'programada';
                    const inscritos = cls.inscritos_actuales ?? 0;
                    const isFull = inscritos >= cls.cupo_maximo;
                    const isClosed =
                      estadoActual === 'completada' || estadoActual === 'cancelada';

                    return (
                      <tr key={cls.id}>
                        <td className="classes-name-cell">{cls.nombre_clase}</td>
                        <td>{getTrainerName(cls)}</td>
                        <td>{formatDateShort(cls.fecha_clase)}</td>
                        <td>
                          {formatTimeShort(cls.hora_inicio)} - {formatTimeShort(cls.hora_fin)}
                        </td>
                        <td>{cls.sala}</td>
                        <td>
                          {inscritos} / {cls.cupo_maximo}
                        </td>
                        <td>
                          <span className={`classes-status-badge classes-status--${estadoActual}`}>
                            {STATUS_LABELS[estadoActual] || estadoActual}
                          </span>
                        </td>
                        <td>
                          {isManager && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleEditClick(cls)}
                            >
                              Editar
                            </button>
                          )}
                          {isClient && (
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={
                                Boolean(cls.ya_inscrito) ||
                                isFull ||
                                isClosed ||
                                enrollingId === cls.id
                              }
                              onClick={() => handleEnrollClick(cls)}
                            >
                              {enrollingId === cls.id
                                ? 'Inscribiendo...'
                                : cls.ya_inscrito
                                  ? 'Inscrito'
                                  : isFull
                                    ? 'Llena'
                                    : isClosed
                                      ? 'No disponible'
                                      : 'Inscribirse'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isManager && modalOpen && (
        <div
          className="classes-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="classes-modal-title"
          onClick={handleCloseModal}
        >
          <div className="classes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="classes-modal-header">
              <h2 id="classes-modal-title" className="classes-card-title">
                {editingClass ? 'Editar clase' : 'Crear clase'}
              </h2>
              <button
                type="button"
                className="classes-close-btn"
                onClick={handleCloseModal}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            {errorMsg && (
              <div role="alert" className="classes-alert classes-alert--error">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="classes-form-grid">
              <div className="classes-field">
                <label htmlFor="nombre_clase" className="classes-label">
                  Nombre de la clase *
                </label>
                <input
                  id="nombre_clase"
                  type="text"
                  name="nombre_clase"
                  required
                  placeholder="Ej. Aeróbicos, Pilates"
                  value={form.nombre_clase}
                  onChange={handleChange}
                  className="classes-input"
                />
              </div>

              <div className="classes-field">
                <label htmlFor="entrenador_id" className="classes-label">
                  Entrenador *
                </label>
                <select
                  id="entrenador_id"
                  name="entrenador_id"
                  required
                  value={form.entrenador_id}
                  onChange={handleChange}
                  className="classes-select"
                >
                  <option value="">Selecciona un entrenador</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.first_name} {trainer.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="classes-field">
                <label htmlFor="sala" className="classes-label">
                  Sala *
                </label>
                <select
                  id="sala"
                  name="sala"
                  required
                  value={form.sala}
                  onChange={handleChange}
                  className="classes-select"
                >
                  {SALAS.map((sala) => (
                    <option key={sala} value={sala}>
                      {sala}
                    </option>
                  ))}
                </select>
              </div>

              <div className="classes-field">
                <label htmlFor="fecha_clase" className="classes-label">
                  Fecha *
                </label>
                <input
                  id="fecha_clase"
                  type="date"
                  name="fecha_clase"
                  required
                  value={form.fecha_clase}
                  onChange={handleChange}
                  className="classes-input"
                />
              </div>

              <div className="classes-field">
                <label htmlFor="hora_inicio" className="classes-label">
                  Hora de inicio *
                </label>
                <input
                  id="hora_inicio"
                  type="time"
                  name="hora_inicio"
                  required
                  value={form.hora_inicio}
                  onChange={handleChange}
                  className="classes-input"
                />
              </div>

              <div className="classes-field">
                <label htmlFor="hora_fin" className="classes-label">
                  Hora de fin *
                </label>
                <input
                  id="hora_fin"
                  type="time"
                  name="hora_fin"
                  required
                  value={form.hora_fin}
                  onChange={handleChange}
                  className="classes-input"
                />
              </div>

              <div className="classes-field">
                <label htmlFor="cupo_maximo" className="classes-label">
                  Cupo máximo *
                </label>
                <input
                  id="cupo_maximo"
                  type="number"
                  name="cupo_maximo"
                  min={1}
                  required
                  value={form.cupo_maximo}
                  onChange={handleChange}
                  className="classes-input"
                />
              </div>

              <div className="classes-form-actions">
                {canDeleteEditingClass && (
                  <button
                    type="button"
                    className="classes-delete-btn"
                    disabled={submitting || deletingId === editingClass.id}
                    onClick={handleDeleteFromEdit}
                  >
                    {deletingId === editingClass.id ? 'Eliminando...' : 'Eliminar clase'}
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || Boolean(deletingId)}
                >
                  {submitting
                    ? 'Guardando...'
                    : editingClass
                      ? 'Guardar cambios'
                      : 'Guardar clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}