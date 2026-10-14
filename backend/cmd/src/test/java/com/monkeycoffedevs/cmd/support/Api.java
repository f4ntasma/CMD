package com.monkeycoffedevs.cmd.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import com.monkeycoffedevs.cmd.user.AppPrincipal;
import com.monkeycoffedevs.cmd.user.Role;
import com.monkeycoffedevs.cmd.user.User;
import com.monkeycoffedevs.cmd.user.UserRepository;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Cliente mínimo de la API para los tests: peticiones JSON como un usuario dado (o anónimo si es nulo). */
@Component
public class Api {

    public static final String ADMIN_EMAIL = "admin@test.local";
    public static final String PASSWORD = "Clave-De-Prueba-1";

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public static String unique(String prefix) {
        return prefix + SEQUENCE.incrementAndGet();
    }

    public AppPrincipal admin() {
        return AppPrincipal.from(userRepository.findByEmail(ADMIN_EMAIL).orElseThrow());
    }

    public AppPrincipal student() {
        User user = new User();
        user.setEmail(unique("estudiante") + "@test.local");
        user.setDisplayName("Estudiante " + SEQUENCE.get());
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(Role.STUDENT);
        user.setEmailVerified(true);
        return AppPrincipal.from(userRepository.save(user));
    }

    public ResultActions get(AppPrincipal as, String url, Object... vars) throws Exception {
        return mvc.perform(authenticated(MockMvcRequestBuilders.get(url, vars), as));
    }

    public ResultActions post(AppPrincipal as, String url, Object body) throws Exception {
        return mvc.perform(withBody(authenticated(MockMvcRequestBuilders.post(url), as), body));
    }

    public ResultActions put(AppPrincipal as, String url, Object body) throws Exception {
        return mvc.perform(withBody(authenticated(MockMvcRequestBuilders.put(url), as), body));
    }

    public ResultActions delete(AppPrincipal as, String url) throws Exception {
        return mvc.perform(authenticated(MockMvcRequestBuilders.delete(url), as).with(csrf()));
    }

    /** Ejecuta, exige 2xx y devuelve el cuerpo como árbol JSON. */
    public JsonNode ok(ResultActions actions) throws Exception {
        var response = actions.andReturn().getResponse();
        if (response.getStatus() < 200 || response.getStatus() >= 300) {
            throw new AssertionError("Se esperaba 2xx y llegó " + response.getStatus() + ": "
                    + response.getContentAsString());
        }
        String content = response.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        return content.isEmpty() ? json.createObjectNode() : json.readTree(content);
    }

    public MockMvc mvc() {
        return mvc;
    }

    private MockHttpServletRequestBuilder withBody(MockHttpServletRequestBuilder request, Object body) {
        return request.with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body == null ? Map.of() : body));
    }

    private static MockHttpServletRequestBuilder authenticated(MockHttpServletRequestBuilder request,
                                                               AppPrincipal as) {
        return as == null ? request : request.with(user(as));
    }
}
