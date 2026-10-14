package com.monkeycoffedevs.cmd.learning;

import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CourseRepository;
import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.learning.LearningDtos.AdminComment;
import com.monkeycoffedevs.cmd.learning.LearningDtos.HiddenRequest;
import com.monkeycoffedevs.cmd.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminLearningController {

    private final CommentService commentService;
    private final LearningService learningService;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    @GetMapping("/comments")
    public PageResponse<AdminComment> comments(@RequestParam(defaultValue = "0") int page) {
        return commentService.moderationQueue(
                PageRequest.of(Math.max(page, 0), 30, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PutMapping("/comments/{id}/hidden")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setHidden(@PathVariable Long id, @RequestBody HiddenRequest request) {
        commentService.setHidden(id, request.hidden());
    }

    /** Regala el acceso a un curso (becas, pruebas, cortesías). */
    @PostMapping("/users/{userId}/enrollments/{courseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void grant(@PathVariable Long userId, @PathVariable Long courseId) {
        if (!userRepository.existsById(userId)) {
            throw ApiException.notFound("Usuario no encontrado");
        }
        learningService.enroll(userId,
                courseRepository.findById(courseId).orElseThrow(() -> ApiException.notFound("Curso no encontrado")),
                Enrollment.Source.GRANT);
    }
}
