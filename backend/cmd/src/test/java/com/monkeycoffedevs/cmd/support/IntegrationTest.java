package com.monkeycoffedevs.cmd.support;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

/** Arranca la API completa contra un PostgreSQL real (Testcontainers). Requiere Docker. */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(properties = {
        "app.admin.email=" + Api.ADMIN_EMAIL,
        "app.admin.password=" + Api.PASSWORD
})
@AutoConfigureMockMvc
@Import({PostgresTestConfig.class, Api.class})
public @interface IntegrationTest {
}
