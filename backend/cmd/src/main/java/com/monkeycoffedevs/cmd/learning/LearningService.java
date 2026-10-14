package com.monkeycoffedevs.cmd.learning;

import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseCard;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.LessonRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.QuizRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogService;
import com.monkeycoffedevs.cmd.catalog.Course;
import com.monkeycoffedevs.cmd.catalog.Lesson;
import com.monkeycoffedevs.cmd.catalog.Quiz;
import com.monkeycoffedevs.cmd.catalog.QuizOption;
import com.monkeycoffedevs.cmd.catalog.QuizQuestion;
import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.Markdown;
import com.monkeycoffedevs.cmd.learning.LearningDtos.CertificateView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.LessonView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.MyCourse;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuestionResult;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizOptionView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizQuestionView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizResult;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizStatus;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.ViewerState;
import com.monkeycoffedevs.cmd.learning.LearningRepositories.CertificateRepository;
import com.monkeycoffedevs.cmd.learning.LearningRepositories.EnrollmentRepository;
import com.monkeycoffedevs.cmd.learning.LearningRepositories.LessonProgressRepository;
import com.monkeycoffedevs.cmd.learning.LearningRepositories.QuizAttemptRepository;
import com.monkeycoffedevs.cmd.user.AppPrincipal;
import com.monkeycoffedevs.cmd.user.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Inscripción, acceso a las clases, progreso, cuestionarios y emisión de certificados. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningService {

    /** Sin 0/O ni 1/I para que el código se pueda dictar o copiar a mano sin confusiones. */
    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int CODE_LENGTH = 10;

    private final CatalogService catalogService;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository progressRepository;
    private final QuizAttemptRepository attemptRepository;
    private final CertificateRepository certificateRepository;
    private final Markdown markdown;
    private final SecureRandom random = new SecureRandom();

    // ------------------------------------------------------------------ Inscripción

    @Transactional
    public ViewerState enrollFree(Long userId, String courseSlug) {
        Course course = catalogService.publishedCourse(courseSlug);
        if (!course.isFree()) {
            throw ApiException.badRequest("Este curso es de pago: completa la compra para acceder");
        }
        enroll(userId, course, Enrollment.Source.FREE);
        return state(userId, course);
    }

    /** Da acceso al curso. No hace nada si el usuario ya lo tenía. */
    @Transactional
    public Enrollment enroll(Long userId, Course course, Enrollment.Source source) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, course.getId()).orElseGet(() -> {
            Enrollment enrollment = new Enrollment();
            enrollment.setUser(userRepository.getReferenceById(userId));
            enrollment.setCourse(course);
            enrollment.setSource(source);
            return enrollmentRepository.save(enrollment);
        });
    }

    public boolean isEnrolled(Long userId, Long courseId) {
        return enrollmentRepository.existsByUserIdAndCourseId(userId, courseId);
    }

    // ------------------------------------------------------------------ Estado y contenido

    public ViewerState viewerState(AppPrincipal principal, String courseSlug) {
        if (principal == null) {
            return ViewerState.ANONYMOUS;
        }
        return state(principal.getId(), catalogService.publishedCourse(courseSlug));
    }

    public List<MyCourse> myCourses(Long userId) {
        List<Enrollment> enrollments = enrollmentRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<Long, CourseCard> cards = catalogService
                .cards(enrollments.stream().map(Enrollment::getCourse).toList()).stream()
                .collect(Collectors.toMap(CourseCard::id, Function.identity()));
        return enrollments.stream()
                .map(enrollment -> {
                    ViewerState state = state(userId, enrollment.getCourse());
                    return new MyCourse(cards.get(enrollment.getCourse().getId()), state.progressPercent(),
                            state.completed(), state.certificateCode(), enrollment.getCreatedAt());
                })
                .toList();
    }

    public LessonView lesson(AppPrincipal principal, String courseSlug, Long lessonId) {
        Course course = catalogService.publishedCourse(courseSlug);
        List<Lesson> lessons = lessonRepository.findByCourseInOrder(course.getId());
        int index = indexOf(lessons, lessonId);
        Lesson lesson = lessons.get(index);
        requireAccess(principal, lesson);

        boolean completed = principal != null
                && progressRepository.findByUserIdAndLessonId(principal.getId(), lessonId).isPresent();
        return new LessonView(lesson.getId(), lesson.getTitle(), lesson.getModule().getTitle(),
                lesson.getYoutubeVideoId(), markdown.toHtml(lesson.getContent()), lesson.getDurationSeconds(),
                completed,
                index > 0 ? lessons.get(index - 1).getId() : null,
                index < lessons.size() - 1 ? lessons.get(index + 1).getId() : null);
    }

    /**
     * Una clase la ve quien está inscrito, un administrador, o cualquiera si es de vista previa.
     * 401 pide iniciar sesión; 403 pide inscribirse.
     */
    public void requireAccess(AppPrincipal principal, Lesson lesson) {
        if (lesson.isFreePreview()) {
            return;
        }
        if (principal == null) {
            throw ApiException.unauthorized("Inicia sesión para ver esta clase");
        }
        if (!principal.isAdmin() && !isEnrolled(principal.getId(), lesson.getModule().getCourse().getId())) {
            throw ApiException.forbidden("Inscríbete en el curso para ver esta clase");
        }
    }

    // ------------------------------------------------------------------ Progreso

    @Transactional
    public ViewerState setLessonCompleted(Long userId, Long lessonId, boolean completed) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> ApiException.notFound("Clase no encontrada"));
        Course course = lesson.getModule().getCourse();
        Enrollment enrollment = requireEnrollment(userId, course);

        var existing = progressRepository.findByUserIdAndLessonId(userId, lessonId);
        if (completed && existing.isEmpty()) {
            LessonProgress progress = new LessonProgress();
            progress.setUserId(userId);
            progress.setLesson(lesson);
            progressRepository.saveAndFlush(progress);
        } else if (!completed && existing.isPresent()) {
            progressRepository.delete(existing.get());
            progressRepository.flush();
        }
        return completeIfDone(enrollment);
    }

    // ------------------------------------------------------------------ Cuestionarios

    public QuizView quiz(AppPrincipal principal, Long quizId) {
        Quiz quiz = getQuiz(quizId);
        if (!principal.isAdmin()) {
            requireEnrollment(principal.getId(), quiz.getModule().getCourse());
        }
        return new QuizView(quiz.getId(), quiz.getTitle(), quiz.getPassingScore(),
                quiz.getQuestions().stream()
                        .map(question -> new QuizQuestionView(question.getId(), question.getStatement(),
                                question.getOptions().stream()
                                        .map(option -> new QuizOptionView(option.getId(), option.getText()))
                                        .toList()))
                        .toList());
    }

    @Transactional
    public QuizResult submitQuiz(Long userId, Long quizId, Map<Long, Long> answers) {
        Quiz quiz = getQuiz(quizId);
        Enrollment enrollment = requireEnrollment(userId, quiz.getModule().getCourse());

        List<QuestionResult> results = new ArrayList<>();
        int correctCount = 0;
        for (QuizQuestion question : quiz.getQuestions()) {
            Long correctOptionId = question.getOptions().stream()
                    .filter(QuizOption::isCorrect)
                    .map(QuizOption::getId)
                    .findFirst()
                    .orElse(null);
            boolean correct = correctOptionId != null && correctOptionId.equals(answers.get(question.getId()));
            if (correct) {
                correctCount++;
            }
            results.add(new QuestionResult(question.getId(), correct, correctOptionId));
        }
        int score = quiz.getQuestions().isEmpty() ? 0 : Math.round(correctCount * 100f / quiz.getQuestions().size());
        boolean passed = score >= quiz.getPassingScore();

        QuizAttempt attempt = new QuizAttempt();
        attempt.setUserId(userId);
        attempt.setQuiz(quiz);
        attempt.setScore(score);
        attempt.setPassed(passed);
        attemptRepository.saveAndFlush(attempt);

        return new QuizResult(score, passed, quiz.getPassingScore(), results, completeIfDone(enrollment));
    }

    // ------------------------------------------------------------------ Certificados

    public List<CertificateView> myCertificates(Long userId) {
        return certificateRepository.findByEnrollmentUserIdOrderByIssuedAtDesc(userId).stream()
                .map(CertificateView::from)
                .toList();
    }

    public CertificateView certificate(String code) {
        return certificateRepository.findByCode(code.trim().toUpperCase())
                .map(CertificateView::from)
                .orElseThrow(() -> ApiException.notFound("No existe un certificado con ese código"));
    }

    // ------------------------------------------------------------------ Auxiliares

    /** Marca el curso como completado y emite el certificado la primera vez que se cumple todo. */
    private ViewerState completeIfDone(Enrollment enrollment) {
        Long userId = enrollment.getUser().getId();
        ViewerState state = state(userId, enrollment.getCourse());
        if (state.progressPercent() == 100 && enrollment.getCompletedAt() == null) {
            enrollment.setCompletedAt(Instant.now());
            Certificate certificate = new Certificate();
            certificate.setEnrollment(enrollment);
            certificate.setCode(newCertificateCode());
            certificateRepository.saveAndFlush(certificate);
            return state(userId, enrollment.getCourse());
        }
        return state;
    }

    private ViewerState state(Long userId, Course course) {
        var enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, course.getId());
        if (enrollment.isEmpty()) {
            return ViewerState.ANONYMOUS;
        }
        Set<Long> lessonIds = lessonRepository.findByCourseInOrder(course.getId()).stream()
                .map(Lesson::getId).collect(Collectors.toSet());
        // Solo cuentan las clases que siguen existiendo en el temario.
        List<Long> completed = progressRepository.findCompletedLessonIds(userId, course.getId()).stream()
                .filter(lessonIds::contains).toList();

        List<Quiz> quizzes = quizRepository.findByCourseId(course.getId());
        Map<Long, List<QuizAttempt>> attempts = attemptRepository.findByUserAndCourse(userId, course.getId()).stream()
                .collect(Collectors.groupingBy(attempt -> attempt.getQuiz().getId()));
        List<QuizStatus> quizStatuses = quizzes.stream()
                .map(quiz -> {
                    List<QuizAttempt> own = attempts.getOrDefault(quiz.getId(), List.of());
                    return new QuizStatus(quiz.getId(),
                            own.stream().mapToInt(QuizAttempt::getScore).max().orElse(0),
                            own.stream().anyMatch(QuizAttempt::isPassed), own.size());
                })
                .toList();

        int total = lessonIds.size() + quizzes.size();
        long done = completed.size() + quizStatuses.stream().filter(QuizStatus::passed).count();
        int percent = total == 0 ? 0 : (int) (done * 100 / total);
        String certificateCode = certificateRepository.findByEnrollmentId(enrollment.get().getId())
                .map(Certificate::getCode).orElse(null);
        return new ViewerState(true, completed, quizStatuses, percent,
                enrollment.get().getCompletedAt() != null, certificateCode);
    }

    private Enrollment requireEnrollment(Long userId, Course course) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, course.getId())
                .orElseThrow(() -> ApiException.forbidden("Inscríbete en el curso para continuar"));
    }

    private Quiz getQuiz(Long quizId) {
        return quizRepository.findById(quizId).orElseThrow(() -> ApiException.notFound("Cuestionario no encontrado"));
    }

    private static int indexOf(List<Lesson> lessons, Long lessonId) {
        for (int i = 0; i < lessons.size(); i++) {
            if (lessons.get(i).getId().equals(lessonId)) {
                return i;
            }
        }
        throw ApiException.notFound("Clase no encontrada");
    }

    private String newCertificateCode() {
        Set<String> tried = new HashSet<>();
        while (true) {
            StringBuilder code = new StringBuilder("CMD-");
            for (int i = 0; i < CODE_LENGTH; i++) {
                code.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
            }
            if (tried.add(code.toString()) && !certificateRepository.existsByCode(code.toString())) {
                return code.toString();
            }
        }
    }
}
