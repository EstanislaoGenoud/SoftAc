import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getSchoolById } from "@/modules/escuelas";
import { getCoursesBySchool, getCourseById } from "../services/courseService";
import CourseCard from "../components/CourseCard";
import { CourseIcon, PlusIcon } from "@/shared/components/Icon";
import "@/modules/escuelas/styles/Schools.css";

function Courses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const courseModule = location.state?.courseModule;
  const moduleLabels = {
    alumnos: "consultar alumnos",
    asistencia: "registrar asistencia",
    evaluaciones: "gestionar calificaciones",
  };
  const moduleAction = moduleLabels[courseModule];
  
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

        // El listado no trae cantidad_alumnos: lo completamos con el detalle de cada curso.
        const enriched = await Promise.all(
          coursesData.map(async (course) => {
            try {
              const detail = await getCourseById(course.id);
              return { ...course, cantidad_alumnos: detail.cantidad_alumnos };
            } catch {
              return course;
            }
          })
        );
        setCourses(enriched);
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
        <p className="greeting">{school.nombre || school.name}</p>
        <h1>{moduleAction ? "Seleccioná un curso" : "Cursos y Materias"}</h1>
        <p className="description">
          {moduleAction
            ? `Elegí un curso para ${moduleAction}.`
            : "Gestioná los cursos de esta institución."}
        </p>
        
        <button
          className="new-school-button"
          onClick={() => navigate(`/escuelas/${id}/cursos/nuevo`)}
        >
          <PlusIcon /> Nuevo curso
        </button>
      </header>

      <section className="schools-list">
        {courses.length === 0 ? (
          <div className="empty-schools">
            <div className="empty-schools-icon"><CourseIcon /></div>
            <h2>No tenés cursos registrados</h2>
            <p>Podés agregar tu primer curso para comenzar a gestionar alumnos.</p>
            <button onClick={() => navigate(`/escuelas/${id}/cursos/nuevo`)}>
              <PlusIcon /> Nuevo curso
            </button>
          </div>
        ) : (
          courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              destination={courseModule}
            />
          ))
        )}
      </section>
    </main>
  );
}

export default Courses;
