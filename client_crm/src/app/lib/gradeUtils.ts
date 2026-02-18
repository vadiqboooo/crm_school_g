import type { AttendanceStatus } from "../types/api";

// Функция для определения цвета фона оценки - более приглушенные цвета
export const getGradeColor = (grade?: string, isLessonConducted?: boolean): string => {
  // Если урок не проведен, показываем нейтральный серый цвет
  if (!isLessonConducted) return "#e2e8f0"; // Светло-серый

  if (!grade || grade === "") return "#e2e8f0";
  const num = parseInt(grade);
  if (isNaN(num)) return "#d0db9d"; // Для "pass" и других
  if (num >= 5) return "#d0db9d"; // Зеленоватый
  if (num >= 4) return "#fad548"; // Яркий желтый
  if (num >= 3) return "#f3c23c"; // Желтый/оранжевый
  return "#ed6c72"; // Красный
};

// Функция для определения цвета посещения
export const getAttendanceColor = (
  attendance?: AttendanceStatus,
  isLessonConducted?: boolean
): string => {
  // Если урок не проведен, показываем нейтральный серый цвет
  if (!isLessonConducted) return "#e2e8f0"; // Светло-серый

  if (attendance === "present") return "#d0db9d"; // Зеленоватый
  if (attendance === "late") return "#fad548"; // Яркий желтый
  if (attendance === "trial") return "#a3d9ff"; // Голубой
  return "#ed6c72"; // Красный (absent)
};
