package com.monkeycoffedevs.cmd.learning;

import com.monkeycoffedevs.cmd.learning.LearningDtos.CertificateView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.CommentDto;
import com.monkeycoffedevs.cmd.learning.LearningDtos.CommentRequest;
import com.monkeycoffedevs.cmd.learning.LearningDtos.CompletionRequest;
import com.monkeycoffedevs.cmd.learning.LearningDtos.LessonView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.MyCourse;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizResult;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizSubmission;
import com.monkeycoffedevs.cmd.learning.LearningDtos.QuizView;
import com.monkeycoffedevs.cmd.learning.LearningDtos.ViewerState;
import com.monkeycoffedevs.cmd.user.AppPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LearningController {

    private final LearningService learningService;
    private final CommentService commentService;
    private final CertificatePdf certificatePdf;

    // Públicos: sin sesión, el servicio decide qué se puede ver.

    @GetMapping("/courses/{slug}/state")
    public ViewerState state(@PathVariable String slug, @AuthenticationPrincipal AppPrincipal principal) {
        return learningService.viewerState(principal, slug);
    }

    @GetMapping("/courses/{slug}/lessons/{lessonId}")
    public LessonView lesson(@PathVariable String slug, @PathVariable Long lessonId,
                             @AuthenticationPrincipal AppPrincipal principal) {
        return learningService.lesson(principal, slug, lessonId);
    }

    @GetMapping("/courses/{slug}/lessons/{lessonId}/comments")
    public List<CommentDto> comments(@PathVariable Long lessonId, @AuthenticationPrincipal AppPrincipal principal) {
        return commentService.list(principal, lessonId);
    }

    @GetMapping("/certificates/{code}")
    public CertificateView certificate(@PathVariable String code) {
        return learningService.certificate(code);
    }

    @GetMapping("/certificates/{code}/pdf")
    public ResponseEntity<byte[]> certificatePdf(@PathVariable String code) {
        CertificateView certificate = learningService.certificate(code);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename("certificado-" + certificate.code() + ".pdf").build().toString())
                .body(certificatePdf.render(certificate));
    }

    // Con sesión.

    @PostMapping("/courses/{slug}/enroll")
    public ViewerState enroll(@PathVariable String slug, @AuthenticationPrincipal AppPrincipal principal) {
        return learningService.enrollFree(principal.getId(), slug);
    }

    @GetMapping("/me/courses")
    public List<MyCourse> myCourses(@AuthenticationPrincipal AppPrincipal principal) {
        return learningService.myCourses(principal.getId());
    }

    @GetMapping("/me/certificates")
    public List<CertificateView> myCertificates(@AuthenticationPrincipal AppPrincipal principal) {
        return learningService.myCertificates(principal.getId());
    }

    @PutMapping("/lessons/{lessonId}/completion")
    public ViewerState setCompleted(@PathVariable Long lessonId, @RequestBody CompletionRequest request,
                                    @AuthenticationPrincipal AppPrincipal principal) {
        return learningService.setLessonCompleted(principal.getId(), lessonId, request.completed());
    }

    @GetMapping("/quizzes/{quizId}")
    public QuizView quiz(@PathVariable Long quizId, @AuthenticationPrincipal AppPrincipal principal) {
        return learningService.quiz(principal, quizId);
    }

    @PostMapping("/quizzes/{quizId}/attempts")
    public QuizResult submitQuiz(@PathVariable Long quizId, @Valid @RequestBody QuizSubmission submission,
                                 @AuthenticationPrincipal AppPrincipal principal) {
        return learningService.submitQuiz(principal.getId(), quizId, submission.answers());
    }

    @PostMapping("/lessons/{lessonId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto addComment(@PathVariable Long lessonId, @Valid @RequestBody CommentRequest request,
                                 @AuthenticationPrincipal AppPrincipal principal) {
        return commentService.add(principal, lessonId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId, @AuthenticationPrincipal AppPrincipal principal) {
        commentService.delete(principal, commentId);
    }
}
