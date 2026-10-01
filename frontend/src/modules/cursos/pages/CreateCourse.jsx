import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createCourse } from "../services/courseService";
import { getSchoolById } from "@/modules/escuelas";
import "@/modules/escuelas/styles/EditSchool.css";

function CreateCourse() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [school, setSchool] = useState(null);
  const [nombreCurso, setNombreCurso] = useState("");
  const [nombreMateria, setNombreMateria] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchSchool() {
      try {
        const s = await getSchoolById(id);
        setSchool(s);
      } catch (err) {
        console.error(err);
      }
    }
    fetchSchool();
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!nombreCurso.trim() || !nombreMateria.trim()) {
      alert("Por favor completá todos los campos.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createCourse({
        escuelaId: id,
        nombreCurso,
        nombreMateria,
        periodoId: '2024'
      });
      alert("Curso creado exitosamente.");
      navigate(`/escuelas/${id}/cursos`);
    } catch (error) {
      alert("Error al crear el curso: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="edit-school-page">
      <header className="edit-school-header">
        <button className="logout-button" onClick={() => navigate(`/escuelas/${id}/cursos`)}>
          ← Volver
        </button>
        <h1>Crear nuevo curso</h1>
        <p>Asociando curso a: <strong>{school ? (school.nombre || school.name) : 'Cargando...'}</strong></p>
      </header>

      <form className="edit-school-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombreCurso">Nombre del curso (Ej: 4° Año A)</label>
          <input
            id="nombreCurso"
            type="text"
            value={nombreCurso}
            onChange={(e) => setNombreCurso(e.target.value)}
            placeholder="Ej: 4° Año A"
          />
        </div>

        <div className="form-group">
          <label htmlFor="nombreMateria">Materia (Ej: Matemática)</label>
          <input
            id="nombreMateria"
            type="text"
            value={nombreMateria}
            onChange={(e) => setNombreMateria(e.target.value)}
            placeholder="Ej: Matemática"
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear curso"}
        </button>
      </form>
    </main>
  );
}

export default CreateCourse;
