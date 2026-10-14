package com.monkeycoffedevs.cmd.catalog;

import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CategoryDto;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseCard;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseDetail;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.LessonItem;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.ModuleDto;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.PathCard;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.PathDetail;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.QuizRef;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CategoryRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CourseModuleRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CourseRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.LearningPathRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.LessonRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.QuizRepository;
import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.Markdown;
import com.monkeycoffedevs.cmd.common.PageResponse;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lectura pública del catálogo: solo expone cursos publicados y rutas visibles. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;
    private final LearningPathRepository pathRepository;
    private final Markdown markdown;

    public List<CategoryDto> categories() {
        return categoryRepository.findAllByOrderByPositionAscNameAsc().stream().map(CategoryDto::from).toList();
    }

    public PageResponse<CourseCard> searchCourses(String categorySlug, Course.Level level, Boolean free,
                                                  String query, Pageable pageable) {
        String pattern = "%" + (query == null ? "" : query.trim().toLowerCase(Locale.ROOT)) + "%";
        String category = categorySlug == null || categorySlug.isBlank() ? null : categorySlug;
        Page<Course> page = courseRepository.searchPublished(category, level, free, pattern, pageable);
        return PageResponse.of(page, cards(page.getContent()));
    }

    public List<CourseCard> featuredCourses() {
        return cards(courseRepository.findTop6ByStatusAndFeaturedTrueOrderByPublishedAtDesc(Course.Status.PUBLISHED));
    }

    public CourseDetail courseDetail(String slug) {
        Course course = publishedCourse(slug);
        return new CourseDetail(cards(List.of(course)).get(0), markdown.toHtml(course.getDescription()),
                syllabus(course.getId()));
    }

    /** Curso publicado por slug; 404 si no existe o aún es borrador. */
    public Course publishedCourse(String slug) {
        return courseRepository.findBySlug(slug)
                .filter(Course::isPublished)
                .orElseThrow(() -> ApiException.notFound("Curso no encontrado"));
    }

    public List<ModuleDto> syllabus(Long courseId) {
        Map<Long, List<Lesson>> lessonsByModule = lessonRepository.findByCourseInOrder(courseId).stream()
                .collect(Collectors.groupingBy(lesson -> lesson.getModule().getId()));
        Map<Long, Quiz> quizByModule = quizRepository.findByCourseId(courseId).stream()
                .collect(Collectors.toMap(quiz -> quiz.getModule().getId(), Function.identity()));
        return moduleRepository.findByCourseIdOrderByPositionAscIdAsc(courseId).stream()
                .map(module -> {
                    Quiz quiz = quizByModule.get(module.getId());
                    return new ModuleDto(module.getId(), module.getTitle(),
                            lessonsByModule.getOrDefault(module.getId(), List.of()).stream()
                                    .map(LessonItem::from).toList(),
                            quiz == null ? null : new QuizRef(quiz.getId(), quiz.getTitle(),
                                    quiz.getQuestions().size(), quiz.getPassingScore()));
                })
                .toList();
    }

    public List<PathCard> paths() {
        return pathRepository.findByPublishedTrueOrderByPositionAscTitleAsc().stream()
                .map(path -> new PathCard(path.getId(), path.getSlug(), path.getTitle(), path.getDescription(),
                        (int) path.getCourses().stream().filter(Course::isPublished).count()))
                .toList();
    }

    public PathDetail pathDetail(String slug) {
        LearningPath path = pathRepository.findBySlug(slug)
                .filter(LearningPath::isPublished)
                .orElseThrow(() -> ApiException.notFound("Ruta no encontrada"));
        List<Course> courses = path.getCourses().stream().filter(Course::isPublished).toList();
        return new PathDetail(path.getId(), path.getSlug(), path.getTitle(), path.getDescription(), cards(courses));
    }

    /** Convierte cursos en tarjetas con una sola consulta de totales para todos. */
    public List<CourseCard> cards(Collection<Course> courses) {
        if (courses.isEmpty()) {
            return List.of();
        }
        Map<Long, CourseStats> stats = lessonRepository
                .statsByCourseIds(courses.stream().map(Course::getId).toList()).stream()
                .collect(Collectors.toMap(CourseStats::courseId, Function.identity()));
        return courses.stream()
                .map(course -> CourseCard.from(course, stats.getOrDefault(course.getId(), CourseStats.EMPTY)))
                .toList();
    }
}
