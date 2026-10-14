package com.monkeycoffedevs.cmd.user;

import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.config.AppProperties;
import com.monkeycoffedevs.cmd.user.AuthDtos.ChangePasswordRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.Me;
import com.monkeycoffedevs.cmd.user.AuthDtos.ProfileRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.RegisterRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration VERIFICATION_TTL = Duration.ofHours(48);
    private static final Duration RESET_TTL = Duration.ofHours(1);
    /** BCrypt ignora lo que pase de 72 bytes; se rechaza en vez de truncar en silencio. */
    private static final int MAX_PASSWORD_BYTES = 72;

    private final UserRepository userRepository;
    private final UserIdentityRepository identityRepository;
    private final AuthTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final AppProperties properties;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public User register(RegisterRequest request) {
        String email = Emails.normalize(request.email());
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.");
        }
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(encode(request.password()));
        userRepository.save(user);
        mailService.sendEmailVerification(email, issueToken(user, AuthToken.Type.EMAIL_VERIFICATION, VERIFICATION_TTL));
        return user;
    }

    @Transactional
    public void resendVerification(Long userId) {
        User user = get(userId);
        if (!user.isEmailVerified()) {
            mailService.sendEmailVerification(user.getEmail(),
                    issueToken(user, AuthToken.Type.EMAIL_VERIFICATION, VERIFICATION_TTL));
        }
    }

    @Transactional
    public void verifyEmail(String token) {
        consume(token, AuthToken.Type.EMAIL_VERIFICATION).setEmailVerified(true);
    }

    /** Nunca revela si el correo existe: la respuesta es la misma en ambos casos. */
    @Transactional
    public void requestPasswordReset(String rawEmail) {
        userRepository.findByEmail(Emails.normalize(rawEmail))
                .filter(User::isEnabled)
                .ifPresent(user -> mailService.sendPasswordReset(user.getEmail(),
                        issueToken(user, AuthToken.Type.PASSWORD_RESET, RESET_TTL)));
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = consume(token, AuthToken.Type.PASSWORD_RESET);
        user.setPasswordHash(encode(newPassword));
        // Quien abre el enlace demuestra que controla el correo.
        user.setEmailVerified(true);
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
    }

    @Transactional(readOnly = true)
    public Me me(Long userId) {
        return Me.from(get(userId));
    }

    @Transactional
    public Me updateProfile(Long userId, ProfileRequest request) {
        User user = get(userId);
        user.setDisplayName(request.displayName().trim());
        String avatar = request.avatarUrl() == null ? "" : request.avatarUrl().trim();
        user.setAvatarUrl(avatar.isEmpty() ? null : avatar);
        return Me.from(user);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = get(userId);
        boolean currentMatches = request.currentPassword() != null
                && passwordEncoder.matches(request.currentPassword(), user.getPasswordHash());
        if (user.getPasswordHash() != null && !currentMatches) {
            throw ApiException.badRequest("La contraseña actual no es correcta");
        }
        user.setPasswordHash(encode(request.newPassword()));
    }

    @Transactional
    public void loginFailed(String rawEmail) {
        userRepository.findByEmail(Emails.normalize(rawEmail)).ifPresent(user -> {
            int attempts = user.getFailedAttempts() + 1;
            if (attempts >= properties.security().maxFailedAttempts()) {
                user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(properties.security().lockMinutes())));
                user.setFailedAttempts(0);
                log.warn("Cuenta bloqueada temporalmente por intentos fallidos: id={}", user.getId());
            } else {
                user.setFailedAttempts(attempts);
            }
        });
    }

    @Transactional
    public void loginSucceeded(Long userId) {
        User user = get(userId);
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
    }

    /**
     * Resuelve la cuenta de quien entra con un proveedor externo: la ya enlazada, una existente con el mismo
     * correo (se enlaza) o una nueva.
     */
    @Transactional
    public User loginWithProvider(AuthProvider provider, String providerUserId, String rawEmail, String name,
                                  String avatarUrl) {
        var linked = identityRepository.findByProviderAndProviderUserId(provider, providerUserId);
        if (linked.isPresent()) {
            return requireEnabled(linked.get().getUser());
        }
        String email = Emails.normalize(rawEmail);
        if (email.isEmpty()) {
            throw ApiException.badRequest("Tu cuenta de " + provider + " no tiene un correo verificado");
        }
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User created = new User();
            created.setEmail(email);
            created.setDisplayName(name == null || name.isBlank() ? email.substring(0, email.indexOf('@')) : name);
            created.setAvatarUrl(avatarUrl);
            return created;
        });
        requireEnabled(user);
        if (user.getId() != null && !user.isEmailVerified()) {
            // La cuenta local nunca confirmó este correo: pudo crearla otra persona. Su contraseña deja de valer.
            user.setPasswordHash(null);
        }
        user.setEmailVerified(true);
        userRepository.save(user);

        UserIdentity identity = new UserIdentity();
        identity.setUser(user);
        identity.setProvider(provider);
        identity.setProviderUserId(providerUserId);
        identityRepository.save(identity);
        return user;
    }

    private static User requireEnabled(User user) {
        if (!user.isEnabled()) {
            throw ApiException.forbidden("Esta cuenta está desactivada");
        }
        return user;
    }

    private User get(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Usuario no encontrado"));
    }

    String encode(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw ApiException.badRequest("La contraseña es demasiado larga");
        }
        return passwordEncoder.encode(password);
    }

    private String issueToken(User user, AuthToken.Type type, Duration ttl) {
        Instant now = Instant.now();
        tokenRepository.invalidate(user.getId(), type, now);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        AuthToken entity = new AuthToken();
        entity.setUser(user);
        entity.setType(type);
        entity.setTokenHash(hash(token));
        entity.setExpiresAt(now.plus(ttl));
        tokenRepository.save(entity);
        return token;
    }

    private User consume(String token, AuthToken.Type type) {
        Instant now = Instant.now();
        AuthToken entity = tokenRepository.findByTokenHashAndType(hash(token), type)
                .filter(found -> found.isUsableAt(now))
                .orElseThrow(() -> ApiException.badRequest("El enlace no es válido o ya venció. Solicita uno nuevo."));
        entity.setUsedAt(now);
        return entity.getUser();
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
