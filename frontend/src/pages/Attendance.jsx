import { useParams } from "react-router-dom";
import { useState } from "react";
import courses from "../data/courses";
import students from "../data/students";
import "../styles/Attendance.css";

function Attendance() {
  const { courseId } = useParams();

  const course = courses.find(
    (course) => course.id === Number(courseId)
  );

  const courseStudents = students.filter(
    (student) => student.courseId === Number(courseId)
  );

  const [attendance, setAttendance] = useState({});

  return (
    <main className="attendance-page">
      <section className="attendance-card">
        <header className="attendance-header">
          <span className="attendance-kicker">Asistencia</span>
          <h1>{course?.name ?? "Curso"}</h1>
          <h2>Registro de asistencia</h2>
          <p className="attendance-summary">
            {courseStudents.length} alumnos
          </p>
        </header>

        <section className="attendance-student-list">
          {courseStudents.map((student) => (
            <article key={student.id} className="attendance-student">
              <div>
                <h3>{student.name}</h3>
                <p>DNI: {student.dni}</p>
              </div>

              <div className="attendance-controls">
                <button className="present-button">
                  Presente
                </button>

                <button className="absent-button">
                  Ausente
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

export default Attendance;