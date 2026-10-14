package com.monkeycoffedevs.cmd.user;

import com.monkeycoffedevs.cmd.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Envía los correos de la cuenta. Sin servidor SMTP configurado, escribe el enlace en el log. */
@Slf4j
@Service
public class MailService {

    private final JavaMailSender mailSender;
    private final AppProperties properties;
    private final boolean smtpConfigured;

    public MailService(ObjectProvider<JavaMailSender> mailSender, AppProperties properties,
                       @Value("${spring.mail.host:}") String host) {
        this.mailSender = mailSender.getIfAvailable();
        this.properties = properties;
        this.smtpConfigured = this.mailSender != null && !host.isBlank();
    }

    public void sendEmailVerification(String to, String token) {
        send(to, "Confirma tu correo en Monkey Coffe Dev's",
                "¡Bienvenido a Monkey Coffe Dev's!\n\nConfirma tu correo abriendo este enlace:\n"
                        + link("/verificar-correo", token) + "\n\nEl enlace vence en 48 horas.");
    }

    public void sendPasswordReset(String to, String token) {
        send(to, "Restablece tu contraseña",
                "Recibimos una solicitud para restablecer tu contraseña.\n\nCrea una nueva aquí:\n"
                        + link("/restablecer", token)
                        + "\n\nEl enlace vence en 1 hora. Si no fuiste tú, ignora este correo.");
    }

    private String link(String path, String token) {
        return properties.baseUrl() + path + "?token=" + token;
    }

    private void send(String to, String subject, String body) {
        if (!smtpConfigured) {
            log.info("SMTP sin configurar. Correo para {} — {}:\n{}", to, subject, body);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.mail().from());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
        } catch (MailException e) {
            // Un fallo de correo no debe tumbar el registro: el usuario puede pedir otro enlace.
            log.error("No se pudo enviar el correo '{}' a {}: {}", subject, to, e.getMessage());
        }
    }
}
