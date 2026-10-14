package com.monkeycoffedevs.cmd.content;

import com.monkeycoffedevs.cmd.content.ContentDtos.DiscordStatus;
import com.monkeycoffedevs.cmd.content.ContentDtos.Video;
import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * Trae los últimos videos del canal de YouTube (feed público, sin clave de API) y el estado del servidor de
 * Discord (widget público). Los resultados se guardan unos minutos en memoria y, si el servicio externo
 * falla, la página simplemente no muestra esa sección.
 */
@Slf4j
@Service
public class SocialFeedService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(15);
    private static final int MAX_VIDEOS = 6;

    private final SiteService siteService;
    private final RestClient restClient;
    private final Map<String, Cached<?>> cache = new ConcurrentHashMap<>();

    public SocialFeedService(SiteService siteService) {
        this.siteService = siteService;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public List<Video> latestVideos() {
        String channelId = siteService.get(SiteService.YOUTUBE_CHANNEL_ID);
        if (!channelId.matches("[A-Za-z0-9_-]{10,40}")) {
            return List.of();
        }
        return cached("youtube:" + channelId, List.of(), () -> {
            byte[] xml = restClient.get()
                    .uri("https://www.youtube.com/feeds/videos.xml?channel_id={id}", channelId)
                    .retrieve().body(byte[].class);
            return parseFeed(xml);
        });
    }

    public Optional<DiscordStatus> discord() {
        String guildId = siteService.get(SiteService.DISCORD_GUILD_ID);
        if (!guildId.matches("\\d{5,25}")) {
            return Optional.empty();
        }
        String configuredInvite = siteService.get(SiteService.DISCORD_INVITE_URL);
        return cached("discord:" + guildId + ":" + configuredInvite, Optional.empty(), () -> {
            Map<?, ?> widget = restClient.get()
                    .uri("https://discord.com/api/guilds/{id}/widget.json", guildId)
                    .retrieve().body(Map.class);
            if (widget == null) {
                return Optional.empty();
            }
            Object online = widget.get("presence_count");
            Object invite = widget.get("instant_invite");
            return Optional.of(new DiscordStatus(String.valueOf(widget.get("name")),
                    online instanceof Number number ? number.intValue() : 0,
                    !configuredInvite.isEmpty() ? configuredInvite : invite == null ? "" : invite.toString()));
        });
    }

    static List<Video> parseFeed(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // El feed es de un tercero: sin DTD ni entidades externas.
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setNamespaceAware(true);
        NodeList entries = factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml))
                .getElementsByTagNameNS("*", "entry");
        List<Video> videos = new ArrayList<>();
        for (int i = 0; i < entries.getLength() && videos.size() < MAX_VIDEOS; i++) {
            Element entry = (Element) entries.item(i);
            String id = text(entry, "videoId");
            if (id.matches("[A-Za-z0-9_-]{11}")) {
                videos.add(new Video(id, text(entry, "title"), Instant.parse(text(entry, "published")),
                        "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"));
            }
        }
        return videos;
    }

    private static String text(Element parent, String localName) {
        NodeList nodes = parent.getElementsByTagNameNS("*", localName);
        return nodes.getLength() == 0 ? "" : nodes.item(0).getTextContent().trim();
    }

    @SuppressWarnings("unchecked")
    private <T> T cached(String key, T fallback, ThrowingSupplier<T> loader) {
        Cached<?> hit = cache.get(key);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return (T) hit.value();
        }
        T value;
        try {
            value = loader.get();
        } catch (Exception e) {
            log.warn("No se pudo actualizar {}: {}", key, e.getMessage());
            // Se conserva el último valor bueno; el fallo también se recuerda para no insistir en cada visita.
            value = hit != null ? (T) hit.value() : fallback;
        }
        cache.put(key, new Cached<>(value, Instant.now().plus(CACHE_TTL)));
        return value;
    }

    private record Cached<T>(T value, Instant expiresAt) {
    }

    @FunctionalInterface
    private interface ThrowingSupplier<T> {
        T get() throws Exception;
    }
}
