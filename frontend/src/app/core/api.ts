import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminComment,
  AdminCourse,
  AdminLesson,
  AdminModule,
  AdminOrder,
  AdminPath,
  AdminPost,
  AdminQuiz,
  AdminUser,
  Category,
  CertificateView,
  Comment,
  CourseCard,
  CourseDetail,
  DashboardStats,
  DiscordStatus,
  LessonView,
  MyCourse,
  Order,
  OrderStatus,
  Page,
  PathCard,
  PathDetail,
  PaymentMethod,
  PostCard,
  PostDetail,
  PostType,
  QuizResult,
  QuizView,
  Role,
  SiteSettings,
  Video,
  ViewerState,
} from './models';

/** Quita los filtros vacíos para no enviar parámetros en blanco. */
function params(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let result = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') {
      result = result.set(key, String(value));
    }
  }
  return result;
}

export interface CourseFilters {
  category?: string;
  level?: string;
  free?: boolean | null;
  q?: string;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  courses(filters: CourseFilters = {}): Observable<Page<CourseCard>> {
    return this.http.get<Page<CourseCard>>('/api/courses', { params: params({ ...filters }) });
  }

  featured(): Observable<CourseCard[]> {
    return this.http.get<CourseCard[]>('/api/courses/featured');
  }

  course(slug: string): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`/api/courses/${slug}`);
  }

  paths(): Observable<PathCard[]> {
    return this.http.get<PathCard[]>('/api/paths');
  }

  path(slug: string): Observable<PathDetail> {
    return this.http.get<PathDetail>(`/api/paths/${slug}`);
  }
}

@Injectable({ providedIn: 'root' })
export class LearningApi {
  private readonly http = inject(HttpClient);

  state(slug: string): Observable<ViewerState> {
    return this.http.get<ViewerState>(`/api/courses/${slug}/state`);
  }

  enroll(slug: string): Observable<ViewerState> {
    return this.http.post<ViewerState>(`/api/courses/${slug}/enroll`, {});
  }

  lesson(slug: string, lessonId: number): Observable<LessonView> {
    return this.http.get<LessonView>(`/api/courses/${slug}/lessons/${lessonId}`);
  }

  setCompleted(lessonId: number, completed: boolean): Observable<ViewerState> {
    return this.http.put<ViewerState>(`/api/lessons/${lessonId}/completion`, { completed });
  }

  myCourses(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>('/api/me/courses');
  }

  myCertificates(): Observable<CertificateView[]> {
    return this.http.get<CertificateView[]>('/api/me/certificates');
  }

  certificate(code: string): Observable<CertificateView> {
    return this.http.get<CertificateView>(`/api/certificates/${code}`);
  }

  quiz(quizId: number): Observable<QuizView> {
    return this.http.get<QuizView>(`/api/quizzes/${quizId}`);
  }

  submitQuiz(quizId: number, answers: Record<number, number>): Observable<QuizResult> {
    return this.http.post<QuizResult>(`/api/quizzes/${quizId}/attempts`, { answers });
  }

  comments(slug: string, lessonId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/courses/${slug}/lessons/${lessonId}/comments`);
  }

  addComment(lessonId: number, body: string, parentId: number | null): Observable<Comment> {
    return this.http.post<Comment>(`/api/lessons/${lessonId}/comments`, { body, parentId });
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`/api/comments/${commentId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);

  createOrder(courseSlug: string, paymentMethod: PaymentMethod, paymentReference: string): Observable<Order> {
    return this.http.post<Order>('/api/orders', { courseSlug, paymentMethod, paymentReference });
  }

  myOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/api/me/orders');
  }
}

@Injectable({ providedIn: 'root' })
export class ContentApi {
  private readonly http = inject(HttpClient);

  posts(type: PostType | null, page = 0, size = 9): Observable<Page<PostCard>> {
    return this.http.get<Page<PostCard>>('/api/posts', { params: params({ type, page, size }) });
  }

  post(slug: string): Observable<PostDetail> {
    return this.http.get<PostDetail>(`/api/posts/${slug}`);
  }

  settings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>('/api/site/settings');
  }

  videos(): Observable<Video[]> {
    return this.http.get<Video[]>('/api/site/videos');
  }

  /** Nulo cuando el servidor de Discord no está configurado o su widget está apagado. */
  discord(): Observable<DiscordStatus | null> {
    return this.http.get<DiscordStatus | null>('/api/site/discord');
  }
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);

  stats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/api/admin/stats');
  }

  // Categorías
  saveCategory(id: number | null, body: unknown): Observable<Category> {
    return this.save<Category>('/api/admin/categories', id, body);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/categories/${id}`);
  }

  // Cursos y temario
  courses(): Observable<AdminCourse[]> {
    return this.http.get<AdminCourse[]>('/api/admin/courses');
  }

  course(id: number): Observable<AdminCourse> {
    return this.http.get<AdminCourse>(`/api/admin/courses/${id}`);
  }

  saveCourse(id: number | null, body: unknown): Observable<AdminCourse> {
    return this.save<AdminCourse>('/api/admin/courses', id, body);
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/courses/${id}`);
  }

  saveModule(courseId: number, id: number | null, body: unknown): Observable<AdminModule> {
    return id === null
      ? this.http.post<AdminModule>(`/api/admin/courses/${courseId}/modules`, body)
      : this.http.put<AdminModule>(`/api/admin/modules/${id}`, body);
  }

  deleteModule(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/modules/${id}`);
  }

  saveLesson(moduleId: number, id: number | null, body: unknown): Observable<AdminLesson> {
    return id === null
      ? this.http.post<AdminLesson>(`/api/admin/modules/${moduleId}/lessons`, body)
      : this.http.put<AdminLesson>(`/api/admin/lessons/${id}`, body);
  }

  deleteLesson(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/lessons/${id}`);
  }

  saveQuiz(moduleId: number, body: unknown): Observable<AdminQuiz> {
    return this.http.put<AdminQuiz>(`/api/admin/modules/${moduleId}/quiz`, body);
  }

  deleteQuiz(moduleId: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/modules/${moduleId}/quiz`);
  }

  // Rutas
  paths(): Observable<AdminPath[]> {
    return this.http.get<AdminPath[]>('/api/admin/paths');
  }

  savePath(id: number | null, body: unknown): Observable<AdminPath> {
    return this.save<AdminPath>('/api/admin/paths', id, body);
  }

  deletePath(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/paths/${id}`);
  }

  // Publicaciones
  posts(page = 0): Observable<Page<AdminPost>> {
    return this.http.get<Page<AdminPost>>('/api/admin/posts', { params: params({ page }) });
  }

  savePost(id: number | null, body: unknown): Observable<AdminPost> {
    return this.save<AdminPost>('/api/admin/posts', id, body);
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/posts/${id}`);
  }

  // Órdenes
  orders(status: OrderStatus, page = 0): Observable<Page<AdminOrder>> {
    return this.http.get<Page<AdminOrder>>('/api/admin/orders', { params: params({ status, page }) });
  }

  reviewOrder(id: number, approve: boolean, note: string): Observable<AdminOrder> {
    return this.http.put<AdminOrder>(`/api/admin/orders/${id}/review`, { approve, note });
  }

  // Comentarios
  comments(page = 0): Observable<Page<AdminComment>> {
    return this.http.get<Page<AdminComment>>('/api/admin/comments', { params: params({ page }) });
  }

  setCommentHidden(id: number, hidden: boolean): Observable<void> {
    return this.http.put<void>(`/api/admin/comments/${id}/hidden`, { hidden });
  }

  // Usuarios
  users(q: string, page = 0): Observable<Page<AdminUser>> {
    return this.http.get<Page<AdminUser>>('/api/admin/users', { params: params({ q, page }) });
  }

  updateUser(id: number, role: Role, enabled: boolean): Observable<AdminUser> {
    return this.http.put<AdminUser>(`/api/admin/users/${id}`, { role, enabled });
  }

  grantCourse(userId: number, courseId: number): Observable<void> {
    return this.http.post<void>(`/api/admin/users/${userId}/enrollments/${courseId}`, {});
  }

  // Ajustes
  saveSettings(values: SiteSettings): Observable<SiteSettings> {
    return this.http.put<SiteSettings>('/api/admin/settings', values);
  }

  private save<T>(base: string, id: number | null, body: unknown): Observable<T> {
    return id === null ? this.http.post<T>(base, body) : this.http.put<T>(`${base}/${id}`, body);
  }
}
