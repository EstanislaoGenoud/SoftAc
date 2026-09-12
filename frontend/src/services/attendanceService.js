export function getAttendance(courseId) {
    return courseId;
}

export function saveAttendance(courseId, attendanceData) {
    return {
        courseId,
        attendanceData
    };
}