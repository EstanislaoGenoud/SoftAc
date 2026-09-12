import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SchoolCard from "../components/SchoolCard";
import { getSchools } from "../services/schoolService";
import "../styles/Schools.css";


function Schools({ schools, onDeleteSchool }) {

    const navigate = useNavigate();

    const [schoolList, setSchoolList] =useState([]);

    useEffect(() => {
        const schoolsFromSevice = getSchools();

        setSchoolList(schoolsFromSevice);
        
    }, []);


    function handleLogout() {
        localStorage.removeItem("isLoggedIn");
        navigate("/login");
    }

    return (
        <main className="schools-page">

            <header className="schools-header">
                <button className="logout-button"
                    onClick={handleLogout}
                >
                    Cerrar sesion
                </button>


                <p className="greeting">Hola, [Nombre del usuario]</p>

                <h1>Mis Escuelas</h1>

                <p className="description">
                    Seleccione una institución para continuar.
                </p>
                {schools.length > 0 && (
                    <button
                        className="new-school-button"
                        onClick={() => navigate("/escuelas/nueva")}
                    >
                        + Nueva escuela
                    </button>
                )}
            </header>

            <section className="schools-list">
                {schoolList.length === 0 ? (
                    <div className="empty-schools">
                        <div className="empty-schools-icon">
                        </div>

                        <h2>No tenés escuelas registradas</h2>

                        <p>
                            Podés agregar tu primera institución para comenzar.
                        </p>

                        <button
                            onClick={() => navigate("/escuelas/nueva")}
                        >
                            + Nueva escuela
                        </button>
                    </div>
                ) : (
                    schoolList.map((school) => (
                        <SchoolCard
                            key={school.id}
                            school={school}
                            onDeleteSchool={onDeleteSchool}
                        />
                    ))
                )}
            </section>
        </main>
    );
}

export default Schools;