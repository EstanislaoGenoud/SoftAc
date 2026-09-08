CREATE DATABASE IF NOT EXISTS tenant_demo_db;
USE tenant_demo_db;
CREATE TABLE escuelas (
    id CHAR(36) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE periodos_lectivos (
    id CHAR(36) PRIMARY KEY,
    escuela_id CHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    actual BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (escuela_id) REFERENCES escuelas(id) ON DELETE RESTRICT
);
CREATE TABLE cursos (
    id CHAR(36) PRIMARY KEY,
    escuela_id CHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    FOREIGN KEY (escuela_id) REFERENCES escuelas(id) ON DELETE RESTRICT
);
CREATE TABLE materias (
    id CHAR(36) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);
CREATE TABLE cursos_materias (
    id CHAR(36) PRIMARY KEY,
    curso_id CHAR(36) NOT NULL,
    materia_id CHAR(36) NOT NULL,
    periodo_lectivo_id CHAR(36) NOT NULL,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE RESTRICT,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE RESTRICT,
    FOREIGN KEY (periodo_lectivo_id) REFERENCES periodos_lectivos(id) ON DELETE RESTRICT,
    UNIQUE INDEX idx_curso_materia_periodo (curso_id, materia_id, periodo_lectivo_id)
);
CREATE TABLE alumnos (
    id CHAR(36) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    identificacion VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE inscripciones (
    id CHAR(36) PRIMARY KEY,
    alumno_id CHAR(36) NOT NULL,
    curso_materia_id CHAR(36) NOT NULL,
    estado ENUM('REGULAR', 'LIBRE', 'BAJA') DEFAULT 'REGULAR',
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE RESTRICT,
    FOREIGN KEY (curso_materia_id) REFERENCES cursos_materias(id) ON DELETE RESTRICT
);
CREATE TABLE horarios (
    id CHAR(36) PRIMARY KEY,
    curso_materia_id CHAR(36) NOT NULL,
    dia_semana TINYINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    FOREIGN KEY (curso_materia_id) REFERENCES cursos_materias(id) ON DELETE CASCADE
);
CREATE TABLE clases (
    id CHAR(36) PRIMARY KEY,
    horario_id CHAR(36) NULL,
    fecha DATE NOT NULL,
    tema_dictado TEXT NULL,
    observaciones TEXT NULL,
    estado ENUM('DICTADA', 'SUSPENDIDA', 'FERIADO') DEFAULT 'DICTADA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE SET NULL,
    INDEX idx_fecha (fecha)
);
CREATE TABLE asistencias (
    id CHAR(36) PRIMARY KEY,
    clase_id CHAR(36) NOT NULL,
    inscripcion_id CHAR(36) NOT NULL,
    presente BOOLEAN NOT NULL,
    FOREIGN KEY (clase_id) REFERENCES clases(id) ON DELETE CASCADE,
    FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE RESTRICT,
    UNIQUE INDEX idx_clase_inscripcion (clase_id, inscripcion_id)
);
CREATE TABLE escalas_calificacion (
    id CHAR(36) PRIMARY KEY,
    escuela_id CHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    tipo ENUM('CUANTITATIVA', 'CUALITATIVA') NOT NULL,
    configuracion JSON NOT NULL,
    FOREIGN KEY (escuela_id) REFERENCES escuelas(id) ON DELETE CASCADE
);
CREATE TABLE evaluaciones (
    id CHAR(36) PRIMARY KEY,
    curso_materia_id CHAR(36) NOT NULL,
    escala_calificacion_id CHAR(36) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    FOREIGN KEY (curso_materia_id) REFERENCES cursos_materias(id) ON DELETE RESTRICT,
    FOREIGN KEY (escala_calificacion_id) REFERENCES escalas_calificacion(id) ON DELETE RESTRICT
);
CREATE TABLE calificaciones (
    id CHAR(36) PRIMARY KEY,
    evaluacion_id CHAR(36) NOT NULL,
    inscripcion_id CHAR(36) NOT NULL,
    valor_obtenido VARCHAR(10) NOT NULL,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE RESTRICT,
    UNIQUE INDEX idx_evaluacion_inscripcion (evaluacion_id, inscripcion_id)
);