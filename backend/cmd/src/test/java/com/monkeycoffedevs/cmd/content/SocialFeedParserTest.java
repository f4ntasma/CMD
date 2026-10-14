package com.monkeycoffedevs.cmd.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.monkeycoffedevs.cmd.content.ContentDtos.Video;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

class SocialFeedParserTest {

    private static final String FEED = """
            <?xml version="1.0" encoding="UTF-8"?>
            <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
              <title>Canal</title>
              <entry>
                <yt:videoId>dQw4w9WgXcQ</yt:videoId>
                <title>Primer video &amp; más</title>
                <published>2026-09-01T15:00:00+00:00</published>
              </entry>
              <entry>
                <yt:videoId>malo</yt:videoId>
                <title>Id inválido</title>
                <published>2026-09-02T15:00:00+00:00</published>
              </entry>
            </feed>
            """;

    @Test
    void readsVideosAndSkipsEntriesWithoutAValidId() throws Exception {
        List<Video> videos = SocialFeedService.parseFeed(FEED.getBytes(StandardCharsets.UTF_8));

        assertThat(videos).hasSize(1);
        assertThat(videos.get(0).id()).isEqualTo("dQw4w9WgXcQ");
        assertThat(videos.get(0).title()).isEqualTo("Primer video & más");
        assertThat(videos.get(0).thumbnailUrl()).isEqualTo("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    }

    @Test
    void refusesFeedsThatDeclareADoctype() {
        String malicious = "<?xml version=\"1.0\"?><!DOCTYPE feed [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
                + "<feed><entry><title>&x;</title></entry></feed>";

        assertThatThrownBy(() -> SocialFeedService.parseFeed(malicious.getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(Exception.class);
    }
}
