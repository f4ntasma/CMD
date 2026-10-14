package com.monkeycoffedevs.cmd.user;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

/**
 * Usuario de la sesión. Es el mismo tipo entre con contraseña o con un proveedor externo, de modo que el
 * resto de la aplicación no necesita saber cómo se autenticó.
 */
@Getter
public class AppPrincipal implements UserDetails, OAuth2User, CredentialsContainer {

    private final Long id;
    private final String email;
    private final Role role;
    private final boolean enabled;
    private final boolean accountNonLocked;
    private String password;

    public AppPrincipal(Long id, String email, String password, Role role, boolean enabled,
                        boolean accountNonLocked) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.role = role;
        this.enabled = enabled;
        this.accountNonLocked = accountNonLocked;
    }

    public static AppPrincipal from(User user) {
        return new AppPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.getRole(),
                user.isEnabled(), !user.isLockedAt(Instant.now()));
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getName() {
        return String.valueOf(id);
    }

    @Override
    public Map<String, Object> getAttributes() {
        return Map.of();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public void eraseCredentials() {
        password = null;
    }
}
