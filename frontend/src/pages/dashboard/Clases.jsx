import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Clock,
  List,
  MapPin,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { classesApi } from '../../api/classesApi';
import { membershipsApi } from '../../api/membershipsApi';
import { settingsApi } from '../../api/settingsApi';
import { usersApi } from '../../api/usersApi';
import Loader from '../../components/common/Loader';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import '../../styles/clases.css';

const DEFAULT_GYM_SETTINGS = {
  totalRooms: 5,
  openingTime: '06:00',
  closingTime: '22:00',
};

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
];

const STATUS_LABELS = {
  activa: 'Activa',
  inactiva: 'Pausada',
};

const INITIAL_FORM = {
  catalog_id: '',
  descripcion: '',
  entrenador_id: '',
  sala: 'Sala 1',
  dia_semana: 1,
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

function formatDayLabel(diaSemana) {
  const found = DIAS_SEMANA.find((d) => d.value === Number(diaSemana));
  return found ? found.label : '-';
}

function formatProximaFecha(dateStr) {
  if (!dateStr) return '-';
  const clean = String(dateStr).slice(0, 10);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (clean === todayStr) return 'Hoy';
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return clean;
}

export default function Clases() {
  const { user } = useAuth();
  const role = user?.role || getCurrentRole();
  const isManager = role === 'MANAGER';
  const isClient = role === 'CLIENT';
  const isTrainer = role === 'TRAINER';

  const [classes, setClasses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [gymSettings, setGymSettings] = useState(DEFAULT_GYM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [enrollingId, setEnrollingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [hasActiveMembership, setHasActiveMembership] = useState(null);
  const [clientClassLevel, setClientClassLevel] = useState('ninguna');
  const [catalog, setCatalog] = useState([]);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [newDiscipline, setNewDiscipline] = useState({ nombre: '', categoria: 'basica' });
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  // Vista principal: Cronograma Semanal ('schedule') o Lista ('list')
  const [viewMode, setViewMode] = useState('schedule');
  const [trainerFilter, setTrainerFilter] = useState('my_classes'); // 'my_classes' | 'all'
  const [clientFilter, setClientFilter] = useState('all'); // 'all' | 'my_reservations'
  const [unenrollingId, setUnenrollingId] = useState(null);

  // Modal para ver participantes inscritos
  const [enrollmentsModalOpen, setEnrollmentsModalOpen] = useState(false);
  const [selectedClassForEnrollments, setSelectedClassForEnrollments] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [classesRes, catalogRes, settingsRes] = await Promise.all([
        classesApi.getClasses(),
        classesApi.getCatalog(isManager),
        settingsApi.getSettings().catch(() => null),
      ]);
      const classList = Array.isArray(classesRes)
        ? classesRes
        : classesRes?.classes || [];
      setClasses(classList);

      const catalogList = Array.isArray(catalogRes)
        ? catalogRes
        : catalogRes?.catalog || [];
      setCatalog(catalogList);

      if (settingsRes?.settings) {
        setGymSettings({
          totalRooms: Number(settingsRes.settings.totalRooms || 5),
          openingTime: settingsRes.settings.openingTime || '06:00',
          closingTime: settingsRes.settings.closingTime || '22:00',
        });
      }

      if (isClient) {
        try {
          const memRes = await membershipsApi.getMyMemberships();
          const memList = Array.isArray(memRes) ? memRes : memRes?.memberships || [];
          const activeMem = memList.find((m) => m.status === 'ACTIVE');
          setHasActiveMembership(Boolean(activeMem));
          setClientClassLevel(activeMem?.nivel_clases || 'ninguna');
        } catch {
          setHasActiveMembership(false);
          setClientClassLevel('ninguna');
        }
      }

      if (isManager) {
        const usersRes = await usersApi.getUsers();
        const allUsers = Array.isArray(usersRes)
          ? usersRes
          : usersRes?.users || [];
        const trainerList = allUsers.filter((u) => u.role === 'TRAINER');
        setTrainers(trainerList);
        const firstActiveCatalogId = catalogList.find((c) => c.is_active !== false)?.id || '';
        setForm((prev) => ({
          ...prev,
          catalog_id: prev.catalog_id || firstActiveCatalogId,
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
    const handleSettingsUpdated = () => loadData();
    window.addEventListener('gym-settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('gym-settings-updated', handleSettingsUpdated);
  }, [loadData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'cupo_maximo' || name === 'dia_semana' ? Number(value) : value,
    }));
  };

  const handleOpenCreate = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setModalError('');
    setEditingClass(null);
    const firstActiveCatalogId = catalog.find((c) => c.is_active !== false)?.id || '';
    setForm({
      ...INITIAL_FORM,
      catalog_id: firstActiveCatalogId,
      entrenador_id: trainers[0]?.id || '',
      dia_semana: 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setErrorMsg('');
    setSuccessMsg('');
    setModalError('');
    setSelectedClassDetail(null);
    setEditingClass(cls);
    const matchedCatalog = catalog.find(
      (c) => c.id === cls.catalog_id || c.nombre.toLowerCase() === String(cls.nombre_clase || '').toLowerCase()
    );
    setForm({
      catalog_id: cls.catalog_id || matchedCatalog?.id || '',
      descripcion: cls.descripcion || '',
      entrenador_id: cls.entrenador_id || trainers[0]?.id || '',
      sala: cls.sala || 'Sala 1',
      dia_semana: cls.dia_semana ?? 1,
      hora_inicio: formatTimeShort(cls.hora_inicio),
      hora_fin: formatTimeShort(cls.hora_fin),
      cupo_maximo: Number(cls.cupo_maximo || 20),
      estado: cls.estado || 'activa',
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalError('');
    setEditingClass(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.catalog_id) {
      setModalError('Debes seleccionar una disciplina del catálogo.');
      return;
    }

    if (!form.entrenador_id) {
      setModalError('Debes seleccionar un entrenador.');
      return;
    }

    if (form.hora_inicio >= form.hora_fin) {
      setModalError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    if (form.hora_inicio < gymSettings.openingTime || form.hora_fin > gymSettings.closingTime) {
      setModalError(
        `El horario de la clase debe estar dentro del horario de atención (${gymSettings.openingTime} - ${gymSettings.closingTime}).`
      );
      return;
    }

    if (!Number.isInteger(Number(form.cupo_maximo)) || Number(form.cupo_maximo) < 1) {
      setModalError('El cupo máximo debe ser al menos 1.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        catalog_id: form.catalog_id,
        descripcion: form.descripcion.trim(),
        entrenador_id: form.entrenador_id,
        sala: form.sala,
        dia_semana: Number(form.dia_semana),
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        cupo_maximo: Number(form.cupo_maximo),
        ...(editingClass ? { estado: form.estado || 'activa' } : {}),
      };

      if (editingClass) {
        const res = await classesApi.updateClass(editingClass.id, payload);
        const updatedClass = res?.class || res;
        setClasses((prev) =>
          prev.map((item) => (item.id === editingClass.id ? updatedClass : item))
        );
        setSuccessMsg('Horario semanal actualizado correctamente.');
      } else {
        const res = await classesApi.createClass(payload);
        const createdClass = res?.class || res;
        setClasses((prev) => [...prev, createdClass]);
        setSuccessMsg('Clase semanal creada correctamente.');
      }

      handleCloseModal();
    } catch (err) {
      setModalError(err.message || 'No se pudo guardar la clase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (cls) => {
    setErrorMsg('');
    setSuccessMsg('');
    setDeletingId(cls.id);
    try {
      await classesApi.deleteClass(cls.id);
      setClasses((prev) => prev.filter((item) => item.id !== cls.id));
      setSelectedClassDetail(null);
      setSuccessMsg(`Clase "${cls.nombre_clase}" eliminada correctamente.`);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo eliminar la clase.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEnrollClick = async (cls) => {
    setErrorMsg('');
    setSuccessMsg('');
    setEnrollingId(cls.id);
    try {
      const res = await classesApi.enrollClass(cls.id);
      const updated = res?.class || res;
      const merged = { ...cls, ...updated, ya_inscrito: true };
      setClasses((prev) =>
        prev.map((item) => (item.id === cls.id ? merged : item))
      );
      setSelectedClassDetail((prev) => (prev?.id === cls.id ? merged : prev));
      setSuccessMsg(`¡Cupo reservado en "${cls.nombre_clase}" (${formatProximaFecha(cls.proxima_fecha)})!`);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo realizar la inscripción.');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenrollClick = async (cls) => {
    setErrorMsg('');
    setSuccessMsg('');
    setUnenrollingId(cls.id);
    try {
      const res = await classesApi.unenrollClass(cls.id);
      const updated = res?.class || res;
      const merged = { ...cls, ...updated, ya_inscrito: false };
      setClasses((prev) =>
        prev.map((item) => (item.id === cls.id ? merged : item))
      );
      setSelectedClassDetail((prev) => (prev?.id === cls.id ? merged : prev));
      setSuccessMsg(`Reserva cancelada en "${cls.nombre_clase}".`);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo cancelar la reserva.');
    } finally {
      setUnenrollingId(null);
    }
  };

  const handleOpenEnrollments = async (cls) => {
    setSelectedClassForEnrollments(cls);
    setEnrolledStudents([]);
    setEnrollmentsError('');
    setEnrollmentsModalOpen(true);
    setLoadingEnrollments(true);
    try {
      const res = await classesApi.getEnrollments(cls.id);
      setEnrolledStudents(res?.enrollments || []);
    } catch (err) {
      setEnrollmentsError(err.message || 'Error al obtener participantes inscritos.');
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

  const handleOpenCatalogModal = () => {
    setCatalogError('');
    setNewDiscipline({ nombre: '', categoria: 'basica' });
    setCatalogModalOpen(true);
  };

  const handleCloseCatalogModal = () => {
    setCatalogModalOpen(false);
    setCatalogError('');
  };

  const handleCreateCatalogItem = async (e) => {
    e.preventDefault();
    setCatalogError('');
    if (!newDiscipline.nombre.trim() || newDiscipline.nombre.trim().length < 2) {
      setCatalogError('El nombre de la disciplina debe tener al menos 2 caracteres.');
      return;
    }
    setSavingCatalog(true);
    try {
      const res = await classesApi.createCatalogItem({
        nombre: newDiscipline.nombre.trim(),
        categoria: newDiscipline.categoria,
      });
      const created = res?.item || res;
      setCatalog((prev) => [...prev, created]);
      setNewDiscipline({ nombre: '', categoria: 'basica' });
    } catch (err) {
      setCatalogError(err.message || 'No se pudo agregar la disciplina.');
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleToggleCatalogCategory = async (item) => {
    setCatalogError('');
    const nextCat = item.categoria === 'basica' ? 'especializada' : 'basica';
    try {
      const res = await classesApi.updateCatalogItem(item.id, { categoria: nextCat });
      const updated = res?.item || res;
      setCatalog((prev) => prev.map((c) => (c.id === item.id ? updated : c)));
      setClasses((prev) =>
        prev.map((cls) => (cls.catalog_id === item.id ? { ...cls, categoria: updated.categoria } : cls))
      );
    } catch (err) {
      setCatalogError(err.message || 'No se pudo cambiar la categoría.');
    }
  };

  const handleToggleCatalogActive = async (item) => {
    setCatalogError('');
    try {
      const res = await classesApi.updateCatalogItem(item.id, { is_active: !item.is_active });
      const updated = res?.item || res;
      setCatalog((prev) => prev.map((c) => (c.id === item.id ? updated : c)));
    } catch (err) {
      setCatalogError(err.message || 'No se pudo actualizar el estado.');
    }
  };

  const handleDeleteCatalogItem = async (item) => {
    setCatalogError('');
    try {
      await classesApi.deleteCatalogItem(item.id);
      setCatalog((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err) {
      setCatalogError(err.message || 'No se pudo eliminar la disciplina.');
    }
  };

  const canClientEnrollInClass = (cls) => {
    if (!hasActiveMembership) return false;
    if (clientClassLevel === 'todas') return true;
    if (clientClassLevel === 'basicas') return cls.categoria !== 'especializada';
    return false;
  };

  const trainerFullName = (cls) =>
    `${cls.entrenador_nombre || ''} ${cls.entrenador_apellido || ''}`.trim() || 'Entrenador';

  const displayedClasses = classes.filter((cls) => {
    if (isTrainer && trainerFilter === 'my_classes') {
      if (cls.entrenador_id !== user?.id) return false;
    }
    if (isClient) {
      if (cls.estado !== 'activa') return false;
      if (clientFilter === 'my_reservations' && !cls.ya_inscrito) return false;
    }
    return true;
  });

  const availableRooms = Array.from({ length: gymSettings.totalRooms }, (_, i) => `Sala ${i + 1}`);
  const openHour = Number(String(gymSettings.openingTime || '06:00').slice(0, 2));
  const closeHour = Number(String(gymSettings.closingTime || '22:00').slice(0, 2));

  const todayDow = new Date().getDay();

  const pageTitle = isTrainer
    ? 'Mis Clases Asignadas'
    : isClient
      ? 'Cronograma de Clases'
      : 'Gestión de Clases Semanales';

  const cardTitle = isTrainer
    ? trainerFilter === 'my_classes'
      ? 'Mi Cronograma Semanal'
      : 'Cronograma General'
    : isClient
      ? clientFilter === 'my_reservations'
        ? 'Mis reservas de la semana'
        : 'Cronograma semanal de clases'
      : 'Cronograma semanal';

  return (
    <DashboardLayout title={pageTitle}>
      <div className="classes-page">
        <div className="classes-card">
          <div className="classes-header-row">
            <h2 className="classes-card-title">{cardTitle}</h2>
            {isManager && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={handleOpenCatalogModal}
                >
                  <BookOpen size={16} />
                  <span>Catálogo de Disciplinas</span>
                </button>
                <button
                  type="button"
                  className="btn-primary classes-create-btn"
                  onClick={handleOpenCreate}
                >
                  Crear clase
                </button>
              </div>
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

            {isClient && (
              <div className="classes-filter-group">
                <button
                  type="button"
                  className={`classes-filter-btn ${clientFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setClientFilter('all')}
                >
                  Todas las Clases
                </button>
                <button
                  type="button"
                  className={`classes-filter-btn ${clientFilter === 'my_reservations' ? 'active' : ''}`}
                  onClick={() => setClientFilter('my_reservations')}
                >
                  Mis Reservas
                </button>
              </div>
            )}

            <div className="classes-view-switcher">
              <button
                type="button"
                className={`classes-view-btn ${viewMode === 'schedule' ? 'active' : ''}`}
                onClick={() => setViewMode('schedule')}
              >
                <CalendarDays size={16} />
                <span>Cronograma</span>
              </button>
              <button
                type="button"
                className={`classes-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
                <span>Lista</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="classes-alert classes-alert--error">
              {errorMsg}
            </div>
          )}

          {isClient && hasActiveMembership === false && (
            <div role="alert" className="classes-alert classes-alert--error" style={{ marginBottom: '1rem' }}>
              Se requiere una membresía activa para inscribirte a clases grupales.
            </div>
          )}

          {isClient && hasActiveMembership === true && clientClassLevel === 'ninguna' && (
            <div role="alert" className="classes-alert classes-alert--error" style={{ marginBottom: '1rem' }}>
              Tu plan actual es solo máquinas y no incluye acceso a clases grupales. Mejora a un plan con clases incluidas para poder reservar cupo.
            </div>
          )}

          {isClient && hasActiveMembership === true && clientClassLevel === 'basicas' && (
            <div
              role="status"
              className="classes-alert"
              style={{
                marginBottom: '1rem',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}
            >
              Tu plan actual incluye acceso a Clases Fitness. Para reservar Clases Especializadas, mejora al Plan Anual Elite.
            </div>
          )}

          {successMsg && (
            <div role="status" className="classes-alert classes-alert--success">
              {successMsg}
            </div>
          )}

          {loading ? (
            <Loader text="Cargando cronograma..." />
          ) : displayedClasses.length === 0 ? (
            <p className="classes-empty-text">
              {isTrainer && trainerFilter === 'my_classes'
                ? 'No tienes clases asignadas actualmente.'
                : isClient && clientFilter === 'my_reservations'
                  ? 'Aún no tienes reservas para las próximas sesiones.'
                  : 'No hay clases registradas en el cronograma semanal.'}
            </p>
          ) : viewMode === 'schedule' ? (
            (() => {
              const classHours = displayedClasses
                .map((c) => Number(String(c.hora_inicio || '08:00').slice(0, 2)))
                .filter((h) => Number.isFinite(h));
              const minHour = classHours.length > 0 ? Math.min(openHour, ...classHours) : openHour;
              const maxHour = classHours.length > 0 ? Math.max(closeHour, ...classHours) : closeHour;
              const hours = [];
              for (let h = minHour; h <= maxHour; h += 1) {
                hours.push(h);
              }

              return (
                <div className="timetable-wrap">
                  <table className="timetable-grid">
                    <thead>
                      <tr>
                        <th className="timetable-hour-col">Hora</th>
                        {DIAS_SEMANA.map((day) => {
                          const isToday = todayDow === day.value;
                          return (
                            <th
                              key={day.value}
                              className={`timetable-day-col ${isToday ? 'is-today' : ''}`}
                            >
                              <div className="timetable-day-head">
                                <span>{day.label}</span>
                                {isToday && <span className="schedule-today-badge">Hoy</span>}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {hours.map((hour) => {
                        const hourLabel = `${String(hour).padStart(2, '0')}:00`;
                        return (
                          <tr key={hour}>
                            <td className="timetable-hour-cell">{hourLabel}</td>
                            {DIAS_SEMANA.map((day) => {
                              const isToday = todayDow === day.value;
                              const slotClasses = displayedClasses
                                .filter(
                                  (c) =>
                                    Number(c.dia_semana) === day.value &&
                                    Number(String(c.hora_inicio || '').slice(0, 2)) === hour
                                )
                                .sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));

                              return (
                                <td
                                  key={day.value}
                                  className={`timetable-slot-cell ${isToday ? 'is-today' : ''}`}
                                >
                                  <div className="timetable-slot-stack">
                                    {slotClasses.map((cls) => {
                                      const isInactive = cls.estado !== 'activa';
                                      const isSpecialized = cls.categoria === 'especializada';
                                      return (
                                        <button
                                          key={cls.id}
                                          type="button"
                                          onClick={() => setSelectedClassDetail(cls)}
                                          className={`timetable-event-pill ${
                                            isSpecialized ? 'is-specialized' : 'is-fitness'
                                          } ${isInactive ? 'is-inactive' : ''}`}
                                          title={`${cls.nombre_clase} (${formatTimeShort(cls.hora_inicio)} - ${formatTimeShort(cls.hora_fin)})`}
                                        >
                                          <span className="timetable-event-title">{cls.nombre_clase}</span>
                                          {isInactive ? (
                                            <span className="classes-status-badge status-cancelada">Pausada</span>
                                          ) : cls.ya_inscrito ? (
                                            <span className="classes-status-badge status-programada">Inscrito</span>
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()
          ) : (
            <div className="classes-table-wrap">
              <table className="classes-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Clase</th>
                    <th>Entrenador</th>
                    <th>Sala</th>
                    <th>Horario</th>
                    <th>Próx. Sesión</th>
                    <th>Cupos</th>
                    <th>Estado</th>
                    {(isManager || isClient || isTrainer) && <th className="classes-actions-col">Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayedClasses.map((cls) => {
                    const inscritos = Number(cls.inscritos_actuales ?? 0);
                    const cupo = Number(cls.cupo_maximo ?? 0);
                    const isFull = inscritos >= cupo;
                    const isInactive = cls.estado !== 'activa';
                    const isMyAssignedClass = isTrainer && cls.entrenador_id === user?.id;

                    return (
                      <tr key={cls.id}>
                        <td><strong>{formatDayLabel(cls.dia_semana)}</strong></td>
                        <td className="classes-name-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong>{cls.nombre_clase}</strong>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '9999px',
                                backgroundColor: cls.categoria === 'especializada' ? '#f3e8ff' : '#dbeafe',
                                color: cls.categoria === 'especializada' ? '#7e22ce' : '#1d4ed8',
                              }}
                            >
                              {cls.categoria === 'especializada' ? 'Clase Especializada' : 'Clase Fitness'}
                            </span>
                          </div>
                          {cls.descripcion && (
                            <span className="classes-desc-sub">{cls.descripcion}</span>
                          )}
                        </td>
                        <td>{trainerFullName(cls)}</td>
                        <td>{cls.sala}</td>
                        <td>
                          {formatTimeShort(cls.hora_inicio)} - {formatTimeShort(cls.hora_fin)}
                        </td>
                        <td>{formatProximaFecha(cls.proxima_fecha)}</td>
                        <td>
                          {inscritos} / {cupo}
                        </td>
                        <td>
                          <span className={`classes-status-badge ${isInactive ? 'status-cancelada' : 'status-programada'}`}>
                            {STATUS_LABELS[cls.estado] || cls.estado}
                          </span>
                        </td>
                        <td>
                          {isManager && (
                            <div className="classes-row-actions">
                              <button
                                type="button"
                                className="btn-secondary-sm"
                                onClick={() => handleOpenEnrollments(cls)}
                                title="Ver lista de participantes"
                              >
                                Participantes
                              </button>
                              <button
                                type="button"
                                className="btn-secondary-sm"
                                onClick={() => handleOpenEdit(cls)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn-danger-sm"
                                disabled={deletingId === cls.id || inscritos > 0}
                                onClick={() => handleDeleteClick(cls)}
                                title={
                                  inscritos > 0
                                    ? 'No se puede eliminar una clase con participantes inscritos'
                                    : 'Eliminar clase'
                                }
                              >
                                {deletingId === cls.id ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            </div>
                          )}

                          {isTrainer && (
                            isMyAssignedClass ? (
                              <button
                                type="button"
                                className="btn-secondary-sm"
                                onClick={() => handleOpenEnrollments(cls)}
                              >
                                Ver participantes
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Solo lectura</span>
                            )
                          )}

                          {isClient && (
                            <div className="classes-row-actions">
                              {cls.ya_inscrito ? (
                                <button
                                  type="button"
                                  className="btn-danger-sm"
                                  disabled={unenrollingId === cls.id}
                                  onClick={() => handleUnenrollClick(cls)}
                                >
                                  {unenrollingId === cls.id ? 'Cancelando...' : 'Cancelar reserva'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  disabled={
                                    isFull ||
                                    isInactive ||
                                    enrollingId === cls.id ||
                                    !canClientEnrollInClass(cls)
                                  }
                                  onClick={() => handleEnrollClick(cls)}
                                  title={
                                    hasActiveMembership === false
                                      ? 'Requiere una membresía activa'
                                      : !canClientEnrollInClass(cls)
                                        ? cls.categoria === 'especializada' && clientClassLevel === 'basicas'
                                          ? 'Tu plan solo incluye clases básicas'
                                          : 'Tu plan actual no incluye clases grupales'
                                        : ''
                                  }
                                >
                                  {enrollingId === cls.id
                                    ? 'Inscribiendo...'
                                    : isFull
                                      ? 'Llena'
                                      : isInactive
                                        ? 'Pausada'
                                        : hasActiveMembership === false
                                          ? 'Membresía requerida'
                                          : !canClientEnrollInClass(cls)
                                            ? cls.categoria === 'especializada' && clientClassLevel === 'basicas'
                                              ? 'Solo Plan Elite'
                                              : 'No incluido en plan'
                                            : 'Reservar'}
                                </button>
                              )}
                            </div>
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

      {/* Modal de creación / edición de clase semanal */}
      {modalOpen && (
        <div
          className="classes-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="class-modal-title"
          onClick={handleCloseModal}
        >
          <div className="classes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="classes-modal-header">
              <h2 id="class-modal-title" className="classes-card-title">
                {editingClass ? 'Editar clase semanal' : 'Crear clase semanal'}
              </h2>
              <button
                type="button"
                className="classes-close-btn"
                onClick={handleCloseModal}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div role="alert" className="classes-alert classes-alert--error">
                {modalError}
              </div>
            )}

            <form className="classes-form" onSubmit={handleSubmit}>
              <div className="classes-form-field">
                <label htmlFor="catalog_id">Disciplina (del catálogo)</label>
                <select
                  id="catalog_id"
                  name="catalog_id"
                  value={form.catalog_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona una disciplina</option>
                  <optgroup label="Clases Fitness">
                    {catalog
                      .filter((c) => c.categoria === 'basica' && (c.is_active !== false || c.id === form.catalog_id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Clases Especializadas">
                    {catalog
                      .filter((c) => c.categoria === 'especializada' && (c.is_active !== false || c.id === form.catalog_id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="classes-form-field">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  rows={2}
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Detalle breve de la sesión"
                />
              </div>

              <div className="classes-form-grid">
                <div className="classes-form-field">
                  <label htmlFor="entrenador_id">Entrenador</label>
                  <select
                    id="entrenador_id"
                    name="entrenador_id"
                    value={form.entrenador_id}
                    onChange={handleChange}
                    required
                  >
                    {trainers.length === 0 && (
                      <option value="">No hay entrenadores disponibles</option>
                    )}
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="classes-form-field">
                  <label htmlFor="sala">Sala</label>
                  <select
                    id="sala"
                    name="sala"
                    value={form.sala}
                    onChange={handleChange}
                    required
                  >
                    {availableRooms.map((sala) => (
                      <option key={sala} value={sala}>
                        {sala}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="classes-form-grid">
                <div className="classes-form-field">
                  <label htmlFor="dia_semana">Día de la semana</label>
                  <select
                    id="dia_semana"
                    name="dia_semana"
                    value={form.dia_semana}
                    onChange={handleChange}
                    required
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d.value} value={d.value}>
                        Todos los {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="classes-form-field">
                  <label htmlFor="cupo_maximo">Cupo máximo</label>
                  <input
                    id="cupo_maximo"
                    name="cupo_maximo"
                    type="number"
                    min="1"
                    max="500"
                    value={form.cupo_maximo}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="classes-form-grid">
                <div className="classes-form-field">
                  <label htmlFor="hora_inicio">Hora inicio</label>
                  <input
                    id="hora_inicio"
                    name="hora_inicio"
                    type="time"
                    min={gymSettings.openingTime}
                    max={gymSettings.closingTime}
                    value={form.hora_inicio}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="classes-form-field">
                  <label htmlFor="hora_fin">Hora fin</label>
                  <input
                    id="hora_fin"
                    name="hora_fin"
                    type="time"
                    min={gymSettings.openingTime}
                    max={gymSettings.closingTime}
                    value={form.hora_fin}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <p style={{ margin: '-6px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Horario permitido según atención del gimnasio: {gymSettings.openingTime} - {gymSettings.closingTime}
              </p>

              {editingClass && (
                <div className="classes-form-field">
                  <label htmlFor="estado">Estado del horario</label>
                  <select
                    id="estado"
                    name="estado"
                    value={form.estado || 'activa'}
                    onChange={handleChange}
                  >
                    <option value="activa">Activa</option>
                    <option value="inactiva">Pausada / Inactiva</option>
                  </select>
                </div>
              )}

              <div className="classes-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingClass ? 'Guardar cambios' : 'Crear clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver participantes inscritos en la próxima sesión */}
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
                  Participantes inscritos ({enrolledStudents.length} / {selectedClassForEnrollments.cupo_maximo})
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  {selectedClassForEnrollments.nombre_clase} • {formatDayLabel(selectedClassForEnrollments.dia_semana)} ({formatProximaFecha(selectedClassForEnrollments.proxima_fecha)}) • {formatTimeShort(selectedClassForEnrollments.hora_inicio)} - {formatTimeShort(selectedClassForEnrollments.hora_fin)} • {selectedClassForEnrollments.sala}
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
                <Loader text="Cargando lista de participantes..." />
              </div>
            ) : enrollmentsError ? (
              <div role="alert" className="classes-alert classes-alert--error">
                {enrollmentsError}
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '0.9375rem' }}>Aún no hay participantes inscritos para esta sesión.</p>
              </div>
            ) : (
              <div className="classes-table-wrap">
                <table className="classes-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Participante</th>
                      <th>Documento</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((student, idx) => (
                      <tr key={student.enrollment_id || student.client_id || idx}>
                        <td>{idx + 1}</td>
                        <td className="classes-name-cell">
                          <strong>{student.first_name} {student.last_name}</strong>
                        </td>
                        <td>{student.numero_documento || '-'}</td>
                        <td>{student.email || '-'}</td>
                        <td>{student.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="classes-modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="btn-secondary" onClick={handleCloseEnrollments}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de clase (al hacer clic en una tarjeta del cronograma) */}
      {selectedClassDetail && (
        <div
          className="classes-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="class-detail-title"
          onClick={() => setSelectedClassDetail(null)}
        >
          <div
            className="classes-modal"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const cls = selectedClassDetail;
              const inscritos = Number(cls.inscritos_actuales ?? 0);
              const cupo = Number(cls.cupo_maximo ?? 0);
              const isFull = inscritos >= cupo;
              const isInactive = cls.estado !== 'activa';
              const isMyAssignedClass = isTrainer && cls.entrenador_id === user?.id;

              return (
                <>
                  <div className="classes-modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h2 id="class-detail-title" className="classes-card-title">
                          {cls.nombre_clase}
                        </h2>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: cls.categoria === 'especializada' ? '#f3e8ff' : '#dbeafe',
                            color: cls.categoria === 'especializada' ? '#7e22ce' : '#1d4ed8',
                          }}
                        >
                          {cls.categoria === 'especializada' ? 'Clase Especializada' : 'Clase Fitness'}
                        </span>
                        {isInactive && (
                          <span className="classes-status-badge status-cancelada">Pausada</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600 }}>
                        {formatDayLabel(cls.dia_semana)} • Próx. sesión: {formatProximaFecha(cls.proxima_fecha)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="classes-close-btn"
                      onClick={() => setSelectedClassDetail(null)}
                      aria-label="Cerrar"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {cls.descripcion && (
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.45 }}>
                      {cls.descripcion}
                    </p>
                  )}

                  <div className="schedule-class-meta" style={{ gap: '8px', fontSize: '0.88rem', marginBottom: '16px' }}>
                    <div className="schedule-class-meta-row">
                      <Clock size={15} />
                      <span>{formatTimeShort(cls.hora_inicio)} - {formatTimeShort(cls.hora_fin)}</span>
                    </div>
                    <div className="schedule-class-meta-row">
                      <MapPin size={15} />
                      <span>{cls.sala}</span>
                    </div>
                    <div className="schedule-class-meta-row">
                      <User size={15} />
                      <span>{trainerFullName(cls)}</span>
                    </div>
                    <div className="schedule-class-meta-row">
                      <Users size={15} />
                      <span>Cupos: {inscritos} / {cupo}</span>
                    </div>
                  </div>

                  <div className="classes-modal-actions" style={{ justifyContent: 'space-between' }}>
                    {isManager && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-secondary-sm"
                          onClick={() => {
                            setSelectedClassDetail(null);
                            handleOpenEnrollments(cls);
                          }}
                        >
                          Participantes ({inscritos})
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-sm"
                          onClick={() => handleOpenEdit(cls)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-danger-sm"
                          disabled={deletingId === cls.id || inscritos > 0}
                          onClick={() => handleDeleteClick(cls)}
                          title={inscritos > 0 ? 'Tiene participantes inscritos' : 'Eliminar clase'}
                        >
                          {deletingId === cls.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    )}

                    {isTrainer && isMyAssignedClass && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => {
                          setSelectedClassDetail(null);
                          handleOpenEnrollments(cls);
                        }}
                      >
                        Ver participantes ({inscritos})
                      </button>
                    )}

                    {isClient && (
                      cls.ya_inscrito ? (
                        <button
                          type="button"
                          className="calendar-card-action cancel"
                          disabled={unenrollingId === cls.id}
                          onClick={() => handleUnenrollClick(cls)}
                          style={{ width: '100%' }}
                        >
                          {unenrollingId === cls.id ? 'Cancelando...' : 'Cancelar reserva'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="calendar-card-action"
                          disabled={
                            enrollingId === cls.id ||
                            isFull ||
                            isInactive ||
                            !canClientEnrollInClass(cls)
                          }
                          onClick={() => handleEnrollClick(cls)}
                          style={{ width: '100%' }}
                        >
                          {enrollingId === cls.id
                            ? 'Inscribiendo...'
                            : isFull
                              ? 'Cupo lleno'
                              : !hasActiveMembership
                                ? 'Membresía requerida'
                                : !canClientEnrollInClass(cls)
                                  ? cls.categoria === 'especializada' && clientClassLevel === 'basicas'
                                    ? 'Solo Plan Elite'
                                    : 'No incluido'
                                  : 'Reservar cupo'}
                        </button>
                      )
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal para gestionar el catálogo de disciplinas */}
      {catalogModalOpen && isManager && (
        <div
          className="classes-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-modal-title"
          onClick={handleCloseCatalogModal}
        >
          <div
            className="classes-modal"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="classes-modal-header">
              <div>
                <h2 id="catalog-modal-title" className="classes-card-title">
                  Catálogo de Disciplinas
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Define las Clases Fitness y Clases Especializadas disponibles para programar horarios y mostrar en los planes.
                </p>
              </div>
              <button
                type="button"
                className="classes-close-btn"
                onClick={handleCloseCatalogModal}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {catalogError && (
              <div role="alert" className="classes-alert classes-alert--error" style={{ marginBottom: '1rem' }}>
                {catalogError}
              </div>
            )}

            <form
              onSubmit={handleCreateCatalogItem}
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div className="classes-form-field" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                <label htmlFor="new_discipline_name">Nueva disciplina</label>
                <input
                  id="new_discipline_name"
                  type="text"
                  placeholder="Ej. Pilates Mat"
                  value={newDiscipline.nombre}
                  onChange={(e) => setNewDiscipline((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="classes-form-field" style={{ flex: '0 0 170px', marginBottom: 0 }}>
                <label htmlFor="new_discipline_cat">Categoría</label>
                <select
                  id="new_discipline_cat"
                  value={newDiscipline.categoria}
                  onChange={(e) => setNewDiscipline((prev) => ({ ...prev, categoria: e.target.value }))}
                >
                  <option value="basica">Clase Fitness</option>
                  <option value="especializada">Clase Especializada</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={savingCatalog}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '40px' }}
              >
                <Plus size={16} />
                <span>{savingCatalog ? 'Agregando...' : 'Agregar'}</span>
              </button>
            </form>

            <div className="classes-table-wrap" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table className="classes-table">
                <thead>
                  <tr>
                    <th>Disciplina</th>
                    <th>Categoría</th>
                    <th>Estado</th>
                    <th className="classes-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nombre}</strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleCatalogCategory(item)}
                          title="Clic para cambiar entre Clase Fitness y Clase Especializada"
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: item.categoria === 'especializada' ? '#f3e8ff' : '#dbeafe',
                            color: item.categoria === 'especializada' ? '#7e22ce' : '#1d4ed8',
                          }}
                        >
                          {item.categoria === 'especializada' ? 'Clase Especializada' : 'Clase Fitness'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleCatalogActive(item)}
                          className={`classes-status-badge ${item.is_active ? 'status-programada' : 'status-cancelada'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="Clic para activar o pausar"
                        >
                          {item.is_active ? 'Activa' : 'Pausada'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger-sm"
                          onClick={() => handleDeleteCatalogItem(item)}
                          title="Eliminar disciplina"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {catalog.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                        No hay disciplinas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="classes-modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="btn-secondary" onClick={handleCloseCatalogModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
