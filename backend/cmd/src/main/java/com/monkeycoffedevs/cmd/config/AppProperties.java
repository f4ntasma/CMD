package com.monkeycoffedevs.cmd.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(String baseUrl, Admin admin, Mail mail, Security security, OAuth oauth) {

    public record Admin(String email, String password) {
    }

    public record Mail(String from) {
    }

    public record Security(int maxFailedAttempts, int lockMinutes) {
    }

    public record OAuth(Client google, Client github, Client discord) {
    }

    public record Client(String clientId, String clientSecret) {

        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank();
        }
    }
}
