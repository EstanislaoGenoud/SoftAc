import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateSchool.css";

function CreateSchool({ onCreateSchool }) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !city.trim()) {
      alert(" Por favor completá todos los campos.");
      return;
    }

   const newSchool = {
    id: Date.now(),
    name: name,
    city: city,
    courses: 0,
    students: 0
   };

   onCreateSchool(newSchool);

    alert("Escuela creada correctamente.");

    navigate("/escuelas");
  }

  return (
    <main className="create-school-page">

      <header className="create-school-header">
        <h1>Nueva escuela</h1>

        <p>
          Completá los datos de la institución.
        </p>
      </header>

      <form
        className="create-school-form"
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
            placeholder="Ej: Escuela Secundaria N° 12"
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
            placeholder="Ej: San Luis"
          />
        </div>

        <button type="submit">
          Crear escuela
        </button>

      </form>

    </main>
  );
}

export default CreateSchool;