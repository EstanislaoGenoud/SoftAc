import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentProfile, getStudentHistory } from "../services/studentService";
import "../styles/CourseDetail.css"; // Reutilizamos estilos

function StudentProfile() {
  const { id, courseId, studentId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileData, historyData] = await Promise.all([
          getStudentProfile(studentId),
          getStudentHistory(studentId)
        ]);
        setProfile(profileData);
        setHistory(historyData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  if (loading) return <main className="course-detail-page"><h1>Cargando...</h1></main>;
  if (!profile) return <main className="course-detail-page"><h1>Alumno no encontrado</h1></main>;

  const fullName = `${profile.nombre || ''} ${profile.apellido || ''}`.trim();

  return (
    <main className="course-detail-page">
      <section className="course-detail-card">
        <header className="course-detail-header">
          <button className="logout-button" style={{marginBottom: '1rem'}} onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}/alumnos`)}>
            ← Volver a lista
          </button>
          <br/>
          <span className="course-detail-kicker">Perfil del Alumno</span>
          <h1>{fullName}</h1>
          <div className="course-detail-summary">
            <p>DNI: {profile.identificacion || 'No registrado'}</p>
          </div>
        </header>

        <section className="course-detail-management">
          <h2>Resumen Académico</h2>
          <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <p><strong>Materias totales cursadas:</strong> {profile.resumen_academico?.total_materias || 0}</p>
            <p><strong>Materias activas:</strong> {profile.resumen_academico?.materias_activas || 0}</p>
          </div>

          <h2>Historial de Cursos / Materias</h2>
          {history.length === 0 ? (
            <p>No hay historial registrado.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {history.map((h) => (
                <li key={h.id_inscripcion} style={{ background: '#fff', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <strong>{h.curso}</strong> - {h.materia} <br/>
                  <small>Estado: {h.estado} | Ciclo: {h.periodo}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

export default StudentProfile;
