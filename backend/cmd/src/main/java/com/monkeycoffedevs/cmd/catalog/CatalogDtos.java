package com.monkeycoffedevs.cmd.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/** Formas de entrada y salida de la API del catálogo. */
public final class CatalogDtos {

    private static final String HTTPS_URL = "^$|^https://.+";
    private static final String SLUG = "^$|^[a-z0-9]+(-[a-z0-9]+)*$";

    private CatalogDtos() {
    }

    // ------------------------------------------------------------------ Lectura pública

    public record CategoryDto(Long id, String slug, String name, String description, String color, int position) {

        static CategoryDto from(Category category) {
            return new CategoryDto(category.getId(), category.getSlug(), category.getName(),
                    category.getDescription(), category.getColor(), category.getPosition());
        }
    }

    public record CourseCard(Long id, String slug, String title, String summary, CategoryDto category,
                             Course.Level level, String coverUrl, BigDecimal price, String currency, boolean free,
                             boolean featured, long lessonCount, long durationSeconds) {

        static CourseCard from(Course course, CourseStats stats) {
            return new CourseCard(course.getId(), course.getSlug(), course.getTitle(), course.getSummary(),
                    CategoryDto.from(course.getCategory()), course.getLevel(), course.getCoverUrl(),
                    course.getPrice(), course.getCurrency(), course.isFree(), course.isFeatured(),
                    stats.lessonCount(), stats.durationSeconds());
        }
    }

    public record LessonItem(Long id, String title, int durationSeconds, boolean freePreview, boolean hasVideo) {

        static LessonItem from(Lesson lesson) {
            return new LessonItem(lesson.getId(), lesson.getTitle(), lesson.getDurationSeconds(),
                    lesson.isFreePreview(), lesson.getYoutubeVideoId() != null);
        }
    }

    public record QuizRef(Long id, String title, int questionCount, int passingScore) {
    }

    public record ModuleDto(Long id, String title, List<LessonItem> lessons, QuizRef quiz) {
    }

    public record CourseDetail(CourseCard course, String descriptionHtml, List<ModuleDto> modules) {
    }

    public record PathCard(Long id, String slug, String title, String description, int courseCount) {
    }

    public record PathDetail(Long id, String slug, String title, String description, List<CourseCard> courses) {
    }

    // ------------------------------------------------------------------ Administración

    public record CategoryRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 80) @Pattern(regexp = SLUG, message = "solo minúsculas, números y guiones") String slug,
            @Size(max = 300) String description,
            @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "debe ser un color #RRGGBB") String color,
            int position) {
    }

    public record CourseRequest(
            @NotBlank @Size(max = 150) String title,
            @Size(max = 120) @Pattern(regexp = SLUG, message = "solo minúsculas, números y guiones") String slug,
            @NotBlank @Size(max = 300) String summary,
            @NotNull @Size(max = 50_000) String description,
            @NotNull Long categoryId,
            @NotNull Course.Level level,
            @Size(max = 500) @Pattern(regexp = HTTPS_URL, message = "debe empezar por https://") String coverUrl,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal price,
            @NotNull Course.Status status,
            boolean featured) {
    }

    public record ModuleRequest(@NotBlank @Size(max = 150) String title, int position) {
    }

    public record LessonRequest(
            @NotBlank @Size(max = 150) String title,
            /* Se acepta el id o cualquier URL de YouTube; el servicio se queda con el id. */
            @Size(max = 200) String youtubeVideo,
            @NotNull @Size(max = 100_000) String content,
            @Min(0) @Max(86_400) int durationSeconds,
            boolean freePreview,
            int position) {
    }

    public record OptionRequest(@NotBlank @Size(max = 300) String text, boolean correct) {
    }

    public record QuestionRequest(
            @NotBlank @Size(max = 500) String statement,
            @NotEmpty @Size(min = 2, max = 6, message = "debe tener entre 2 y 6 opciones") @Valid
            List<OptionRequest> options) {
    }

    public record QuizRequest(
            @NotBlank @Size(max = 150) String title,
            @Min(1) @Max(100) int passingScore,
            @NotEmpty @Size(max = 50) @Valid List<QuestionRequest> questions) {
    }

    public record PathRequest(
            @NotBlank @Size(max = 150) String title,
            @Size(max = 120) @Pattern(regexp = SLUG, message = "solo minúsculas, números y guiones") String slug,
            @NotNull @Size(max = 600) String description,
            boolean published,
            int position,
            @NotNull List<Long> courseIds) {
    }

    public record AdminLesson(Long id, String title, String youtubeVideoId, String content, int durationSeconds,
                              boolean freePreview, int position) {

        static AdminLesson from(Lesson lesson) {
            return new AdminLesson(lesson.getId(), lesson.getTitle(), lesson.getYoutubeVideoId(),
                    lesson.getContent(), lesson.getDurationSeconds(), lesson.isFreePreview(), lesson.getPosition());
        }
    }

    public record AdminOption(String text, boolean correct) {
    }

    public record AdminQuestion(String statement, List<AdminOption> options) {
    }

    public record AdminQuiz(Long id, String title, int passingScore, List<AdminQuestion> questions) {

        static AdminQuiz from(Quiz quiz) {
            return new AdminQuiz(quiz.getId(), quiz.getTitle(), quiz.getPassingScore(),
                    quiz.getQuestions().stream()
                            .map(question -> new AdminQuestion(question.getStatement(),
                                    question.getOptions().stream()
                                            .map(option -> new AdminOption(option.getText(), option.isCorrect()))
                                            .toList()))
                            .toList());
        }
    }

    public record AdminModule(Long id, String title, int position, List<AdminLesson> lessons, AdminQuiz quiz) {
    }

    /** Curso completo tal como lo edita el panel: campos en crudo (Markdown) y todo el temario. */
    public record AdminCourse(Long id, String slug, String title, String summary, String description,
                              Long categoryId, String categoryName, Course.Level level, String coverUrl,
                              BigDecimal price, String currency, Course.Status status, boolean featured,
                              List<AdminModule> modules) {
    }

    public record AdminPath(Long id, String slug, String title, String description, boolean published,
                            int position, List<Long> courseIds) {

        static AdminPath from(LearningPath path) {
            return new AdminPath(path.getId(), path.getSlug(), path.getTitle(), path.getDescription(),
                    path.isPublished(), path.getPosition(), path.getCourses().stream().map(Course::getId).toList());
        }
    }
}
