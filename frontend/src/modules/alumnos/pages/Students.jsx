import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCourseById } from "@/modules/cursos";
import { getStudentsByCourse } from "../services/studentService";
import StudentCard from "../components/StudentCard";
import { ArrowLeftIcon, SearchIcon } from "@/shared/components/Icon";
import "../styles/Students.css";

function Students() {
    const { id, courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    const PAGE_SIZE = 10;

    useEffect(() => {
        async function fetchData() {
            try {
                const [courseData, studentsData] = await Promise.all([
                    getCourseById(courseId),
                    getStudentsByCourse(courseId)
                ]);
                setCourse(courseData);
                setStudents(studentsData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [courseId]);

        // Filtro local por nombre, apellido o DNI sobre los alumnos del curso actual.
        const filteredStudents = students.filter((student) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            const fullName = `${student.nombre || ""} ${student.apellido || ""}`.toLowerCase();
            const dni = String(student.identificacion || student.dni || "").toLowerCase();
            return (
                (student.nombre || "").toLowerCase().includes(q) ||
                (student.apellido || "").toLowerCase().includes(q) ||
                fullName.includes(q) ||
                dni.includes(q)
            );
        });
        const filteredTotalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
        const filteredCurrentPage = Math.min(page, filteredTotalPages);
        const filteredPageStudents = filteredStudents.slice((filteredCurrentPage - 1) * PAGE_SIZE, filteredCurrentPage * PAGE_SIZE);

        async function handleSearch(e) {
        e.preventDefault();
        setPage(1);
    }

    if (loading && !course) return <main className="students-page"><h1>Cargando...</h1></main>;

    return (
        <main className="students-page">
            <section className="students-card">
                <header className="students-header">
                    <button className="logout-button" style={{marginBottom: '1rem'}} onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}`)}>
                        <ArrowLeftIcon /> Volver al Curso
                    </button>
                    <span className="students-kicker">Alumnos</span>
                    <h1>{course?.nombre ?? "Curso"}</h1>
                    <p className="students-summary">
                        {filteredStudents.length} alumnos encontrados
                    </p>
                </header>

                <form className="students-search-form" onSubmit={handleSearch}>
                    <input 
                        type="text" 
                        className="students-search-input"
                        placeholder="Buscar por nombre, apellido o DNI..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                    <button type="submit" className="students-search-button">
                        <SearchIcon /> Filtrar
                    </button>
                </form>

                <section className="students-list">
                    {filteredStudents.length === 0 ? (
                        <p style={{textAlign: 'center', padding: '2rem'}}>No hay alumnos para mostrar.</p>
                    ) : (
                        filteredPageStudents.map((student) => (
                            <StudentCard
                                key={student.id}
                                student={student}
                            />
                        ))
                    )}
                </section>

                {filteredTotalPages > 1 && (
                    <nav className="students-pagination" aria-label="Paginación de alumnos">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={filteredCurrentPage === 1}>
                            <ArrowLeftIcon /> Anterior
                        </button>
                        <span>Página {filteredCurrentPage} de {filteredTotalPages}</span>
                        <button onClick={() => setPage((p) => Math.min(filteredTotalPages, p + 1))} disabled={filteredCurrentPage === filteredTotalPages}>
                            Siguiente <ArrowLeftIcon style={{transform:'rotate(180deg)'}}/>
                        </button>
                    </nav>
                )}
            </section>
        </main>
    );
}

export default Students;
