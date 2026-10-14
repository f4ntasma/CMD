package com.monkeycoffedevs.cmd.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CommonUnitTest {

    private final Markdown markdown = new Markdown();

    @Test
    void slugRemovesAccentsSymbolsAndEdgeHyphens() {
        assertThat(Slugs.slugify("Programación Básica: ¡Hola, Mundo!")).isEqualTo("programacion-basica-hola-mundo");
        assertThat(Slugs.slugify("  POO  ")).isEqualTo("poo");
        assertThat(Slugs.slugify("¿¡!?")).isEmpty();
        assertThat(Slugs.slugify(null)).isEmpty();
    }

    @Test
    void markdownRendersFormattingAndCode() {
        String html = markdown.toHtml("# Título\n\nTexto **fuerte** y `código`.\n\n```java\nint x = 1;\n```");

        assertThat(html).contains("<h1>Título</h1>", "<strong>fuerte</strong>", "<code>código</code>", "<pre>");
    }

    @Test
    void markdownNeverLetsScriptsOrHandlersThrough() {
        String html = markdown.toHtml("""
                <script>alert(1)</script>
                <img src=x onerror=alert(1)>
                [clic](javascript:alert(1))
                """);

        // El HTML escrito a mano queda como texto escapado (inofensivo); lo que no puede salir es marcado activo.
        assertThat(html).doesNotContain("<script", "<img", "href=\"javascript").contains("&lt;script&gt;");
    }

    @Test
    void markdownDropsLinksWithDangerousSchemes() {
        assertThat(markdown.toHtml("[clic](javascript:alert)")).doesNotContain("href").contains("clic");
    }

    @Test
    void markdownLinksAreSafeForNewOrigins() {
        assertThat(markdown.toHtml("[sitio](https://example.com)"))
                .contains("href=\"https://example.com\"", "rel=\"noopener noreferrer nofollow\"");
    }

    @Test
    void blankMarkdownIsEmptyHtml() {
        assertThat(markdown.toHtml(null)).isEmpty();
        assertThat(markdown.toHtml("   ")).isEmpty();
    }
}
