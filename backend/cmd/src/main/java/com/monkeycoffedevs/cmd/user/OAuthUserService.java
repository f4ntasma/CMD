package com.monkeycoffedevs.cmd.user;

import com.monkeycoffedevs.cmd.common.ApiException;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Convierte el perfil que devuelve Google, GitHub o Discord en un usuario de la academia. */
@Service
@RequiredArgsConstructor
public class OAuthUserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final AuthService authService;
    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    private final RestClient restClient = RestClient.create();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest request) {
        AuthProvider provider = AuthProvider.fromRegistrationId(request.getClientRegistration().getRegistrationId());
        Map<String, Object> profile = delegate.loadUser(request).getAttributes();
        try {
            User user = switch (provider) {
                case GOOGLE -> authService.loginWithProvider(provider, text(profile, "sub"),
                        Boolean.TRUE.equals(profile.get("email_verified")) ? text(profile, "email") : null,
                        text(profile, "name"), text(profile, "picture"));
                case GITHUB -> authService.loginWithProvider(provider, text(profile, "id"),
                        githubVerifiedEmail(request.getAccessToken().getTokenValue()),
                        firstNonBlank(text(profile, "name"), text(profile, "login")), text(profile, "avatar_url"));
                case DISCORD -> authService.loginWithProvider(provider, text(profile, "id"),
                        Boolean.TRUE.equals(profile.get("verified")) ? text(profile, "email") : null,
                        firstNonBlank(text(profile, "global_name"), text(profile, "username")),
                        discordAvatar(profile));
            };
            return AppPrincipal.from(user);
        } catch (ApiException e) {
            throw new OAuth2AuthenticationException(new OAuth2Error("account_rejected"), e.getMessage(), e);
        }
    }

    /** GitHub no incluye el correo en el perfil si es privado: hay que pedir la lista y quedarse con el principal. */
    private String githubVerifiedEmail(String accessToken) {
        try {
            List<Map<String, Object>> emails = restClient.get()
                    .uri("https://api.github.com/user/emails")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
            if (emails == null) {
                return null;
            }
            return emails.stream()
                    .filter(entry -> Boolean.TRUE.equals(entry.get("primary"))
                            && Boolean.TRUE.equals(entry.get("verified")))
                    .map(entry -> text(entry, "email"))
                    .findFirst()
                    .orElse(null);
        } catch (RestClientException e) {
            return null;
        }
    }

    private static String discordAvatar(Map<String, Object> profile) {
        String avatar = text(profile, "avatar");
        return avatar == null ? null
                : "https://cdn.discordapp.com/avatars/" + text(profile, "id") + "/" + avatar + ".png";
    }

    private static String text(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private static String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }
}
