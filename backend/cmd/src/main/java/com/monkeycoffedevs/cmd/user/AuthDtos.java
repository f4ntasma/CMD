package com.monkeycoffedevs.cmd.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 2, max = 80) String displayName,
            @NotBlank @Size(min = 10, max = 72, message = "debe tener entre 10 y 72 caracteres") String password) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record TokenRequest(@NotBlank String token) {
    }

    public record EmailRequest(@NotBlank @Email String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 10, max = 72, message = "debe tener entre 10 y 72 caracteres") String password) {
    }

    public record ProfileRequest(
            @NotBlank @Size(min = 2, max = 80) String displayName,
            @Size(max = 500) @Pattern(regexp = "^$|^https://.+", message = "debe empezar por https://")
            String avatarUrl) {
    }

    public record ChangePasswordRequest(
            String currentPassword,
            @NotBlank @Size(min = 10, max = 72, message = "debe tener entre 10 y 72 caracteres") String newPassword) {
    }

    /** Usuario de la sesión tal como lo ve el frontend. */
    public record Me(Long id, String email, String displayName, String avatarUrl, Role role,
                     boolean emailVerified, boolean hasPassword) {

        static Me from(User user) {
            return new Me(user.getId(), user.getEmail(), user.getDisplayName(), user.getAvatarUrl(),
                    user.getRole(), user.isEmailVerified(), user.getPasswordHash() != null);
        }
    }

    /** Proveedores externos activos; el frontend solo pinta estos botones. */
    public record Providers(List<String> oauth) {
    }

    public record AdminUser(Long id, String email, String displayName, Role role, boolean enabled,
                            boolean emailVerified, Instant createdAt) {

        static AdminUser from(User user) {
            return new AdminUser(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(),
                    user.isEnabled(), user.isEmailVerified(), user.getCreatedAt());
        }
    }

    public record AdminUserUpdate(@NotNull Role role, boolean enabled) {
    }
}
