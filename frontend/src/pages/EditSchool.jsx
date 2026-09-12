import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import schoolsData from "../data/schools";
import "../styles/EditSchool.css";

function EditSchool({ onUpdateSchool }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const school = schoolsData.find(
    (school) => school.id === Number(id)
  );

  const [name, setName] = useState(school ? school.name : "");
  const [city, setCity] = useState(school ? school.city : "");

  if (!school) {
    return (
      <main>
        <h1>Escuela no encontrada</h1>

        <button onClick={() => navigate("/escuelas")}>
          Volver a mis escuelas
        </button>
      </main>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !city.trim()) {
      alert("Por favor completá todos los campos.");
      return;
    }

    const updatedSchool = {
      ...school,
      name: name,
      city: city
    };

    onUpdateSchool(updatedSchool);

    alert("Escuela actualizada correctamente.");

    navigate("/escuelas");
  }

  return (
    <main className="edit-school-page">

      <header className="edit-school-header">
        <h1>Editar escuela</h1>

        <p>
          Modificá los datos de la institución.
        </p>
      </header>

      <form
        className="edit-school-form"
        onSubmit={handleSubmit}
      >

        <div className="form-group">
          <label htmlFor="name">
            Nombre de la escuela
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="city">
            Ciudad
          </label>

          <input
            id="city"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>

        <button type="submit">
          Guardar cambios
        </button>

      </form>

    </main>
  );
}

export default EditSchool;