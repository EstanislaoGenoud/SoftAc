import { useParams } from "react-router-dom";
import schools from "../data/schools";
import courses from "../data/courses";
import CourseCard from "../components/CourseCard";

function Courses() {
  const { id } = useParams();

  const school = schools.find(
    (school) => school.id === Number(id)
  );

  const schoolCourses = courses.filter(
    (course) => course.schoolId === Number(id)
  );

  return (
    <main>
      <h1>Cursos</h1>

      <p>{school.name}</p>

      <p>
        Cursos de esta institución.
      </p>

      <section>
        {schoolCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
          />
        ))}
      </section>
    </main>
  );
}

export default Courses;