package com.monkeycoffedevs.cmd.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** Los repositorios de cada módulo se declaran como interfaces anidadas (p. ej. CatalogRepositories). */
@Configuration
@EnableJpaRepositories(basePackages = "com.monkeycoffedevs.cmd", considerNestedRepositories = true)
public class JpaConfig {
}
