package com.monkeycoffedevs.cmd.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Ajuste del sitio editable desde el panel (redes sociales, Discord, instrucciones de pago). */
@Entity
@Table(name = "site_settings")
@Getter
@Setter
@NoArgsConstructor
public class SiteSetting {

    @Id
    @Column(name = "setting_key", length = 60)
    private String key;

    @Column(nullable = false, length = 2000)
    private String value = "";

    public SiteSetting(String key, String value) {
        this.key = key;
        this.value = value;
    }
}
