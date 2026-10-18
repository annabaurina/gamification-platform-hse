export interface Student {
  id: string;
  name: string;
  gpa: number;
  attendance: number;
  bonusPoints: number;
  group: string;
  subjects: Record<string, number>;
}

export interface BonusApplication {
  id: string;
  studentId: string;
  studentName: string;
  group: string;
  category: string;
  description: string;
  pointsRequested: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  adminComment?: string;
}

export const SUBJECTS = [
  { id: "math", name: "Математический анализ", credits: 4 },
  { id: "algebra", name: "Линейная алгебра", credits: 3 },
  { id: "prog", name: "Введение в программирование", credits: 4 },
  { id: "eco", name: "Экономическая теория", credits: 3 },
  { id: "lang", name: "Иностранный язык", credits: 2 },
  { id: "history", name: "История", credits: 2 },
];

export const BONUS_CATEGORIES = [
  "Научная деятельность",
  "Спортивные достижения",
  "Культурная деятельность",
  "Общественная работа",
  "Олимпиады и конкурсы",
];

export const STUDENTS: Student[] = [
  {
    id: "u1", name: "Иван Петров", gpa: 8.2, attendance: 92, bonusPoints: 45, group: "БИ-241",
    subjects: { math: 8, algebra: 9, prog: 9, eco: 7, lang: 8, history: 8 },
  },
  {
    id: "u2", name: "Анна Смирнова", gpa: 9.1, attendance: 96, bonusPoints: 78, group: "БИ-241",
    subjects: { math: 9, algebra: 10, prog: 9, eco: 9, lang: 9, history: 9 },
  },
  {
    id: "u3", name: "Дмитрий Соколов", gpa: 7.8, attendance: 85, bonusPoints: 32, group: "БИ-241",
    subjects: { math: 7, algebra: 8, prog: 8, eco: 7, lang: 8, history: 8 },
  },
  {
    id: "u4", name: "Мария Лебедева", gpa: 8.9, attendance: 94, bonusPoints: 61, group: "БИ-241",
    subjects: { math: 9, algebra: 9, prog: 8, eco: 9, lang: 9, history: 9 },
  },
  {
    id: "u5", name: "Алексей Новиков", gpa: 7.2, attendance: 78, bonusPoints: 20, group: "БИ-241",
    subjects: { math: 6, algebra: 7, prog: 8, eco: 7, lang: 7, history: 8 },
  },
  {
    id: "u6", name: "Екатерина Морозова", gpa: 9.3, attendance: 98, bonusPoints: 90, group: "БИ-241",
    subjects: { math: 10, algebra: 9, prog: 9, eco: 9, lang: 10, history: 9 },
  },
  {
    id: "u7", name: "Сергей Волков", gpa: 6.5, attendance: 70, bonusPoints: 15, group: "БИ-241",
    subjects: { math: 6, algebra: 6, prog: 7, eco: 6, lang: 6, history: 7 },
  },
  {
    id: "u8", name: "Ольга Козлова", gpa: 8.5, attendance: 89, bonusPoints: 55, group: "БИ-241",
    subjects: { math: 8, algebra: 9, prog: 8, eco: 8, lang: 9, history: 9 },
  },
];

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export let BONUS_APPLICATIONS: BonusApplication[] = [
  {
    id: "b1", studentId: "u1", studentName: "Иван Петров", group: "БИ-241",
    category: "Научная деятельность",
    description: "Публикация статьи в сборнике НИУ ВШЭ «Молодые исследователи» по теме машинного обучения",
    pointsRequested: 20, status: "pending", createdAt: daysAgo(2),
  },
  {
    id: "b2", studentId: "u3", studentName: "Дмитрий Соколов", group: "БИ-241",
    category: "Спортивные достижения",
    description: "2-е место на чемпионате Москвы по плаванию среди студентов вузов",
    pointsRequested: 15, status: "approved", createdAt: daysAgo(10),
    adminComment: "Подтверждено грамотой. Баллы начислены.",
  },
  {
    id: "b3", studentId: "u5", studentName: "Алексей Новиков", group: "БИ-241",
    category: "Общественная работа",
    description: "Организация и проведение студенческого форума «Технологии будущего 2024»",
    pointsRequested: 25, status: "rejected", createdAt: daysAgo(15),
    adminComment: "Недостаточно подтверждающих документов. Просим повторно подать с приложением актов.",
  },
  {
    id: "b4", studentId: "u4", studentName: "Мария Лебедева", group: "БИ-241",
    category: "Олимпиады и конкурсы",
    description: "Победа (1-е место) в хакатоне ВШЭ DataFest 2024, трек Data Science",
    pointsRequested: 30, status: "pending", createdAt: daysAgo(1),
  },
  {
    id: "b5", studentId: "u6", studentName: "Екатерина Морозова", group: "БИ-241",
    category: "Культурная деятельность",
    description: "Главная роль в постановке театральной студии ВШЭ «Кривое зеркало»",
    pointsRequested: 10, status: "pending", createdAt: daysAgo(3),
  },
  {
    id: "b6", studentId: "u8", studentName: "Ольга Козлова", group: "БИ-241",
    category: "Научная деятельность",
    description: "Доклад на конференции «Молодые экономисты — 2024» в НИУ ВШЭ",
    pointsRequested: 18, status: "approved", createdAt: daysAgo(20),
    adminComment: "Подтверждено. Отличная работа.",
  },
];

export function addBonusApplication(
  app: Omit<BonusApplication, "id" | "createdAt" | "status">
): BonusApplication {
  const newApp: BonusApplication = {
    ...app,
    id: `b${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString().split("T")[0],
  };
  BONUS_APPLICATIONS = [newApp, ...BONUS_APPLICATIONS];
  return newApp;
}

export function updateApplicationStatus(
  id: string,
  status: "approved" | "rejected",
  adminComment: string
) {
  BONUS_APPLICATIONS = BONUS_APPLICATIONS.map((a) =>
    a.id === id ? { ...a, status, adminComment } : a
  );
}

export function updateGrade(studentId: string, subjectId: string, grade: number) {
  const idx = STUDENTS.findIndex((s) => s.id === studentId);
  if (idx !== -1) {
    STUDENTS[idx] = {
      ...STUDENTS[idx],
      subjects: { ...STUDENTS[idx].subjects, [subjectId]: grade },
    };
    const vals = Object.values(STUDENTS[idx].subjects);
    STUDENTS[idx].gpa = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
}

export interface Me {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  student_id: number | null;
  is_headman: boolean;
}
