// Formas de los datos que devuelve y recibe la API. Reflejan los DTO del backend.

export type Role = 'STUDENT' | 'ADMIN';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type PostType = 'ARTICLE' | 'NEWS';
export type PaymentMethod = 'YAPE' | 'PLIN' | 'TRANSFER' | 'OTHER';
export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Me {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  emailVerified: boolean;
  hasPassword: boolean;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
}

export interface CourseCard {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  level: Level;
  coverUrl: string | null;
  price: number;
  currency: string;
  free: boolean;
  featured: boolean;
  lessonCount: number;
  durationSeconds: number;
}

export interface LessonItem {
  id: number;
  title: string;
  durationSeconds: number;
  freePreview: boolean;
  hasVideo: boolean;
}

export interface QuizRef {
  id: number;
  title: string;
  questionCount: number;
  passingScore: number;
}

export interface CourseModule {
  id: number;
  title: string;
  lessons: LessonItem[];
  quiz: QuizRef | null;
}

export interface CourseDetail {
  course: CourseCard;
  descriptionHtml: string;
  modules: CourseModule[];
}

export interface PathCard {
  id: number;
  slug: string;
  title: string;
  description: string;
  courseCount: number;
}

export interface PathDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  courses: CourseCard[];
}

export interface QuizStatus {
  quizId: number;
  bestScore: number;
  passed: boolean;
  attempts: number;
}

export interface ViewerState {
  enrolled: boolean;
  completedLessonIds: number[];
  quizzes: QuizStatus[];
  progressPercent: number;
  completed: boolean;
  certificateCode: string | null;
}

export interface LessonView {
  id: number;
  title: string;
  moduleTitle: string;
  youtubeVideoId: string | null;
  contentHtml: string;
  durationSeconds: number;
  completed: boolean;
  previousLessonId: number | null;
  nextLessonId: number | null;
}

export interface MyCourse {
  course: CourseCard;
  progressPercent: number;
  completed: boolean;
  certificateCode: string | null;
  enrolledAt: string;
}

export interface QuizView {
  id: number;
  title: string;
  passingScore: number;
  questions: { id: number; statement: string; options: { id: number; text: string }[] }[];
}

export interface QuizResult {
  score: number;
  passed: boolean;
  passingScore: number;
  results: { questionId: number; correct: boolean; correctOptionId: number }[];
  state: ViewerState;
}

export interface CertificateView {
  code: string;
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  issuedAt: string;
}

export interface Comment {
  id: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorIsAdmin: boolean;
  body: string;
  createdAt: string;
  mine: boolean;
  replies: Comment[];
}

export interface Order {
  id: number;
  courseTitle: string;
  courseSlug: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  status: OrderStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface PostCard {
  id: number;
  slug: string;
  type: PostType;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  authorName: string;
  publishedAt: string;
}

export interface PostDetail {
  post: PostCard;
  contentHtml: string;
}

export interface Video {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface DiscordStatus {
  name: string;
  onlineCount: number;
  inviteUrl: string;
}

export type SiteSettings = Record<string, string>;

// ---------------------------------------------------------------- Administración

export interface AdminLesson {
  id: number;
  title: string;
  youtubeVideoId: string | null;
  content: string;
  durationSeconds: number;
  freePreview: boolean;
  position: number;
}

export interface AdminQuestion {
  statement: string;
  options: { text: string; correct: boolean }[];
}

export interface AdminQuiz {
  id: number;
  title: string;
  passingScore: number;
  questions: AdminQuestion[];
}

export interface AdminModule {
  id: number;
  title: string;
  position: number;
  lessons: AdminLesson[];
  quiz: AdminQuiz | null;
}

export interface AdminCourse {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  categoryId: number;
  categoryName: string;
  level: Level;
  coverUrl: string | null;
  price: number;
  currency: string;
  status: CourseStatus;
  featured: boolean;
  modules: AdminModule[];
}

export interface AdminPath {
  id: number;
  slug: string;
  title: string;
  description: string;
  published: boolean;
  position: number;
  courseIds: number[];
}

export interface AdminPost {
  id: number;
  slug: string;
  type: PostType;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string | null;
  published: boolean;
  publishedAt: string | null;
}

export interface AdminOrder {
  order: Order;
  userId: number;
  userName: string;
  userEmail: string;
}

export interface AdminComment {
  id: number;
  authorName: string;
  authorEmail: string;
  body: string;
  hidden: boolean;
  createdAt: string;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
  lessonId: number;
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  enabled: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface DashboardStats {
  students: number;
  publishedCourses: number;
  enrollments: number;
  completedCourses: number;
  pendingOrders: number;
  revenue: number;
}

export const LEVEL_LABELS: Record<Level, string> = {
  BEGINNER: 'Básico',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};
