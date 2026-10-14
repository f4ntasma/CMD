package com.monkeycoffedevs.cmd.content;

import com.monkeycoffedevs.cmd.billing.Order;
import com.monkeycoffedevs.cmd.billing.OrderRepository;
import com.monkeycoffedevs.cmd.catalog.CatalogRepositories.CourseRepository;
import com.monkeycoffedevs.cmd.catalog.Course;
import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.content.ContentDtos.AdminPost;
import com.monkeycoffedevs.cmd.content.ContentDtos.DashboardStats;
import com.monkeycoffedevs.cmd.content.ContentDtos.PostRequest;
import com.monkeycoffedevs.cmd.learning.LearningRepositories.EnrollmentRepository;
import com.monkeycoffedevs.cmd.user.AppPrincipal;
import com.monkeycoffedevs.cmd.user.Role;
import com.monkeycoffedevs.cmd.user.UserRepository;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
public class AdminContentController {

    private final PostService postService;
    private final SiteService siteService;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final OrderRepository orderRepository;

    @GetMapping("/stats")
    public DashboardStats stats() {
        return new DashboardStats(userRepository.countByRoleAndEnabledTrue(Role.STUDENT),
                courseRepository.countByStatus(Course.Status.PUBLISHED), enrollmentRepository.count(),
                enrollmentRepository.countByCompletedAtIsNotNull(),
                orderRepository.countByStatus(Order.Status.PENDING), orderRepository.approvedRevenue());
    }

    @GetMapping("/posts")
    public PageResponse<AdminPost> posts(@RequestParam(defaultValue = "0") int page) {
        return postService.all(PageRequest.of(Math.max(page, 0), 30, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPost createPost(@Valid @RequestBody PostRequest request,
                                @AuthenticationPrincipal AppPrincipal principal) {
        return postService.save(null, request, principal.getId());
    }

    @PutMapping("/posts/{id}")
    public AdminPost updatePost(@PathVariable Long id, @Valid @RequestBody PostRequest request,
                                @AuthenticationPrincipal AppPrincipal principal) {
        return postService.save(id, request, principal.getId());
    }

    @DeleteMapping("/posts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable Long id) {
        postService.delete(id);
    }

    @PutMapping("/settings")
    public Map<String, String> updateSettings(@RequestBody Map<String, String> values) {
        return siteService.update(values);
    }
}
