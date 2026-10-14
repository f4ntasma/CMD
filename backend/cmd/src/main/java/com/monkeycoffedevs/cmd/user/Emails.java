package com.monkeycoffedevs.cmd.user;

import java.util.Locale;

final class Emails {

    private Emails() {
    }

    /** Los correos se guardan y se comparan siempre recortados y en minúsculas. */
    static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
