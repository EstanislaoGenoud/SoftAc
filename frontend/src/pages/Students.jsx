import { useParams } from "react-router-dom";
import courses from "../data/courses";
import students from "../data/students";
import StudentCard from "../components/StudentCard";
import "../styles/Students.css";

function Students() {
    const { courseId } = useParams();

    const course = courses.find(
        (course) => course.id === Number(courseId)
    );

    const courseStudents = students.filter(
        (student) => student.courseId === Number(courseId)
    );

    return (
        <main className="students-page">
            <section className="students-card">
                <header className="students-header">
                    <span className="students-kicker">Alumnos</span>
                    <h1>{course?.name ?? "Curso"}</h1>
                    <p className="students-course">
                        {course?.year ?? ""}° año · División {course?.division ?? ""}
                    </p>
                    <p className="students-summary">
                        {courseStudents.length} alumnos
                    </p>
                </header>

                <section className="students-list">
                    {courseStudents.map((student) => (
                        <StudentCard
                            key={student.id}
                            student={student}
                        />
                    ))}
                </section>
            </section>
        </main>
    );
}

export default Students;