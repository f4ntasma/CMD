package com.monkeycoffedevs.cmd.learning;

import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseCard;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class LearningDtos {

    private LearningDtos() {
    }

    public record QuizStatus(Long quizId, int bestScore, boolean passed, int attempts) {
    }

    /** Situación del usuario en un curso. Para un visitante sin sesión, todo vacío y {@code enrolled=false}. */
    public record ViewerState(boolean enrolled, List<Long> completedLessonIds, List<QuizStatus> quizzes,
                              int progressPercent, boolean completed, String certificateCode) {

        static final ViewerState ANONYMOUS = new ViewerState(false, List.of(), List.of(), 0, false, null);
    }

    public record LessonView(Long id, String title, String moduleTitle, String youtubeVideoId, String contentHtml,
                             int durationSeconds, boolean completed, Long previousLessonId, Long nextLessonId) {
    }

    public record CompletionRequest(boolean completed) {
    }

    public record MyCourse(CourseCard course, int progressPercent, boolean completed, String certificateCode,
                           Instant enrolledAt) {
    }

    // ------------------------------------------------------------------ Cuestionarios

    public record QuizOptionView(Long id, String text) {
    }

    public record QuizQuestionView(Long id, String statement, List<QuizOptionView> options) {
    }

    /** Cuestionario tal como lo ve el estudiante: sin indicar cuál es la opción correcta. */
    public record QuizView(Long id, String title, int passingScore, List<QuizQuestionView> questions) {
    }

    /** Respuestas: id de pregunta → id de la opción elegida. */
    public record QuizSubmission(@NotNull Map<Long, Long> answers) {
    }

    public record QuestionResult(Long questionId, boolean correct, Long correctOptionId) {
    }

    public record QuizResult(int score, boolean passed, int passingScore, List<QuestionResult> results,
                             ViewerState state) {
    }

    // ------------------------------------------------------------------ Certificados

    public record CertificateView(String code, String studentName, String courseTitle, String courseSlug,
                                  Instant issuedAt) {

        static CertificateView from(Certificate certificate) {
            Enrollment enrollment = certificate.getEnrollment();
            return new CertificateView(certificate.getCode(), enrollment.getUser().getDisplayName(),
                    enrollment.getCourse().getTitle(), enrollment.getCourse().getSlug(), certificate.getIssuedAt());
        }
    }

    // ------------------------------------------------------------------ Comentarios

    public record CommentRequest(@NotBlank @Size(max = 2000) String body, Long parentId) {
    }

    public record CommentDto(Long id, String authorName, String authorAvatarUrl, boolean authorIsAdmin, String body,
                             Instant createdAt, boolean mine, List<CommentDto> replies) {
    }

    public record AdminComment(Long id, String authorName, String authorEmail, String body, boolean hidden,
                               Instant createdAt, String lessonTitle, String courseTitle, String courseSlug,
                               Long lessonId) {
    }

    public record HiddenRequest(boolean hidden) {
    }
}
