package com.monkeycoffedevs.cmd.config;

import com.monkeycoffedevs.cmd.user.OAuthUserService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

/**
 * Sesión por cookie HttpOnly y CSRF por cookie + cabecera (el esquema que Angular trae de serie): el
 * navegador nunca guarda tokens accesibles desde JavaScript.
 */
@Configuration
public class SecurityConfig {

    private static final String[] PUBLIC_READS = {
            "/api/site/**", "/api/categories/**", "/api/courses/**", "/api/paths/**", "/api/posts/**",
            "/api/certificates/**", "/api/auth/me", "/api/auth/providers", "/actuator/health/**"
    };

    private static final String[] PUBLIC_AUTH_WRITES = {
            "/api/auth/register", "/api/auth/login", "/api/auth/verify-email", "/api/auth/forgot-password",
            "/api/auth/reset-password"
    };

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, AppProperties properties,
                                            SecurityContextRepository securityContextRepository,
                                            ObjectProvider<InMemoryClientRegistrationRepository> registrations,
                                            OAuthUserService oAuthUserService) throws Exception {
        http
                .csrf(csrf -> csrf.spa())
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, PUBLIC_READS).permitAll()
                        .requestMatchers(HttpMethod.POST, PUBLIC_AUTH_WRITES).permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**", "/error").permitAll()
                        .anyRequest().authenticated())
                // Es una API: sin sesión responde 401 en vez de redirigir a una página de login.
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.SAME_ORIGIN))
                        .frameOptions(frame -> frame.deny()));

        if (registrations.getIfAvailable() != null) {
            http.oauth2Login(oauth -> oauth
                    .userInfoEndpoint(userInfo -> userInfo.userService(oAuthUserService))
                    .successHandler((request, response, authentication) ->
                            response.sendRedirect(properties.baseUrl() + "/mi-aprendizaje"))
                    .failureHandler((request, response, exception) ->
                            response.sendRedirect(properties.baseUrl() + "/ingresar?error="
                                    + URLEncoder.encode(String.valueOf(exception.getMessage()), StandardCharsets.UTF_8))));
        }
        return http.build();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
