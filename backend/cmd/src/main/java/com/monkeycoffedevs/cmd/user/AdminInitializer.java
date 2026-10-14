package com.monkeycoffedevs.cmd.user;

import com.monkeycoffedevs.cmd.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crea el primer administrador con APP_ADMIN_EMAIL y APP_ADMIN_PASSWORD cuando todavía no existe ninguno.
 * No hay credenciales por defecto: sin esas variables, simplemente no se crea.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminInitializer implements ApplicationRunner {

    private static final int MIN_PASSWORD_LENGTH = 10;

    private final UserRepository userRepository;
    private final AuthService authService;
    private final AppProperties properties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(Role.ADMIN)) {
            return;
        }
        String email = Emails.normalize(properties.admin().email());
        String password = properties.admin().password();
        if (email.isEmpty() || password == null || password.length() < MIN_PASSWORD_LENGTH) {
            log.warn("No hay ningún administrador. Define APP_ADMIN_EMAIL y APP_ADMIN_PASSWORD (mínimo {} "
                    + "caracteres) y reinicia para crearlo.", MIN_PASSWORD_LENGTH);
            return;
        }
        User admin = userRepository.findByEmail(email).orElseGet(User::new);
        admin.setEmail(email);
        admin.setPasswordHash(authService.encode(password));
        if (admin.getDisplayName() == null) {
            admin.setDisplayName("Administrador");
        }
        admin.setRole(Role.ADMIN);
        admin.setEmailVerified(true);
        admin.setEnabled(true);
        userRepository.save(admin);
        log.info("Administrador inicial creado: {}", email);
    }
}
