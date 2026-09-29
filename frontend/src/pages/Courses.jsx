import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSchoolById } from "../services/schoolService";
import { getCoursesBySchool } from "../services/courseService";
import CourseCard from "../components/CourseCard";
import "../styles/Schools.css";

function Courses() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [school, setSchool] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [schoolData, coursesData] = await Promise.all([
          getSchoolById(id),
          getCoursesBySchool(id)
        ]);
        setSchool(schoolData);
        setCourses(coursesData);
      } catch (error) {
        console.error("Error al cargar cursos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <main><h1>Cargando cursos...</h1></main>;
  if (!school) return <main><h1>Escuela no encontrada</h1></main>;

  return (
    <main className="schools-page">
      <header className="schools-header">
        <button className="logout-button" onClick={() => navigate(`/escuelas/${id}`)}>
          ← Volver al Panel
        </button>

        <p className="greeting">{school.nombre || school.name}</p>
        <h1>Cursos y Materias</h1>
        <p className="description">
          Gestioná los cursos de esta institución.
        </p>
        
        <button
          className="new-school-button"
          onClick={() => navigate(`/escuelas/${id}/cursos/nuevo`)}
        >
          + Nuevo curso
        </button>
      </header>

      <section className="schools-list">
        {courses.length === 0 ? (
          <div className="empty-schools">
            <div className="empty-schools-icon"></div>
            <h2>No tenés cursos registrados</h2>
            <p>Podés agregar tu primer curso para comenzar a gestionar alumnos.</p>
            <button onClick={() => navigate(`/escuelas/${id}/cursos/nuevo`)}>
              + Nuevo curso
            </button>
          </div>
        ) : (
          courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
            />
          ))
        )}
      </section>
    </main>
  );
}

export default Courses;