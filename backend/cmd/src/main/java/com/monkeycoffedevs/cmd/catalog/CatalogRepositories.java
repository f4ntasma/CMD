package com.monkeycoffedevs.cmd.catalog;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repositorios del catálogo. Se agrupan en un archivo porque son interfaces de pocas líneas. */
public final class CatalogRepositories {

    private CatalogRepositories() {
    }

    public interface CategoryRepository extends JpaRepository<Category, Long> {

        List<Category> findAllByOrderByPositionAscNameAsc();

        boolean existsBySlug(String slug);

        boolean existsBySlugAndIdNot(String slug, Long id);
    }

    public interface CourseRepository extends JpaRepository<Course, Long> {

        @EntityGraph(attributePaths = "category")
        Optional<Course> findBySlug(String slug);

        boolean existsBySlug(String slug);

        boolean existsBySlugAndIdNot(String slug, Long id);

        boolean existsByCategoryId(Long categoryId);

        /** Cursos publicados. Los filtros nulos no restringen; {@code pattern} siempre trae comodines. */
        @EntityGraph(attributePaths = "category")
        @Query("""
                select c from Course c
                where c.status = com.monkeycoffedevs.cmd.catalog.Course.Status.PUBLISHED
                  and (:categorySlug is null or c.category.slug = :categorySlug)
                  and (:level is null or c.level = :level)
                  and (:free is null or (:free = true and c.price = 0) or (:free = false and c.price > 0))
                  and (lower(c.title) like :pattern or lower(c.summary) like :pattern)
                """)
        Page<Course> searchPublished(@Param("categorySlug") String categorySlug, @Param("level") Course.Level level,
                                     @Param("free") Boolean free, @Param("pattern") String pattern,
                                     Pageable pageable);

        @EntityGraph(attributePaths = "category")
        List<Course> findTop6ByStatusAndFeaturedTrueOrderByPublishedAtDesc(Course.Status status);

        @EntityGraph(attributePaths = "category")
        List<Course> findAllByOrderByCreatedAtDesc();

        long countByStatus(Course.Status status);
    }

    public interface CourseModuleRepository extends JpaRepository<CourseModule, Long> {

        List<CourseModule> findByCourseIdOrderByPositionAscIdAsc(Long courseId);
    }

    public interface LessonRepository extends JpaRepository<Lesson, Long> {

        /** Todas las clases de un curso en el orden del temario. */
        @Query("""
                select l from Lesson l join fetch l.module m
                where m.course.id = :courseId
                order by m.position, m.id, l.position, l.id
                """)
        List<Lesson> findByCourseInOrder(@Param("courseId") Long courseId);

        @Query("""
                select new com.monkeycoffedevs.cmd.catalog.CourseStats(m.course.id, count(l), coalesce(sum(l.durationSeconds), 0))
                from Lesson l join l.module m
                where m.course.id in :courseIds
                group by m.course.id
                """)
        List<CourseStats> statsByCourseIds(@Param("courseIds") Collection<Long> courseIds);

        @Query("select count(l) from Lesson l where l.module.course.id = :courseId")
        long countByCourseId(@Param("courseId") Long courseId);
    }

    public interface QuizRepository extends JpaRepository<Quiz, Long> {

        @Query("select q from Quiz q join fetch q.module m where m.course.id = :courseId")
        List<Quiz> findByCourseId(@Param("courseId") Long courseId);

        Optional<Quiz> findByModuleId(Long moduleId);
    }

    public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {

        List<LearningPath> findByPublishedTrueOrderByPositionAscTitleAsc();

        List<LearningPath> findAllByOrderByPositionAscTitleAsc();

        Optional<LearningPath> findBySlug(String slug);

        boolean existsBySlug(String slug);

        boolean existsBySlugAndIdNot(String slug, Long id);
    }
}
