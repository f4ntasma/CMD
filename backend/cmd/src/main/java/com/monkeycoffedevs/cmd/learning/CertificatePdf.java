package com.monkeycoffedevs.cmd.learning;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import com.monkeycoffedevs.cmd.config.AppProperties;
import com.monkeycoffedevs.cmd.learning.LearningDtos.CertificateView;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** Dibuja el certificado en un PDF apaisado de una página. */
@Component
@RequiredArgsConstructor
public class CertificatePdf {

    private static final Color BRAND_RED = new Color(0xE8, 0x43, 0x1F);
    private static final Color BRAND_BLUE = new Color(0x2F, 0x4F, 0xB5);
    private static final Color INK = new Color(0x1B, 0x1F, 0x2A);
    private static final Color MUTED = new Color(0x5E, 0x66, 0x78);
    private static final DateTimeFormatter DATE = DateTimeFormatter
            .ofPattern("d 'de' MMMM 'de' yyyy", Locale.forLanguageTag("es"))
            .withZone(ZoneId.of("America/Lima"));

    private final AppProperties properties;

    public byte[] render(CertificateView certificate) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 70, 70, 60, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.open();
            drawFrame(writer.getDirectContent(), document.getPageSize());
            addMascot(document);

            document.add(line("MONKEY COFFE DEV'S", font(13, Font.BOLD, BRAND_RED), 6));
            document.add(line("Certificado de finalización", font(34, Font.BOLD, INK), 26));
            document.add(line("Se otorga a", font(13, Font.NORMAL, MUTED), 10));
            document.add(line(certificate.studentName(), font(30, Font.BOLD, BRAND_BLUE), 22));
            document.add(line("por haber completado el curso", font(13, Font.NORMAL, MUTED), 10));
            document.add(line(certificate.courseTitle(), font(22, Font.BOLD, INK), 34));
            document.add(line("Emitido el " + DATE.format(certificate.issuedAt()), font(12, Font.NORMAL, INK), 6));
            document.add(line("Código de verificación: " + certificate.code(), font(12, Font.BOLD, INK), 6));
            document.add(line("Verifícalo en " + properties.baseUrl() + "/certificados/" + certificate.code(),
                    font(10, Font.NORMAL, MUTED), 0));
        } finally {
            document.close();
        }
        return out.toByteArray();
    }

    private static void drawFrame(PdfContentByte canvas, Rectangle page) {
        canvas.setColorStroke(BRAND_RED);
        canvas.setLineWidth(6);
        canvas.rectangle(24, 24, page.getWidth() - 48, page.getHeight() - 48);
        canvas.stroke();
        canvas.setColorStroke(BRAND_BLUE);
        canvas.setLineWidth(1.5f);
        canvas.rectangle(36, 36, page.getWidth() - 72, page.getHeight() - 72);
        canvas.stroke();
    }

    /** La mascota es decorativa: si el recurso faltara, el certificado se genera igual. */
    private static void addMascot(Document document) {
        try (InputStream in = new ClassPathResource("certificate/mascot.png").getInputStream()) {
            Image mascot = Image.getInstance(in.readAllBytes());
            mascot.scaleToFit(120, 120);
            mascot.setAbsolutePosition(document.getPageSize().getWidth() - 190, 56);
            document.add(mascot);
        } catch (IOException e) {
            // Sin imagen.
        }
    }

    private static Paragraph line(String text, Font font, float spacingAfter) {
        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingAfter(spacingAfter);
        return paragraph;
    }

    private static Font font(float size, int style, Color color) {
        return new Font(Font.HELVETICA, size, style, color);
    }
}
