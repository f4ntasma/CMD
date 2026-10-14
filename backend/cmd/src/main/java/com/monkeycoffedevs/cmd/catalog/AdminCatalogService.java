package com.monkeycoffedevs.cmd.catalog;

import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminCourse;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminLesson;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminModule;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminPath;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminQuiz;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CategoryDto;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CategoryRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.LessonRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.ModuleRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.OptionRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.PathRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.QuestionRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.QuizRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CategoryRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CourseModuleRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CourseRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.LearningPathRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.LessonRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.QuizRepository;
import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.Slugs;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Escritura del catálogo desde el panel de administración. */
@Service
@RequiredArgsConstructor
@Transactional
public class AdminCatalogService {

    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;
    private final LearningPathRepository pathRepository;

    // ------------------------------------------------------------------ Categorías

    public CategoryDto saveCategory(Long id, CategoryRequest request) {
        String slug = slugOrFrom(request.slug(), request.name());
        boolean taken = id == null ? categoryRepository.existsBySlug(slug)
                : categoryRepository.existsBySlugAndIdNot(slug, id);
        if (taken) {
            throw ApiException.conflict("Ya existe una categoría con la dirección '" + slug + "'");
        }
        Category category = id == null ? new Category() : category(id);
        category.setSlug(slug);
        category.setName(request.name().trim());
        category.setDescription(request.description());
        category.setColor(request.color().toUpperCase());
        category.setPosition(request.position());
        return CategoryDto.from(categoryRepository.save(category));
    }

    public void deleteCategory(Long id) {
        if (courseRepository.existsByCategoryId(id)) {
            throw ApiException.conflict("La categoría tiene cursos. Muévelos a otra antes de borrarla.");
        }
        categoryRepository.delete(category(id));
    }

    // ------------------------------------------------------------------ Cursos

    @Transactional(readOnly = true)
    public List<AdminCourse> courses() {
        return courseRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(course -> toAdmin(course, List.of()))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminCourse course(Long id) {
        Course course = getCourse(id);
        Map<Long, List<Lesson>> lessonsByModule = lessonRepository.findByCourseInOrder(id).stream()
                .collect(Collectors.groupingBy(lesson -> lesson.getModule().getId()));
        Map<Long, Quiz> quizByModule = quizRepository.findByCourseId(id).stream()
                .collect(Collectors.toMap(quiz -> quiz.getModule().getId(), Function.identity()));
        List<AdminModule> modules = moduleRepository.findByCourseIdOrderByPositionAscIdAsc(id).stream()
                .map(module -> new AdminModule(module.getId(), module.getTitle(), module.getPosition(),
                        lessonsByModule.getOrDefault(module.getId(), List.of()).stream()
                                .map(AdminLesson::from).toList(),
                        quizByModule.containsKey(module.getId())
                                ? AdminQuiz.from(quizByModule.get(module.getId())) : null))
                .toList();
        return toAdmin(course, modules);
    }

    public AdminCourse saveCourse(Long id, CourseRequest request) {
        String slug = slugOrFrom(request.slug(), request.title());
        boolean taken = id == null ? courseRepository.existsBySlug(slug)
                : courseRepository.existsBySlugAndIdNot(slug, id);
        if (taken) {
            throw ApiException.conflict("Ya existe un curso con la dirección '" + slug + "'");
        }
        Course course = id == null ? new Course() : getCourse(id);
        course.setSlug(slug);
        course.setTitle(request.title().trim());
        course.setSummary(request.summary().trim());
        course.setDescription(request.description());
        course.setCategory(category(request.categoryId()));
        course.setLevel(request.level());
        course.setCoverUrl(blankToNull(request.coverUrl()));
        course.setPrice(request.price());
        course.setFeatured(request.featured());
        if (request.status() == Course.Status.PUBLISHED) {
            if (course.getId() == null || lessonRepository.countByCourseId(course.getId()) == 0) {
                throw ApiException.badRequest("Un curso necesita al menos una clase para publicarse");
            }
            if (course.getPublishedAt() == null) {
                course.setPublishedAt(Instant.now());
            }
        }
        course.setStatus(request.status());
        courseRepository.save(course);
        return course.getId() != null && id != null ? course(id) : toAdmin(course, List.of());
    }

    public void deleteCourse(Long id) {
        // La base rechaza el borrado si hay inscripciones u órdenes: en ese caso corresponde archivarlo.
        courseRepository.delete(getCourse(id));
        courseRepository.flush();
    }

    // ------------------------------------------------------------------ Módulos y clases

    public AdminModule addModule(Long courseId, ModuleRequest request) {
        CourseModule module = new CourseModule();
        module.setCourse(getCourse(courseId));
        return saveModule(module, request);
    }

    public AdminModule updateModule(Long moduleId, ModuleRequest request) {
        return saveModule(module(moduleId), request);
    }

    public void deleteModule(Long moduleId) {
        moduleRepository.delete(module(moduleId));
    }

    public AdminLesson addLesson(Long moduleId, LessonRequest request) {
        Lesson lesson = new Lesson();
        lesson.setModule(module(moduleId));
        return saveLesson(lesson, request);
    }

    public AdminLesson updateLesson(Long lessonId, LessonRequest request) {
        return saveLesson(lesson(lessonId), request);
    }

    public void deleteLesson(Long lessonId) {
        lessonRepository.delete(lesson(lessonId));
    }

    // ------------------------------------------------------------------ Cuestionarios

    /** Crea o reemplaza el cuestionario del módulo con las preguntas recibidas. */
    public AdminQuiz saveQuiz(Long moduleId, QuizRequest request) {
        for (QuestionRequest question : request.questions()) {
            long correct = question.options().stream().filter(OptionRequest::correct).count();
            if (correct != 1) {
                throw ApiException.badRequest("Cada pregunta debe tener exactamente una opción correcta: \""
                        + question.statement() + "\"");
            }
        }
        Quiz quiz = quizRepository.findByModuleId(moduleId).orElseGet(() -> {
            Quiz created = new Quiz();
            created.setModule(module(moduleId));
            return created;
        });
        quiz.setTitle(request.title().trim());
        quiz.setPassingScore(request.passingScore());
        quiz.getQuestions().clear();
        // Las filas antiguas deben salir antes de insertar las nuevas.
        quizRepository.saveAndFlush(quiz);

        int questionPosition = 0;
        for (QuestionRequest questionRequest : request.questions()) {
            QuizQuestion question = new QuizQuestion();
            question.setQuiz(quiz);
            question.setStatement(questionRequest.statement().trim());
            question.setPosition(questionPosition++);
            int optionPosition = 0;
            for (OptionRequest optionRequest : questionRequest.options()) {
                QuizOption option = new QuizOption();
                option.setQuestion(question);
                option.setText(optionRequest.text().trim());
                option.setCorrect(optionRequest.correct());
                option.setPosition(optionPosition++);
                question.getOptions().add(option);
            }
            quiz.getQuestions().add(question);
        }
        return AdminQuiz.from(quizRepository.save(quiz));
    }

    public void deleteQuiz(Long moduleId) {
        quizRepository.findByModuleId(moduleId).ifPresent(quizRepository::delete);
    }

    // ------------------------------------------------------------------ Rutas

    @Transactional(readOnly = true)
    public List<AdminPath> paths() {
        return pathRepository.findAllByOrderByPositionAscTitleAsc().stream().map(AdminPath::from).toList();
    }

    public AdminPath savePath(Long id, PathRequest request) {
        String slug = slugOrFrom(request.slug(), request.title());
        boolean taken = id == null ? pathRepository.existsBySlug(slug)
                : pathRepository.existsBySlugAndIdNot(slug, id);
        if (taken) {
            throw ApiException.conflict("Ya existe una ruta con la dirección '" + slug + "'");
        }
        LearningPath path = id == null ? new LearningPath() : path(id);
        path.setSlug(slug);
        path.setTitle(request.title().trim());
        path.setDescription(request.description());
        path.setPublished(request.published());
        path.setPosition(request.position());
        path.getCourses().clear();
        // LinkedHashSet: conserva el orden recibido y descarta un curso repetido.
        for (Long courseId : new LinkedHashSet<>(request.courseIds())) {
            path.getCourses().add(getCourse(courseId));
        }
        return AdminPath.from(pathRepository.save(path));
    }

    public void deletePath(Long id) {
        pathRepository.delete(path(id));
    }

    // ------------------------------------------------------------------ Auxiliares

    private AdminModule saveModule(CourseModule module, ModuleRequest request) {
        module.setTitle(request.title().trim());
        module.setPosition(request.position());
        moduleRepository.save(module);
        return new AdminModule(module.getId(), module.getTitle(), module.getPosition(), List.of(), null);
    }

    private AdminLesson saveLesson(Lesson lesson, LessonRequest request) {
        String videoId = YouTubeIds.extract(request.youtubeVideo());
        if (videoId == null && request.content().isBlank()) {
            throw ApiException.badRequest("La clase necesita un video de YouTube, un texto, o ambos");
        }
        lesson.setTitle(request.title().trim());
        lesson.setYoutubeVideoId(videoId);
        lesson.setContent(request.content());
        lesson.setDurationSeconds(request.durationSeconds());
        lesson.setFreePreview(request.freePreview());
        lesson.setPosition(request.position());
        return AdminLesson.from(lessonRepository.save(lesson));
    }

    private static AdminCourse toAdmin(Course course, List<AdminModule> modules) {
        return new AdminCourse(course.getId(), course.getSlug(), course.getTitle(), course.getSummary(),
                course.getDescription(), course.getCategory().getId(), course.getCategory().getName(),
                course.getLevel(), course.getCoverUrl(), course.getPrice(), course.getCurrency(),
                course.getStatus(), course.isFeatured(), modules);
    }

    private static String slugOrFrom(String slug, String title) {
        String result = slug == null || slug.isBlank() ? Slugs.slugify(title) : slug.trim();
        if (result.isEmpty()) {
            throw ApiException.badRequest("No se pudo generar una dirección a partir del título");
        }
        return result;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Category category(Long id) {
        return categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("Categoría no encontrada"));
    }

    private Course getCourse(Long id) {
        return courseRepository.findById(id).orElseThrow(() -> ApiException.notFound("Curso no encontrado"));
    }

    private CourseModule module(Long id) {
        return moduleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Módulo no encontrado"));
    }

    private Lesson lesson(Long id) {
        return lessonRepository.findById(id).orElseThrow(() -> ApiException.notFound("Clase no encontrada"));
    }

    private LearningPath path(Long id) {
        return pathRepository.findById(id).orElseThrow(() -> ApiException.notFound("Ruta no encontrada"));
    }
}
