package com.monkeycoffedevs.cmd.user;

import java.util.Locale;

public enum AuthProvider {
    GOOGLE,
    GITHUB,
    DISCORD;

    /** Identificador que usa Spring Security en las rutas /oauth2/authorization/{id}. */
    public String registrationId() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static AuthProvider fromRegistrationId(String registrationId) {
        return valueOf(registrationId.toUpperCase(Locale.ROOT));
    }
}
