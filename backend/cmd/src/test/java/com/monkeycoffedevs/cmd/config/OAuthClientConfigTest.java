package com.monkeycoffedevs.cmd.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistration;

class OAuthClientConfigTest {

    private static final AppProperties.Client NONE = new AppProperties.Client("", "");

    @Test
    void registersOnlyConfiguredProvidersWithThePublicRedirectUri() {
        AppProperties properties = new AppProperties("https://academia.example", null, null, null,
                new AppProperties.OAuth(NONE, new AppProperties.Client("gh-id", "gh-secret"),
                        new AppProperties.Client("dc-id", "dc-secret")));

        List<ClientRegistration> registrations = new ArrayList<>();
        new OAuthClientConfig().clientRegistrationRepository(properties).forEach(registrations::add);

        assertThat(registrations).extracting(ClientRegistration::getRegistrationId)
                .containsExactlyInAnyOrder("github", "discord");
        // El host del proxy no influye: el proveedor recibe siempre la URL pública registrada.
        assertThat(registrations).extracting(ClientRegistration::getRedirectUri)
                .containsOnly("https://academia.example/login/oauth2/code/{registrationId}");
    }
}
