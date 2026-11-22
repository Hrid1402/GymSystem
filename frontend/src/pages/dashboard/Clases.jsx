import { useCallback, useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  List,
  MapPin,
  User,
  Users,
  X,
} from 'lucide-react';
import { classesApi } from '../../api/classesApi';
import { membershipsApi } from '../../api/membershipsApi';
import { usersApi } from '../../api/usersApi';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
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

function formatDateShort(dateInput) {
  if (!dateInput) return '-';
  if (dateInput instanceof Date) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(dateInput).slice(0, 10);
}

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export default function Clases() {
  const { user } = useAuth();
  const role = user?.role || getCurrentRole();
  const isManager = role === 'MANAGER';
  const isClient = role === 'CLIENT';
  const isTrainer = role === 'TRAINER';

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
  const [hasActiveMembership, setHasActiveMembership] = useState(null);

  // Estados de vista y filtros para entrenador
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [trainerFilter, setTrainerFilter] = useState('my_classes'); // 'my_classes' | 'all'
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal para ver alumnos inscritos
  const [enrollmentsModalOpen, setEnrollmentsModalOpen] = useState(false);
  const [selectedClassForEnrollments, setSelectedClassForEnrollments] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const classesRes = await classesApi.getClasses();
      const classList = Array.isArray(classesRes)
        ? classesRes
        : classesRes?.classes || [];
      setClasses(classList);

      if (isClient) {
        try {
          const memRes = await membershipsApi.getMyMemberships();
          const memList = Array.isArray(memRes) ? memRes : memRes?.memberships || [];
          const hasActive = memList.some((m) => m.status === 'ACTIVE');
          setHasActiveMembership(hasActive);
        } catch {
          setHasActiveMembership(false);
        }
      }

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
  }, [isClient, isManager]);

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
      fecha_clase: getTodayDateString(),
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

    const today = getTodayDateString();
    if (form.fecha_clase < today) {
      setErrorMsg('No puedes programar una clase en una fecha anterior a hoy.');
      setSubmitting(false);
      return;
    }

    const nowTime = getCurrentTimeString();
    if (form.fecha_clase === today && form.hora_inicio <= nowTime) {
      setErrorMsg('La hora de inicio no puede ser anterior ni igual a la hora actual.');
      setSubmitting(false);
      return;
    }

    if (form.hora_fin <= form.hora_inicio) {
      setErrorMsg('La hora de fin debe ser posterior a la hora de inicio.');
      setSubmitting(false);
      return;
    }

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

  const handleOpenEnrollments = async (cls) => {
    setSelectedClassForEnrollments(cls);
    setEnrolledStudents([]);
    setEnrollmentsError('');
    setLoadingEnrollments(true);
    setEnrollmentsModalOpen(true);
    try {
      const res = await classesApi.getEnrollments(cls.id);
      setEnrolledStudents(res?.enrollments || []);
    } catch (err) {
      setEnrollmentsError(err.message || 'Error al obtener alumnos inscritos.');
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleCloseEnrollments = () => {
    setEnrollmentsModalOpen(false);
    setSelectedClassForEnrollments(null);
    setEnrolledStudents([]);
    setEnrollmentsError('');
  };

  const displayedClasses =
    isTrainer && trainerFilter === 'my_classes'
      ? classes.filter((c) => c.entrenador_id === user?.id)
      : classes;

  const getTileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatDateShort(date);
      const count = displayedClasses.filter(
        (c) => formatDateShort(c.fecha_clase) === dateStr
      ).length;
      if (count > 0) {
        return <span className="calendar-tile-badge">{count}</span>;
      }
    }
    return null;
  };

  const selectedDateStr = formatDateShort(selectedDate);
  const classesOnSelectedDate = displayedClasses.filter(
    (c) => formatDateShort(c.fecha_clase) === selectedDateStr
  );

  const pageTitle = isTrainer
    ? 'Mis Clases Asignadas'
    : isClient
      ? 'Clases disponibles'
      : 'Gestión de Clases';

  const cardTitle = isTrainer
    ? trainerFilter === 'my_classes'
      ? 'Mis clases asignadas'
      : 'Todas las clases programadas'
    : isClient
      ? 'Clases disponibles'
      : 'Clases programadas';

  return (
    <DashboardLayout title={pageTitle}>
      <div className="classes-page">
        <div className="classes-card">
          <div className="classes-header-row">
            <h2 className="classes-card-title">{cardTitle}</h2>
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

          <div className="classes-controls-bar">
            {isTrainer && (
              <div className="classes-filter-group">
                <button
                  type="button"
                  className={`classes-filter-btn ${trainerFilter === 'my_classes' ? 'active' : ''}`}
                  onClick={() => setTrainerFilter('my_classes')}
                >
                  Mis Clases Asignadas
                </button>
                <button
                  type="button"
                  className={`classes-filter-btn ${trainerFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTrainerFilter('all')}
                >
                  Todas las Clases
                </button>
              </div>
            )}

            <div className="classes-view-toggle" style={!isTrainer ? { marginLeft: 'auto' } : {}}>
              <button
                type="button"
                className={`classes-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Vista en lista"
              >
                <List size={16} />
                <span>Lista</span>
              </button>
              <button
                type="button"
                className={`classes-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="Vista en calendario"
              >
                <CalendarIcon size={16} />
                <span>Calendario</span>
              </button>
            </div>
          </div>

          {!modalOpen && errorMsg && (
            <div role="alert" className="classes-alert classes-alert--error">
              {errorMsg}
            </div>
          )}

          {isClient && hasActiveMembership === false && (
            <div role="alert" className="classes-alert classes-alert--error" style={{ marginBottom: '1rem' }}>
              Se requiere una membresía activa para inscribirte a clases grupales.
            </div>
          )}

          {successMsg && (
            <div role="status" className="classes-alert classes-alert--success">
              {successMsg}
            </div>
          )}

          {loading ? (
            <Loader text="Cargando clases..." />
          ) : displayedClasses.length === 0 ? (
            <p className="classes-empty-text">
              {isTrainer && trainerFilter === 'my_classes'
                ? 'No tienes clases asignadas actualmente.'
                : 'Aún no hay clases programadas.'}
            </p>
          ) : viewMode === 'calendar' ? (
            <div className="classes-calendar-layout">
              <div className="classes-calendar-wrapper">
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  tileContent={getTileContent}
                  locale="es-PE"
                />
              </div>

              <div className="classes-day-agenda">
                <div className="classes-agenda-header">
                  <h3 className="classes-agenda-title">
                    <CalendarDays size={18} color="#2563eb" />
                    <span>
                      {selectedDate.toLocaleDateString('es-PE', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </h3>
                  <p className="classes-agenda-subtitle">
                    {classesOnSelectedDate.length}{' '}
                    {classesOnSelectedDate.length === 1 ? 'clase programada' : 'clases programadas'}
                  </p>
                </div>

                {classesOnSelectedDate.length === 0 ? (
                  <div className="agenda-empty-state">
                    <CalendarIcon size={36} strokeWidth={1.5} color="#94a3b8" />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      No hay clases programadas para esta fecha seleccionada.
                    </p>
                  </div>
                ) : (
                  <div className="classes-agenda-list">
                    {classesOnSelectedDate.map((cls) => {
                      const estadoActual = cls.estado || 'programada';
                      const inscritos = cls.inscritos_actuales ?? 0;
                      return (
                        <div key={cls.id} className="classes-agenda-card">
                          <div className="agenda-card-top">
                            <div className="agenda-card-time">
                              <Clock size={14} color="#64748b" />
                              <span>
                                {formatTimeShort(cls.hora_inicio)} - {formatTimeShort(cls.hora_fin)}
                              </span>
                            </div>
                            <span className={`classes-status-badge classes-status--${estadoActual}`}>
                              {STATUS_LABELS[estadoActual] || estadoActual}
                            </span>
                          </div>

                          <h4 className="agenda-card-name">{cls.nombre_clase}</h4>

                          <div className="agenda-card-info-row">
                            <MapPin size={14} color="#64748b" />
                            <span>{cls.sala}</span>
                          </div>

                          {!isTrainer && (
                            <div className="agenda-card-info-row">
                              <User size={14} color="#64748b" />
                              <span>{getTrainerName(cls)}</span>
                            </div>
                          )}

                          <div className="agenda-card-footer">
                            <div className="agenda-card-info-row">
                              <Users size={14} color="#64748b" />
                              <span>
                                {inscritos} / {cls.cupo_maximo}
                              </span>
                            </div>

                            {(isTrainer || isManager) && (
                              <button
                                type="button"
                                className="calendar-card-action"
                                onClick={() => handleOpenEnrollments(cls)}
                              >
                                Ver alumnos ({inscritos})
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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
                  {displayedClasses.map((cls) => {
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
                          {isTrainer || isManager ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEnrollments(cls)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                padding: 0,
                                fontWeight: 600,
                                textDecoration: 'underline',
                              }}
                              title="Ver lista de inscritos"
                            >
                              {inscritos} / {cls.cupo_maximo}
                            </button>
                          ) : (
                            `${inscritos} / ${cls.cupo_maximo}`
                          )}
                        </td>
                        <td>
                          <span className={`classes-status-badge classes-status--${estadoActual}`}>
                            {STATUS_LABELS[estadoActual] || estadoActual}
                          </span>
                        </td>
                        <td>
                          {isManager && (
                            <div className="classes-actions-cell">
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleEditClick(cls)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleOpenEnrollments(cls)}
                              >
                                Alumnos
                              </button>
                            </div>
                          )}
                          {isTrainer && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleOpenEnrollments(cls)}
                            >
                              Ver alumnos
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
                                enrollingId === cls.id ||
                                hasActiveMembership === false
                              }
                              onClick={() => handleEnrollClick(cls)}
                              title={hasActiveMembership === false ? 'Requiere una membresía activa' : ''}
                            >
                              {enrollingId === cls.id
                                ? 'Inscribiendo...'
                                : cls.ya_inscrito
                                  ? 'Inscrito'
                                  : isFull
                                    ? 'Llena'
                                    : isClosed
                                      ? 'No disponible'
                                      : hasActiveMembership === false
                                        ? 'Membresía requerida'
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
                <X size={18} />
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
                  min={getTodayDateString()}
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
                  min={form.fecha_clase === getTodayDateString() ? getCurrentTimeString() : undefined}
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
                  min={form.hora_inicio || undefined}
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

      {/* Modal para ver alumnos inscritos en una clase */}
      {enrollmentsModalOpen && selectedClassForEnrollments && (
        <div
          className="classes-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enrollments-modal-title"
          onClick={handleCloseEnrollments}
        >
          <div className="classes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="classes-modal-header">
              <div>
                <h2 id="enrollments-modal-title" className="classes-card-title">
                  Alumnos inscritos ({enrolledStudents.length} / {selectedClassForEnrollments.cupo_maximo})
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  {selectedClassForEnrollments.nombre_clase} • {formatDateShort(selectedClassForEnrollments.fecha_clase)} • {formatTimeShort(selectedClassForEnrollments.hora_inicio)} - {formatTimeShort(selectedClassForEnrollments.hora_fin)} • {selectedClassForEnrollments.sala}
                </p>
              </div>
              <button
                type="button"
                className="classes-close-btn"
                onClick={handleCloseEnrollments}
                aria-label="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {loadingEnrollments ? (
              <div style={{ padding: '24px 0' }}>
                <Loader text="Cargando lista de alumnos..." />
              </div>
            ) : enrollmentsError ? (
              <div role="alert" className="classes-alert classes-alert--error">
                {enrollmentsError}
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '0.9375rem' }}>Aún no hay alumnos inscritos en esta clase.</p>
              </div>
            ) : (
              <div className="classes-table-wrap">
                <table className="classes-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Alumno</th>
                      <th>Documento</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                      <th>Inscrito el</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((student, idx) => (
                      <tr key={student.enrollment_id || student.client_id || idx}>
                        <td>{idx + 1}</td>
                        <td className="classes-name-cell">
                          {student.first_name} {student.last_name}
                        </td>
                        <td>
                          {student.tipo_documento?.toUpperCase()}: {student.numero_documento || '-'}
                        </td>
                        <td>{student.email}</td>
                        <td>{student.phone || 'No registrado'}</td>
                        <td>
                          {student.inscrito_en
                            ? new Date(student.inscrito_en).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={handleCloseEnrollments}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}