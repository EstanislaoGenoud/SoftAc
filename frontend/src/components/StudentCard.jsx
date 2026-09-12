import "../styles/StudentCard.css";

function StudentCard({ student }) {
  return (
    <article className="student-card">

      <div className="student-icon">
      </div>

      <div className="student-info">
        <h2>{student.name}</h2>

        <p>
          DNI: {student.dni}
        </p>
      </div>

      <span>→</span>

    </article>
  );
}

export default StudentCard;