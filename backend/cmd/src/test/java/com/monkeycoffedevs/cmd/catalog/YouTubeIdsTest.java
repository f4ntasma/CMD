package com.monkeycoffedevs.cmd.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.monkeycoffedevs.cmd.common.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class YouTubeIdsTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "dQw4w9WgXcQ",
            "  dQw4w9WgXcQ  ",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10s",
            "https://youtu.be/dQw4w9WgXcQ?si=abc",
            "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "https://www.youtube.com/shorts/dQw4w9WgXcQ",
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    })
    void extractsTheIdFromEveryCommonForm(String input) {
        assertThat(YouTubeIds.extract(input)).isEqualTo("dQw4w9WgXcQ");
    }

    @Test
    void blankMeansNoVideo() {
        assertThat(YouTubeIds.extract(null)).isNull();
        assertThat(YouTubeIds.extract("  ")).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://vimeo.com/123456", "no-es-un-video", "https://www.youtube.com/@canal"})
    void rejectsWhatIsNotAYouTubeVideo(String input) {
        assertThatThrownBy(() -> YouTubeIds.extract(input)).isInstanceOf(ApiException.class);
    }
}
