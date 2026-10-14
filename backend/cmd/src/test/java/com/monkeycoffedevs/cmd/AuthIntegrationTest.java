package com.monkeycoffedevs.cmd;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.monkeycoffedevs.cmd.support.Api;
import com.monkeycoffedevs.cmd.support.IntegrationTest;
import com.monkeycoffedevs.cmd.user.AppPrincipal;
import com.monkeycoffedevs.cmd.user.AuthProvider;
import com.monkeycoffedevs.cmd.user.AuthService;
import com.monkeycoffedevs.cmd.user.Role;
import com.monkeycoffedevs.cmd.user.User;
import com.monkeycoffedevs.cmd.user.UserRepository;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

@IntegrationTest
class AuthIntegrationTest {

    @Autowired
    private Api api;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AuthService authService;

    @Test
    void initialAdminIsCreatedFromConfiguration() {
        User admin = userRepository.findByEmail(Api.ADMIN_EMAIL).orElseThrow();
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.getPasswordHash()).startsWith("$2").doesNotContain(Api.PASSWORD);
    }

    @Test
    void anonymousVisitorHasNoSessionAndCannotReachPrivateOrAdminEndpoints() throws Exception {
        api.get(null, "/api/auth/me").andExpect(status().isNoContent());
        api.get(null, "/api/me/courses").andExpect(status().isUnauthorized());
        api.get(null, "/api/admin/stats").andExpect(status().isUnauthorized());
        api.get(null, "/actuator/health").andExpect(status().isOk());
        api.get(null, "/actuator/env").andExpect(status().isUnauthorized());
    }

    @Test
    void studentCannotUseTheAdminApi() throws Exception {
        AppPrincipal student = api.student();
        api.get(student, "/api/admin/stats").andExpect(status().isForbidden());
        api.post(student, "/api/admin/categories", Map.of("name", "Intrusa", "color", "#000000"))
                .andExpect(status().isForbidden());
        api.put(student, "/api/admin/settings", Map.of("youtube_url", "https://example.com"))
                .andExpect(status().isForbidden());
    }

    @Test
    void writesWithoutCsrfTokenAreRejected() throws Exception {
        api.mvc().perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + Api.ADMIN_EMAIL + "\",\"password\":\"" + Api.PASSWORD + "\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void registerOpensASessionThatSurvivesTheNextRequest() throws Exception {
        String email = Api.unique("nueva") + "@Test.Local";

        var result = api.post(null, "/api/auth/register",
                        Map.of("email", email, "displayName", "Nueva Alumna", "password", Api.PASSWORD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email.toLowerCase()))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.emailVerified").value(false))
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        api.mvc().perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Nueva Alumna"));
    }

    @Test
    void registrationValidatesInputAndRejectsDuplicates() throws Exception {
        api.post(null, "/api/auth/register", Map.of("email", "no-es-correo", "displayName", "X", "password", "corta"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());

        api.post(null, "/api/auth/register",
                        Map.of("email", Api.ADMIN_EMAIL, "displayName", "Otra", "password", Api.PASSWORD))
                .andExpect(status().isConflict());
    }

    @Test
    void loginAcceptsTheRightPasswordAndLocksAfterFiveFailures() throws Exception {
        AppPrincipal student = api.student();
        api.post(null, "/api/auth/login", Map.of("email", student.getEmail(), "password", Api.PASSWORD))
                .andExpect(status().isOk());

        for (int attempt = 0; attempt < 5; attempt++) {
            api.post(null, "/api/auth/login", Map.of("email", student.getEmail(), "password", "incorrecta"))
                    .andExpect(status().isUnauthorized());
        }
        api.post(null, "/api/auth/login", Map.of("email", student.getEmail(), "password", Api.PASSWORD))
                .andExpect(status().isUnauthorized());
        assertThat(userRepository.findById(student.getId()).orElseThrow().getLockedUntil()).isNotNull();
    }

    @Test
    void passwordResetAlwaysAnswersTheSameAndUnknownTokensFail() throws Exception {
        api.post(null, "/api/auth/forgot-password", Map.of("email", "nadie@test.local"))
                .andExpect(status().isNoContent());
        api.post(null, "/api/auth/forgot-password", Map.of("email", Api.ADMIN_EMAIL))
                .andExpect(status().isNoContent());
        api.post(null, "/api/auth/reset-password", Map.of("token", "inventado", "password", Api.PASSWORD))
                .andExpect(status().isBadRequest());
    }

    @Test
    void socialLoginCreatesAnAccountOnceAndReusesItAfterwards() {
        String email = Api.unique("social") + "@test.local";

        User first = authService.loginWithProvider(AuthProvider.GITHUB, "gh-" + email, email, "Dev Social", null);
        User again = authService.loginWithProvider(AuthProvider.GITHUB, "gh-" + email, null, "Otro Nombre", null);

        assertThat(again.getId()).isEqualTo(first.getId());
        assertThat(first.isEmailVerified()).isTrue();
        assertThat(first.getPasswordHash()).isNull();
    }

    @Test
    void socialLoginLinksToAnExistingAccountWithTheSameEmail() {
        AppPrincipal existing = api.student();

        User linked = authService.loginWithProvider(AuthProvider.GOOGLE, "g-" + existing.getEmail(),
                existing.getEmail().toUpperCase(), "Nombre Google", null);

        assertThat(linked.getId()).isEqualTo(existing.getId());
    }

    @Test
    void socialLoginRevokesThePasswordOfAnUnverifiedAccountWithThatEmail() throws Exception {
        String email = Api.unique("victima") + "@test.local";
        api.post(null, "/api/auth/register",
                Map.of("email", email, "displayName", "Impostor", "password", Api.PASSWORD));

        authService.loginWithProvider(AuthProvider.DISCORD, "d-" + email, email, "Dueña Real", null);

        api.post(null, "/api/auth/login", Map.of("email", email, "password", Api.PASSWORD))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCannotRemoveTheirOwnAdminRole() throws Exception {
        AppPrincipal admin = api.admin();
        api.put(admin, "/api/admin/users/" + admin.getId(), Map.of("role", "STUDENT", "enabled", true))
                .andExpect(status().isBadRequest());
        assertThat(userRepository.findById(admin.getId()).orElseThrow().getRole()).isEqualTo(Role.ADMIN);
    }
}
