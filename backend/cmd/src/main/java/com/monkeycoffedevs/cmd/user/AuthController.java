package com.monkeycoffedevs.cmd.user;

import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.user.AuthDtos.ChangePasswordRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.EmailRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.LoginRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.Me;
import com.monkeycoffedevs.cmd.user.AuthDtos.ProfileRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.Providers;
import com.monkeycoffedevs.cmd.user.AuthDtos.RegisterRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.ResetPasswordRequest;
import com.monkeycoffedevs.cmd.user.AuthDtos.TokenRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final List<String> oauthProviders;

    public AuthController(AuthService authService, AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository,
                          ObjectProvider<InMemoryClientRegistrationRepository> registrations) {
        this.authService = authService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        List<String> providers = new ArrayList<>();
        registrations.ifAvailable(repository ->
                repository.forEach(registration -> providers.add(registration.getRegistrationId())));
        this.oauthProviders = List.copyOf(providers);
    }

    /** 204 cuando no hay sesión: el frontend lo consulta al arrancar y un 401 ensuciaría la consola. */
    @GetMapping("/me")
    public ResponseEntity<Me> me(@AuthenticationPrincipal AppPrincipal principal) {
        return principal == null ? ResponseEntity.noContent().build()
                : ResponseEntity.ok(authService.me(principal.getId()));
    }

    @GetMapping("/providers")
    public Providers providers() {
        return new Providers(oauthProviders);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Me register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest,
                       HttpServletResponse httpResponse) {
        authService.register(request);
        return signIn(new LoginRequest(request.email(), request.password()), httpRequest, httpResponse);
    }

    @PostMapping("/login")
    public Me login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest,
                    HttpServletResponse httpResponse) {
        return signIn(request, httpRequest, httpResponse);
    }

    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@Valid @RequestBody TokenRequest request) {
        authService.verifyEmail(request.token());
    }

    @PostMapping("/resend-verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendVerification(@AuthenticationPrincipal AppPrincipal principal) {
        authService.resendVerification(principal.getId());
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody EmailRequest request) {
        authService.requestPasswordReset(request.email());
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.password());
    }

    @PutMapping("/profile")
    public Me updateProfile(@AuthenticationPrincipal AppPrincipal principal,
                            @Valid @RequestBody ProfileRequest request) {
        return authService.updateProfile(principal.getId(), request);
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AppPrincipal principal,
                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.getId(), request);
    }

    private Me signIn(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));
        } catch (LockedException e) {
            throw ApiException.unauthorized("Cuenta bloqueada temporalmente por intentos fallidos. Prueba más tarde.");
        } catch (DisabledException e) {
            throw ApiException.unauthorized("Esta cuenta está desactivada");
        } catch (BadCredentialsException e) {
            authService.loginFailed(request.email());
            throw ApiException.unauthorized("Correo o contraseña incorrectos");
        }
        AppPrincipal principal = (AppPrincipal) authentication.getPrincipal();
        authService.loginSucceeded(principal.getId());

        // Nueva sesión al autenticarse (evita fijación de sesión) y contexto guardado en ella.
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);
        return authService.me(principal.getId());
    }
}
