import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SchoolCard from "../components/SchoolCard";
import { getSchools, deleteSchool } from "../services/schoolService";
import { logout } from "@/modules/auth";
import { SchoolIcon, PlusIcon } from "@/shared/components/Icon";
import "../styles/Schools.css";

function Schools() {
    const navigate = useNavigate();
    const [schoolList, setSchoolList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    async function fetchSchools() {
        setLoading(true);
        setLoadError("");
        try {
            const schoolsFromService = await getSchools();
            setSchoolList(schoolsFromService);
        } catch (error) {
            console.error("Error cargando escuelas:", error);
            setLoadError(error.message);
            if (error.status === 401) {
                await handleLogout();
            }
        } finally {
            setLoading(false);
        }

    }

    useEffect(() => {
        fetchSchools();
    }, []);

    async function handleLogout() {
        await logout(); 
        navigate("/login");
    }

    async function handleDeleteSchoolBackend(id) {
        try {
            await deleteSchool(id);
            setSchoolList((prevList) => prevList.filter((s) => s.id !== id));
        } catch (error) {
            alert("Error al eliminar la escuela: " + error.message);
        }
    }

    if (loading) return <p>Cargando escuelas...</p>;

    if (loadError) {
        return (
            <main className="schools-page">
                <p role="alert">No se pudieron cargar las escuelas: {loadError}</p>
                <button onClick={fetchSchools}>Reintentar</button>
            </main>
        );
    }

    return (
        <main className="schools-page">
            <header className="schools-header">

                <p className="greeting">Hola, Docente</p>

                <h1>Mis Escuelas</h1>
                <p className="description">Seleccione una institución para continuar.</p>
                
                <button
                    className="new-school-button"
                    onClick={() => navigate("/escuelas/nueva")}
                >
                     <PlusIcon /> Nueva escuela
                </button>
            </header>

            <section className="schools-list">
                {schoolList.length === 0 ? (
                    <div className="empty-schools">
                        <div className="empty-schools-icon"><SchoolIcon /></div>
                        <h2>No tenés escuelas registradas</h2>
                        <p>Podés agregar tu primera institución para comenzar.</p>
                        <button onClick={() => navigate("/escuelas/nueva")}>
                            + <PlusIcon /> Nueva escuela
                        </button>
                    </div>
                ) : (
                    schoolList.map((school) => (
                        <SchoolCard
                            key={school.id}
                            school={school}
                            onDeleteSchool={handleDeleteSchoolBackend}
                        />
                    ))
                )}
            </section>
        </main>
    );
}

export default Schools;
