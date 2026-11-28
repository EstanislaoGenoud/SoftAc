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
    curso_materia_id CHAR(36) NOT NULL,
    horario_id CHAR(36) NULL,
    fecha DATE NOT NULL,
    tema TEXT NULL,
    observaciones TEXT NULL,
    estado ENUM('DICTADA', 'SUSPENDIDA', 'FERIADO') DEFAULT 'DICTADA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_materia_id) REFERENCES cursos_materias(id) ON DELETE RESTRICT,
    FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE SET NULL,
    INDEX idx_fecha (fecha)
);
CREATE TABLE asistencias (
    id CHAR(36) PRIMARY KEY,
    clase_id CHAR(36) NOT NULL,
    alumno_id CHAR(36) NOT NULL,
    estado ENUM('PRESENTE', 'MEDIA_FALTA', 'AUSENTE', 'AUSENTE_CON_CERTIFICADO') DEFAULT 'PRESENTE',
    presente BOOLEAN DEFAULT TRUE,
    observacion TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (clase_id) REFERENCES clases(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE RESTRICT,
    UNIQUE INDEX idx_clase_alumno (clase_id, alumno_id)
);
CREATE TABLE evaluaciones (
    id CHAR(36) PRIMARY KEY,
    curso_id CHAR(36) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    tipo ENUM('Examen', 'Trabajo práctico', 'Oral', 'Recuperatorio') NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT NULL,
    ponderacion DECIMAL(5,2) NOT NULL DEFAULT 0,
    evaluacion_original_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluacion_original_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    INDEX idx_evaluaciones_curso_fecha (curso_id, fecha)
);
CREATE TABLE calificaciones (
    id CHAR(36) PRIMARY KEY,
    evaluacion_id CHAR(36) NOT NULL,
    alumno_id CHAR(36) NOT NULL,
    modelo ENUM('cuantitativo', 'cualitativo') NOT NULL,
    valor_numerico DECIMAL(4,2) NULL,
    valor_conceptual VARCHAR(30) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE RESTRICT,
    UNIQUE INDEX uq_calificacion_evaluacion_alumno (evaluacion_id, alumno_id)
);
CREATE TABLE configuracion_evaluaciones (
    curso_id CHAR(36) PRIMARY KEY,
    modelo ENUM('cuantitativo', 'cualitativo') NOT NULL DEFAULT 'cuantitativo',
    modo_recuperatorio ENUM('mayor', 'promedio') NOT NULL DEFAULT 'mayor',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
);
