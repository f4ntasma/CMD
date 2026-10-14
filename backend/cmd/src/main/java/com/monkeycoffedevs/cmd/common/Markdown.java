package com.monkeycoffedevs.cmd.common;

import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/** Convierte Markdown a HTML seguro. El contenido se guarda siempre en Markdown; el HTML solo se genera al servir. */
@Component
public class Markdown {

    private static final Safelist ALLOWED = Safelist.relaxed()
            .addTags("hr")
            .addAttributes("code", "class")
            .addEnforcedAttribute("a", "rel", "noopener noreferrer nofollow");

    private final Parser parser = Parser.builder().build();
    // escapeHtml: el HTML escrito a mano dentro del Markdown se muestra como texto, no se interpreta.
    private final HtmlRenderer renderer = HtmlRenderer.builder().escapeHtml(true).build();

    public String toHtml(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        return Jsoup.clean(renderer.render(parser.parse(markdown)), ALLOWED);
    }
}
