import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSchoolById, updateSchool } from "../services/schoolService";
import "../styles/EditSchool.css";

function EditSchool() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchSchoolData() {
      try {
        const data = await getSchoolById(id);
        setName(data.nombre || data.name || "");
        setCity(data.ciudad || data.city || "");
      } catch (err) {
        console.error("Error al obtener escuela:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSchoolData();
  }, [id]);

  if (loading) return <main><h1>Cargando escuela...</h1></main>;

  if (error) {
    return (
      <main>
        <h1>Escuela no encontrada</h1>
        <button onClick={() => navigate("/escuelas")}>
          Volver a mis escuelas
        </button>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !city.trim()) {
      alert("Por favor completá todos los campos.");
      return;
    }

    try {
      // Backend expects 'nombre' y 'ciudad'
      await updateSchool(id, { nombre: name, ciudad: city });
      alert("Escuela actualizada correctamente.");
      navigate("/escuelas");
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  }

  return (
    <main className="edit-school-page">
      <header className="edit-school-header">
        <h1>Editar escuela</h1>
        <p>Modificá los datos de la institución.</p>
      </header>

      <form className="edit-school-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Nombre de la escuela</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="city">Ciudad</label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>

        <button type="submit">Guardar cambios</button>
      </form>
    </main>
  );
}

export default EditSchool;