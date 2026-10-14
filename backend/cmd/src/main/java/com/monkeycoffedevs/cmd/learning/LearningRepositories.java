package com.monkeycoffedevs.cmd.learning;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public final class LearningRepositories {

    private LearningRepositories() {
    }

    public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

        Optional<Enrollment> findByUserIdAndCourseId(Long userId, Long courseId);

        boolean existsByUserIdAndCourseId(Long userId, Long courseId);

        @EntityGraph(attributePaths = {"course", "course.category"})
        List<Enrollment> findByUserIdOrderByCreatedAtDesc(Long userId);

        long countByCompletedAtIsNotNull();
    }

    public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

        Optional<LessonProgress> findByUserIdAndLessonId(Long userId, Long lessonId);

        @Query("""
                select p.lesson.id from LessonProgress p
                where p.userId = :userId and p.lesson.module.course.id = :courseId
                """)
        List<Long> findCompletedLessonIds(@Param("userId") Long userId, @Param("courseId") Long courseId);
    }

    public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

        @Query("""
                select a from QuizAttempt a join fetch a.quiz q
                where a.userId = :userId and q.module.course.id = :courseId
                """)
        List<QuizAttempt> findByUserAndCourse(@Param("userId") Long userId, @Param("courseId") Long courseId);
    }

    public interface CertificateRepository extends JpaRepository<Certificate, Long> {

        Optional<Certificate> findByEnrollmentId(Long enrollmentId);

        @EntityGraph(attributePaths = {"enrollment", "enrollment.user", "enrollment.course"})
        Optional<Certificate> findByCode(String code);

        @EntityGraph(attributePaths = {"enrollment", "enrollment.user", "enrollment.course"})
        List<Certificate> findByEnrollmentUserIdOrderByIssuedAtDesc(Long userId);

        boolean existsByCode(String code);
    }

    public interface LessonCommentRepository extends JpaRepository<LessonComment, Long> {

        @EntityGraph(attributePaths = "user")
        List<LessonComment> findByLessonIdOrderByCreatedAtAsc(Long lessonId);

        /** Comentarios recientes de toda la academia, para moderar. */
        @EntityGraph(attributePaths = {"user", "lesson", "lesson.module", "lesson.module.course"})
        @Query("select c from LessonComment c")
        Page<LessonComment> findAllForModeration(Pageable pageable);
    }
}
