import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCourseById } from "@/modules/cursos";
import { getStudentsByCourse } from "../services/studentService";
import StudentCard from "../components/StudentCard";
import CreateStudentModal from "../components/CreateStudentModal";
import { ArrowLeftIcon, SearchIcon, PlusIcon } from "@/shared/components/Icon";
import "../styles/Students.css";

function Students() {
    const { courseId } = useParams();

    const [course, setCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [enrollFeedback, setEnrollFeedback] = useState("");

    const PAGE_SIZE = 10;

    useEffect(() => {
        async function fetchData() {
            try {
                const [courseData, studentsData] = await Promise.all([
                    getCourseById(courseId),
                    getStudentsByCourse(courseId)
                ]);
                setCourse(courseData);
                setStudents(Array.isArray(studentsData) ? studentsData : []);
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

    function handleStudentEnrolled(newStudent) {
        setStudents((prev) => [newStudent, ...prev]);
        setEnrollFeedback(`Alumno ${newStudent.nombre} ${newStudent.apellido} inscripto exitosamente.`);
        setTimeout(() => setEnrollFeedback(""), 4500);
    }

    if (loading && !course) return <main className="students-page"><h1>Cargando...</h1></main>;

    return (
        <main className="students-page">
            <section className="students-card">
                <header className="students-header">
                    <span className="students-kicker">Alumnos</span>
                    <h1>{course?.nombre ?? "Curso"}</h1>
                    <p className="students-summary">
                        {filteredStudents.length} alumnos inscriptos
                    </p>
                </header>

                <div className="students-actions-bar">
                    <button
                        type="button"
                        className="students-add-button"
                        onClick={() => setIsEnrollModalOpen(true)}
                    >
                        <PlusIcon /> Inscribir alumno
                    </button>
                </div>

                {enrollFeedback && (
                    <div style={{
                        padding: "10px 14px",
                        margin: "10px 0",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: "500"
                    }}>
                        {enrollFeedback}
                    </div>
                )}

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
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                            <p style={{ margin: '0 0 1rem', color: 'var(--text)' }}>
                                {searchQuery ? "No se encontraron alumnos con ese criterio." : "No hay alumnos inscriptos en este curso todavía."}
                            </p>
                            {!searchQuery && (
                                <button
                                    type="button"
                                    className="students-add-button"
                                    onClick={() => setIsEnrollModalOpen(true)}
                                >
                                    <PlusIcon /> Inscribir primer alumno
                                </button>
                            )}
                        </div>
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

            <CreateStudentModal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                cursoId={courseId}
                cursoNombre={course?.nombre || course?.name}
                onStudentEnrolled={handleStudentEnrolled}
            />
        </main>
    );
}

export default Students;
