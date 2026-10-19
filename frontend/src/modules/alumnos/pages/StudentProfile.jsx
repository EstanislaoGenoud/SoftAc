import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentProfile, getStudentHistory } from "../services/studentService";
import { getCourseById } from "@/modules/cursos";
import { getClasesByCursoMateria } from "@/modules/asistencias/services/clasesService";
import { calculateAttendancePercentage, getAttendance, summarizeAttendance } from "@/modules/asistencias/services/attendanceService";
import { ArrowLeftIcon, StudentIcon } from "@/shared/components/Icon";
import "@/modules/cursos/styles/CourseDetail.css";

function StudentProfile() {
  const { id, courseId, studentId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [course, setCourse] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileData, historyData, courseData] = await Promise.all([
          getStudentProfile(studentId),
          getStudentHistory(studentId),
          getCourseById(courseId).catch(() => null)
        ]);
        setProfile(profileData);
        setHistory(historyData);
        setCourse(courseData);

        const classes = await getClasesByCursoMateria(courseId);
        const records = [];
        for (const currentClass of classes) {
          const attendance = await getAttendance(currentClass.id);
          const record = attendance[studentId] || attendance[String(studentId)];
          if (record) records.push(record);
        }
        const summary = summarizeAttendance(records);
        setAttendanceSummary({
          ...summary,
          porcentaje: calculateAttendancePercentage(records)
        });
      } catch (error) {
        console.error("Error al cargar perfil de alumno:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId, courseId]);

  if (loading) return <main className="course-detail-page"><h1>Cargando...</h1></main>;
  if (!profile) return <main className="course-detail-page"><h1>Alumno no encontrado</h1></main>;

  const fullName = `${profile.nombre || ''} ${profile.apellido || ''}`.trim() || "Alumno";
  const courseName = course?.nombre || course?.name || "Curso actual";

  return (
    <main className="course-detail-page">
      <section className="course-detail-card">
        <header className="course-detail-header">
          <button
            className="logout-button"
            style={{ marginBottom: '1rem' }}
            onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)}
          >
            <ArrowLeftIcon /> Volver al Curso
          </button>
          <br/>
          <span className="course-detail-kicker">
            <StudentIcon /> Perfil del Alumno · {courseName}
          </span>
          <h1>{fullName}</h1>
          <div className="course-detail-summary">
            <p>DNI: <strong>{profile.identificacion || profile.dni || 'No registrado'}</strong></p>
            <p>Curso: <strong>{courseName}</strong></p>
          </div>
        </header>

        <section className="course-detail-management">
          {/* 1. Datos personales */}
          <h2>Datos personales</h2>
          <dl className="course-detail-info">
            <dt>Nombre</dt>
            <dd>{profile.nombre || "-"}</dd>
            <dt>Apellido</dt>
            <dd>{profile.apellido || "-"}</dd>
            <dt>DNI / Identificación</dt>
            <dd>{profile.identificacion || profile.dni || "No registrado"}</dd>
            <dt>Curso asociado</dt>
            <dd>{courseName}</dd>
            <dt>Fecha de alta</dt>
            <dd>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</dd>
          </dl>

          {/* 2. Contacto */}
          <h2 style={{ marginTop: '1.75rem' }}>Información de contacto</h2>
          {/* Contrato futuro del backend: profile.contacto = { email, telefono, tutor_nombre, tutor_telefono } */}
          {profile.contacto ? (
            <dl className="course-detail-info">
              <dt>Email</dt>
              <dd>{profile.contacto.email || "-"}</dd>
              <dt>Teléfono</dt>
              <dd>{profile.contacto.telefono || "-"}</dd>
              <dt>Adulto responsable / Tutor</dt>
              <dd>{profile.contacto.tutor_nombre || "-"}</dd>
              <dt>Teléfono del tutor</dt>
              <dd>{profile.contacto.tutor_telefono || "-"}</dd>
            </dl>
          ) : (
            <div style={{ background: 'var(--bg)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
                Sin datos de contacto cargados en el sistema para este alumno.
              </p>
              <small style={{ color: 'var(--text)', opacity: 0.75, display: 'block', marginTop: '4px' }}>
                (El sistema mostrará automáticamente teléfono, correo y datos del tutor cuando estén disponibles)
              </small>
            </div>
          )}

          {/* 3. Asistencias */}
          <h2 style={{ marginTop: '1.75rem' }}>Resumen de asistencias</h2>
          {/* Contrato futuro del backend: profile.asistencia = { porcentaje, presentes, ausentes, total } */}
          {attendanceSummary && attendanceSummary.total > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginTop: '8px' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                <strong style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>{attendanceSummary.porcentaje}%</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '4px' }}>Asistencia general</p>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                <strong style={{ fontSize: '1.3rem', color: 'var(--text-h)' }}>{attendanceSummary.PRESENTE}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '4px' }}>Clases presentes</p>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                <strong style={{ fontSize: '1.3rem', color: 'var(--danger)' }}>{attendanceSummary.AUSENTE}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '4px' }}>Ausencias</p>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
                No hay métricas de asistencia consolidadas para este ciclo.
              </p>
              <small style={{ color: 'var(--text)', opacity: 0.75, display: 'block', marginTop: '4px' }}>
                (Para pasar o revisar asistencias del día, ingresá a la sección <em>Asistencia</em> del curso)
              </small>
            </div>
          )}

          {/* 4. Observaciones */}
          <h2 style={{ marginTop: '1.75rem' }}>Observaciones del equipo docente</h2>
          {/* Contrato futuro del backend: profile.observaciones = Array<{ fecha, texto, autor }> */}
          {profile.observaciones && profile.observaciones.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {profile.observaciones.map((obs, idx) => (
                <li key={idx} style={{ background: 'var(--surface)', padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '0.6rem' }}>
                  <p style={{ margin: '0 0 4px', color: 'var(--text-h)' }}>{obs.texto || obs.nota}</p>
                  <small style={{ color: 'var(--text)' }}>{obs.fecha} {obs.autor ? `· Por ${obs.autor}` : ''}</small>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ background: 'var(--bg)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
                Sin observaciones pedagógicas o de conducta registradas.
              </p>
            </div>
          )}

          {/* 5. Resumen Académico e Historial */}
          <h2 style={{ marginTop: '1.75rem' }}>Resumen Académico</h2>
          <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
            <p style={{ marginBottom: '6px' }}><strong>Materias totales cursadas:</strong> {profile.resumen_academico?.total_materias || 0}</p>
            <p><strong>Materias activas:</strong> {profile.resumen_academico?.materias_activas || 0}</p>
          </div>

          <h2 style={{ marginTop: '1.75rem' }}>Historial de Cursos / Materias</h2>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text)' }}>No hay historial registrado.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[...history]
                .sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)))
                .map((h) => (
                <li key={h.id_inscripcion} style={{ background: 'var(--surface)', padding: '0.9rem 1rem', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '0.6rem', boxShadow: 'var(--shadow-soft)' }}>
                  <strong style={{ color: 'var(--text-h)' }}>{h.curso}</strong> — {h.materia} <br/>
                  <small style={{ color: 'var(--text)' }}>Estado: <strong>{h.estado}</strong> | Ciclo: {h.periodo}</small>
                </li>
              ))}
            </ul>
          )}

          <h2 style={{ marginTop: '1.75rem' }}>Calificaciones históricas</h2>
          {profile.calificaciones_recientes && profile.calificaciones_recientes.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {profile.calificaciones_recientes.map((c, i) => (
                <li key={i} style={{ background: 'var(--surface)', padding: '0.9rem 1rem', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '0.6rem', boxShadow: 'var(--shadow-soft)' }}>
                  <strong style={{ color: 'var(--text-h)' }}>{c.titulo || c.evaluacion || 'Evaluación'}</strong> — <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.valor || c.valor_obtenido || '-'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text)' }}>No hay calificaciones históricas registradas en este momento.</p>
          )}
        </section>
      </section>
    </main>
  );
}

export default StudentProfile;
