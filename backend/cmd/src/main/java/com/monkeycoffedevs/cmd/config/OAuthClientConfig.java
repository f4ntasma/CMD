package com.monkeycoffedevs.cmd.config;

import com.monkeycoffedevs.cmd.user.AuthProvider;
import java.util.ArrayList;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

/** Registra solo los proveedores que tienen credenciales; sin ninguna, el login social queda desactivado. */
@Configuration
public class OAuthClientConfig {

    @Bean
    @Conditional(AnyProviderConfigured.class)
    InMemoryClientRegistrationRepository clientRegistrationRepository(AppProperties properties) {
        List<ClientRegistration> registrations = new ArrayList<>();
        // Se usa la URL pública configurada y no el host de la petición: detrás de proxies (Vercel, Traefik)
        // el host que llega no es el que el usuario ve, y el proveedor exige la URL exacta registrada.
        String redirectUri = properties.baseUrl() + "/login/oauth2/code/{registrationId}";
        AppProperties.OAuth oauth = properties.oauth();
        if (oauth.google().isConfigured()) {
            // Sin el scope "openid" Google responde por el endpoint de perfil normal, igual que los demás.
            registrations.add(CommonOAuth2Provider.GOOGLE.getBuilder(AuthProvider.GOOGLE.registrationId())
                    .clientId(oauth.google().clientId())
                    .clientSecret(oauth.google().clientSecret())
                    .scope("email", "profile")
                    .redirectUri(redirectUri)
                    .build());
        }
        if (oauth.github().isConfigured()) {
            registrations.add(CommonOAuth2Provider.GITHUB.getBuilder(AuthProvider.GITHUB.registrationId())
                    .clientId(oauth.github().clientId())
                    .clientSecret(oauth.github().clientSecret())
                    .scope("read:user", "user:email")
                    .redirectUri(redirectUri)
                    .build());
        }
        if (oauth.discord().isConfigured()) {
            registrations.add(ClientRegistration.withRegistrationId(AuthProvider.DISCORD.registrationId())
                    .clientName("Discord")
                    .clientId(oauth.discord().clientId())
                    .clientSecret(oauth.discord().clientSecret())
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri(redirectUri)
                    .scope("identify", "email")
                    .authorizationUri("https://discord.com/oauth2/authorize")
                    .tokenUri("https://discord.com/api/oauth2/token")
                    .userInfoUri("https://discord.com/api/users/@me")
                    .userNameAttributeName("id")
                    .build());
        }
        return new InMemoryClientRegistrationRepository(registrations);
    }

    static class AnyProviderConfigured implements Condition {

        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return List.of("google", "github", "discord").stream()
                    .map(provider -> context.getEnvironment().getProperty("app.oauth." + provider + ".client-id", ""))
                    .anyMatch(clientId -> !clientId.isBlank());
        }
    }
}
