package com.monkeycoffedevs.cmd.catalog;

import com.monkeycoffedevs.cmd.common.ApiException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Acepta un id de YouTube o cualquiera de sus URL habituales y devuelve solo el id. */
final class YouTubeIds {

    private static final Pattern ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private static final Pattern IN_URL = Pattern.compile(
            "(?:youtu\\.be/|youtube(?:-nocookie)?\\.com/(?:watch\\?(?:.*&)?v=|embed/|shorts/|live/))([A-Za-z0-9_-]{11})");

    private YouTubeIds() {
    }

    /** Nulo si viene vacío; 400 si no se reconoce como video de YouTube. */
    static String extract(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String value = input.trim();
        if (ID.matcher(value).matches()) {
            return value;
        }
        Matcher matcher = IN_URL.matcher(value);
        if (matcher.find()) {
            return matcher.group(1);
        }
        throw ApiException.badRequest("No se reconoce el video de YouTube. Pega el enlace del video o su id.");
    }
}
