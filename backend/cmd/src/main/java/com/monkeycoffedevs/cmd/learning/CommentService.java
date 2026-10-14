package com.monkeycoffedevs.cmd.learning;

import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.LessonRepository;
import com.monkeycoffedevs.cmd.catalog.Lesson;
import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.learning.LearningDtos.AdminComment;
import com.monkeycoffedevs.cmd.learning.LearningDtos.CommentDto;
import com.monkeycoffedevs.cmd.learning.LearningDtos.CommentRequest;
import com.monkeycoffedevs.cmd.learning.LearningRepositories.LessonCommentRepository;
import com.monkeycoffedevs.cmd.user.AppPrincipal;
import com.monkeycoffedevs.cmd.user.Role;
import com.monkeycoffedevs.cmd.user.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final LessonCommentRepository commentRepository;
    private final LessonRepository lessonRepository;
    private final LearningService learningService;
    private final UserRepository userRepository;

    /** Hilos de la clase: comentarios raíz en orden cronológico, cada uno con sus respuestas. */
    public List<CommentDto> list(AppPrincipal principal, Long lessonId) {
        Lesson lesson = lesson(lessonId);
        learningService.requireAccess(principal, lesson);
        List<LessonComment> visible = commentRepository.findByLessonIdOrderByCreatedAtAsc(lessonId).stream()
                .filter(comment -> !comment.isHidden())
                .toList();
        Map<Long, List<LessonComment>> repliesByParent = visible.stream()
                .filter(comment -> comment.getParentId() != null)
                .collect(Collectors.groupingBy(LessonComment::getParentId));
        return visible.stream()
                .filter(comment -> comment.getParentId() == null)
                .map(comment -> toDto(comment, principal,
                        repliesByParent.getOrDefault(comment.getId(), List.of()).stream()
                                .map(reply -> toDto(reply, principal, List.of()))
                                .toList()))
                .toList();
    }

    @Transactional
    public CommentDto add(AppPrincipal principal, Long lessonId, CommentRequest request) {
        Lesson lesson = lesson(lessonId);
        Long courseId = lesson.getModule().getCourse().getId();
        if (!principal.isAdmin() && !learningService.isEnrolled(principal.getId(), courseId)) {
            throw ApiException.forbidden("Solo los estudiantes inscritos pueden comentar");
        }
        Long parentId = null;
        if (request.parentId() != null) {
            LessonComment parent = commentRepository.findById(request.parentId())
                    .filter(found -> found.getLesson().getId().equals(lessonId) && !found.isHidden())
                    .orElseThrow(() -> ApiException.badRequest("El comentario al que respondes ya no existe"));
            // Un solo nivel: responder a una respuesta la cuelga del mismo comentario raíz.
            parentId = parent.getParentId() != null ? parent.getParentId() : parent.getId();
        }
        LessonComment comment = new LessonComment();
        comment.setLesson(lesson);
        comment.setUser(userRepository.findById(principal.getId())
                .orElseThrow(() -> ApiException.unauthorized("Tu sesión ya no es válida")));
        comment.setParentId(parentId);
        comment.setBody(request.body().trim());
        return toDto(commentRepository.save(comment), principal, List.of());
    }

    @Transactional
    public void delete(AppPrincipal principal, Long commentId) {
        LessonComment comment = comment(commentId);
        if (!principal.isAdmin() && !comment.getUser().getId().equals(principal.getId())) {
            throw ApiException.forbidden("Solo puedes borrar tus propios comentarios");
        }
        commentRepository.delete(comment);
    }

    public PageResponse<AdminComment> moderationQueue(Pageable pageable) {
        return PageResponse.of(commentRepository.findAllForModeration(pageable).map(comment -> {
            var course = comment.getLesson().getModule().getCourse();
            return new AdminComment(comment.getId(), comment.getUser().getDisplayName(),
                    comment.getUser().getEmail(), comment.getBody(), comment.isHidden(), comment.getCreatedAt(),
                    comment.getLesson().getTitle(), course.getTitle(), course.getSlug(),
                    comment.getLesson().getId());
        }));
    }

    @Transactional
    public void setHidden(Long commentId, boolean hidden) {
        comment(commentId).setHidden(hidden);
    }

    private static CommentDto toDto(LessonComment comment, AppPrincipal principal, List<CommentDto> replies) {
        var author = comment.getUser();
        return new CommentDto(comment.getId(), author.getDisplayName(), author.getAvatarUrl(),
                author.getRole() == Role.ADMIN, comment.getBody(), comment.getCreatedAt(),
                principal != null && author.getId().equals(principal.getId()), replies);
    }

    private Lesson lesson(Long lessonId) {
        return lessonRepository.findById(lessonId).orElseThrow(() -> ApiException.notFound("Clase no encontrada"));
    }

    private LessonComment comment(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Comentario no encontrado"));
    }
}
