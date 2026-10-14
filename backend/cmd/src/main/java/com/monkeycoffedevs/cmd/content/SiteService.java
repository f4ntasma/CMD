package com.monkeycoffedevs.cmd.content;

import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.content.ContentRepositories.SiteSettingRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ajustes públicos del sitio. Todas las claves son visibles para cualquiera: no guardar secretos aquí. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SiteService {

    public static final String YOUTUBE_CHANNEL_ID = "youtube_channel_id";
    public static final String DISCORD_GUILD_ID = "discord_guild_id";
    public static final String DISCORD_INVITE_URL = "discord_invite_url";

    private static final Set<String> URL_KEYS = Set.of("youtube_url", "tiktok_url", DISCORD_INVITE_URL, "github_url");
    private static final Set<String> KEYS = Set.of("youtube_url", YOUTUBE_CHANNEL_ID, "tiktok_url",
            DISCORD_INVITE_URL, DISCORD_GUILD_ID, "github_url", "payment_instructions");

    private final SiteSettingRepository settingRepository;

    public Map<String, String> settings() {
        Map<String, String> settings = new LinkedHashMap<>();
        KEYS.stream().sorted().forEach(key -> settings.put(key, ""));
        settingRepository.findAll().stream()
                .filter(setting -> KEYS.contains(setting.getKey()))
                .forEach(setting -> settings.put(setting.getKey(), setting.getValue()));
        return settings;
    }

    public String get(String key) {
        return settingRepository.findById(key).map(SiteSetting::getValue).orElse("");
    }

    @Transactional
    public Map<String, String> update(Map<String, String> values) {
        values.forEach((key, rawValue) -> {
            if (!KEYS.contains(key)) {
                throw ApiException.badRequest("Ajuste desconocido: " + key);
            }
            String value = rawValue == null ? "" : rawValue.trim();
            if (value.length() > 2000) {
                throw ApiException.badRequest("El valor de " + key + " es demasiado largo");
            }
            if (URL_KEYS.contains(key) && !value.isEmpty() && !value.startsWith("https://")) {
                throw ApiException.badRequest("El enlace de " + key + " debe empezar por https://");
            }
            settingRepository.save(new SiteSetting(key, value));
        });
        return settings();
    }
}
