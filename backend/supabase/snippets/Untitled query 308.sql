DROP TABLE IF EXISTS classes;

CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  nombre_clase TEXT NOT NULL,
  descripcion TEXT,
  entrenador_id TEXT NOT NULL REFERENCES users(id),
  sala TEXT NOT NULL CHECK (
    sala IN ('Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5')
  ),
  fecha_clase DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  cupo_maximo INTEGER NOT NULL CHECK (cupo_maximo > 0),
  inscritos_actuales INTEGER NOT NULL DEFAULT 0 CHECK (
    inscritos_actuales >= 0 AND inscritos_actuales <= cupo_maximo
  ),
  estado TEXT NOT NULL DEFAULT 'programada' CHECK (
    estado IN ('programada', 'en_curso', 'completada', 'cancelada')
  ),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rango_horas_valido CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_classes_entrenador_fecha_horario
  ON classes (entrenador_id, fecha_clase, hora_inicio, hora_fin);

CREATE INDEX idx_classes_sala_fecha_horario
  ON classes (sala, fecha_clase, hora_inicio, hora_fin);