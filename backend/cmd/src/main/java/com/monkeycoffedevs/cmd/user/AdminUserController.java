package com.monkeycoffedevs.cmd.user;

import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.user.AuthDtos.AdminUser;
import com.monkeycoffedevs.cmd.user.AuthDtos.AdminUserUpdate;
import jakarta.validation.Valid;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<AdminUser> list(@RequestParam(defaultValue = "") String q,
                                        @RequestParam(defaultValue = "0") int page) {
        String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        var users = userRepository.search(pattern,
                PageRequest.of(Math.max(page, 0), 20, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.of(users.map(AdminUser::from));
    }

    @PutMapping("/{id}")
    @Transactional
    public AdminUser update(@PathVariable Long id, @Valid @RequestBody AdminUserUpdate request,
                            @AuthenticationPrincipal AppPrincipal actor) {
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Usuario no encontrado"));
        boolean losesAdmin = user.getRole() == Role.ADMIN && (request.role() != Role.ADMIN || !request.enabled());
        if (losesAdmin && id.equals(actor.getId())) {
            throw ApiException.badRequest("No puedes desactivarte ni quitarte el rol de administrador a ti mismo");
        }
        user.setRole(request.role());
        user.setEnabled(request.enabled());
        if (request.enabled()) {
            user.setFailedAttempts(0);
            user.setLockedUntil(null);
        }
        return AdminUser.from(user);
    }
}
