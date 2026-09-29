import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCourseById } from "../services/courseService";
import { getStudentsByCourse, searchStudents } from "../services/studentService";
import StudentCard from "../components/StudentCard";
import "../styles/Students.css";

function Students() {
    const { id, courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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

    async function handleSearch(e) {
        e.preventDefault();
        if (!searchQuery.trim()) {
            const studentsData = await getStudentsByCourse(courseId);
            setStudents(studentsData);
            return;
        }
        try {
            setLoading(true);
            const results = await searchStudents(searchQuery);
            setStudents(results);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading && !course) return <main className="students-page"><h1>Cargando...</h1></main>;

    return (
        <main className="students-page">
            <section className="students-card">
                <header className="students-header">
                    <button className="logout-button" style={{marginBottom: '1rem'}} onClick={() => navigate(`/escuelas/${id}/cursos/${courseId}`)}>
                        ← Volver al Curso
                    </button>
                    <span className="students-kicker">Alumnos</span>
                    <h1>{course?.nombre ?? "Curso"}</h1>
                    <p className="students-summary">
                        {students.length} alumnos encontrados
                    </p>
                </header>

                <form onSubmit={handleSearch} style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o apellido..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '4px' }}>Buscar</button>
                </form>

                <section className="students-list">
                    {students.length === 0 ? (
                        <p style={{textAlign: 'center', padding: '2rem'}}>No hay alumnos para mostrar.</p>
                    ) : (
                        students.map((student) => (
                            <StudentCard
                                key={student.id}
                                student={student}
                            />
                        ))
                    )}
                </section>
            </section>
        </main>
    );
}

export default Students;