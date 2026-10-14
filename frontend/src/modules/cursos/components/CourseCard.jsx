import { useNavigate, useParams } from "react-router-dom";
import { CourseIcon } from "@/shared/components/Icon";
import "../styles/CourseCard.css";

// Separa "año" y "división" a partir del nombre del curso (ej: "4° Año A").
function splitAnioDivision(name) {
  if (!name) return { anio: "-", division: "-" };
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^[A-Za-z]$/.test(last)) {
      return { anio: parts.slice(0, -1).join(" "), division: last.toUpperCase() };
    }
  }
  return { anio: name, division: "-" };
}

// La API no siempre devuelve la materia en el listado; la mostramos si viene en alguna forma conocida.
function getCourseMateria(course) {
  if (course.materia?.nombre) return course.materia.nombre;
  if (typeof course.materia === "string") return course.materia;
  if (course.nombreMateria) return course.nombreMateria;
  if (Array.isArray(course.materias) && course.materias.length > 0) {
    return course.materias.map((m) => m.nombre || m).join(", ");
  }
  return null;
}

function CourseCard({ course }) {
  const navigate = useNavigate();
  const { id } = useParams();

  function handleCardClick() {
    navigate(`/escuelas/${id}/cursos/${course.id}`);
  }

  const courseName = course.nombre || course.name || "Sin nombre";
  const studentCount = course.cantidad_alumnos !== undefined ? course.cantidad_alumnos : (course.students || 0);
  const schoolName = course.escuela?.nombre || course.escuela?.name || "Sin escuela";
  const { anio, division } = splitAnioDivision(courseName);
  const materia = getCourseMateria(course) || "Materia no informada";

  return (
    <article className="course-card" onClick={handleCardClick}>
      <div className="course-icon"><CourseIcon /></div>

      <div className="course-info">
        <h2>{courseName}</h2>
        <p>Escuela: {schoolName}</p>
        <p>Año: {anio} · División: {division}</p>
        <p>Materia: {materia}</p>
        <p>{studentCount} alumnos inscritos</p>
      </div>
      <span>→</span>
    </article>
  );
}

export default CourseCard;
