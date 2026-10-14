package com.monkeycoffedevs.cmd;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.monkeycoffedevs.cmd.support.Api;
import com.monkeycoffedevs.cmd.support.IntegrationTest;
import com.monkeycoffedevs.cmd.user.AppPrincipal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;

/** Recorre la academia de punta a punta por HTTP: publicar, inscribirse, aprender, comprar y certificar. */
@IntegrationTest
class AcademyFlowIntegrationTest {

    @Autowired
    private Api api;

    @Test
    void seededCategoriesArePublic() throws Exception {
        api.get(null, "/api/categories")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == 'ciberseguridad')]").exists())
                .andExpect(jsonPath("$[?(@.slug == 'programacion-basica')]").exists());
    }

    @Test
    void draftCoursesAreInvisibleAndCannotBePublishedEmpty() throws Exception {
        AppPrincipal admin = api.admin();
        JsonNode draft = api.ok(api.post(admin, "/api/admin/courses", courseRequest(Api.unique("Borrador "), "0", "DRAFT")));
        String slug = draft.get("slug").asString();

        api.get(null, "/api/courses/" + slug).andExpect(status().isNotFound());
        api.get(null, "/api/courses").andExpect(content().string(not(containsString(slug))));

        Map<String, Object> publish = courseRequest(draft.get("title").asString(), "0", "PUBLISHED");
        api.put(admin, "/api/admin/courses/" + draft.get("id").asLong(), publish)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("al menos una clase")));
    }

    @Test
    void freeCourseFromEnrollmentToVerifiedCertificate() throws Exception {
        Course course = publishedCourse("0");
        AppPrincipal student = api.student();

        // El visitante ve el temario y la clase de vista previa, pero no el resto.
        api.get(null, "/api/courses/" + course.slug)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.course.free").value(true))
                .andExpect(jsonPath("$.course.lessonCount").value(2))
                .andExpect(jsonPath("$.modules[0].lessons", hasSize(2)))
                .andExpect(jsonPath("$.modules[0].quiz.questionCount").value(2));
        api.get(null, lessonUrl(course, course.previewLessonId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.youtubeVideoId").value("dQw4w9WgXcQ"));
        api.get(null, lessonUrl(course, course.lockedLessonId)).andExpect(status().isUnauthorized());
        api.get(student, lessonUrl(course, course.lockedLessonId)).andExpect(status().isForbidden());
        api.get(null, "/api/courses/" + course.slug + "/state").andExpect(jsonPath("$.enrolled").value(false));

        // Inscripción (repetirla no duplica nada).
        api.post(student, "/api/courses/" + course.slug + "/enroll", null).andExpect(jsonPath("$.enrolled").value(true));
        api.post(student, "/api/courses/" + course.slug + "/enroll", null).andExpect(status().isOk());
        api.get(student, "/api/me/courses").andExpect(jsonPath("$", hasSize(1)));

        api.get(student, lessonUrl(course, course.lockedLessonId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previousLessonId").value(course.previewLessonId))
                .andExpect(jsonPath("$.nextLessonId").doesNotExist())
                .andExpect(jsonPath("$.contentHtml").value(containsString("<strong>apuntes</strong>")));

        // Dos clases y un cuestionario: cada paso suma un tercio.
        api.put(student, "/api/lessons/" + course.previewLessonId + "/completion", Map.of("completed", true))
                .andExpect(jsonPath("$.progressPercent").value(33));
        api.put(student, "/api/lessons/" + course.lockedLessonId + "/completion", Map.of("completed", true))
                .andExpect(jsonPath("$.progressPercent").value(66))
                .andExpect(jsonPath("$.completed").value(false));

        // El cuestionario no revela las respuestas antes de responder.
        JsonNode quiz = api.ok(api.get(student, "/api/quizzes/" + course.quizId));
        assertThat(quiz.toString()).doesNotContain("correct");

        api.post(student, "/api/quizzes/" + course.quizId + "/attempts", Map.of("answers", answers(quiz, 1)))
                .andExpect(jsonPath("$.score").value(0))
                .andExpect(jsonPath("$.passed").value(false))
                .andExpect(jsonPath("$.state.completed").value(false));

        JsonNode passed = api.ok(api.post(student, "/api/quizzes/" + course.quizId + "/attempts",
                Map.of("answers", answers(quiz, 0))));
        assertThat(passed.get("score").asInt()).isEqualTo(100);
        assertThat(passed.get("state").get("progressPercent").asInt()).isEqualTo(100);
        assertThat(passed.get("state").get("completed").asBoolean()).isTrue();
        String code = passed.get("state").get("certificateCode").asString();
        assertThat(code).startsWith("CMD-");

        // El certificado se verifica sin sesión y se descarga como PDF.
        api.get(null, "/api/certificates/" + code.toLowerCase())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseTitle").value(course.title));
        byte[] pdf = api.get(null, "/api/certificates/" + code + "/pdf")
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
        api.get(null, "/api/certificates/CMD-NOEXISTE00").andExpect(status().isNotFound());
        api.get(student, "/api/me/certificates").andExpect(jsonPath("$[0].code").value(code));
    }

    @Test
    void paidCourseNeedsAnApprovedOrder() throws Exception {
        Course course = publishedCourse("49.90");
        AppPrincipal student = api.student();
        AppPrincipal admin = api.admin();

        api.post(student, "/api/courses/" + course.slug + "/enroll", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("de pago")));

        Map<String, Object> order = Map.of("courseSlug", course.slug, "paymentMethod", "YAPE",
                "paymentReference", "OP-123456");
        JsonNode created = api.ok(api.post(student, "/api/orders", order));
        assertThat(created.get("status").asString()).isEqualTo("PENDING");
        assertThat(created.get("amount").decimalValue()).isEqualByComparingTo("49.90");
        api.post(student, "/api/orders", order).andExpect(status().isConflict());
        api.get(student, lessonUrl(course, course.lockedLessonId)).andExpect(status().isForbidden());

        long orderId = created.get("id").asLong();
        api.put(student, "/api/admin/orders/" + orderId + "/review", Map.of("approve", true))
                .andExpect(status().isForbidden());
        api.get(admin, "/api/admin/orders").andExpect(content().string(containsString("OP-123456")));
        api.put(admin, "/api/admin/orders/" + orderId + "/review", Map.of("approve", true))
                .andExpect(jsonPath("$.order.status").value("APPROVED"));
        api.put(admin, "/api/admin/orders/" + orderId + "/review", Map.of("approve", false))
                .andExpect(status().isConflict());

        api.get(student, lessonUrl(course, course.lockedLessonId)).andExpect(status().isOk());
        api.post(student, "/api/orders", order).andExpect(status().isConflict());
        api.get(student, "/api/me/orders").andExpect(jsonPath("$[0].status").value("APPROVED"));
    }

    @Test
    void rejectedOrderGivesNoAccessAndAllowsRetrying() throws Exception {
        Course course = publishedCourse("20.00");
        AppPrincipal student = api.student();
        Map<String, Object> order = Map.of("courseSlug", course.slug, "paymentMethod", "PLIN",
                "paymentReference", "MAL-1");
        long orderId = api.ok(api.post(student, "/api/orders", order)).get("id").asLong();

        api.put(api.admin(), "/api/admin/orders/" + orderId + "/review",
                        Map.of("approve", false, "note", "No encontramos el pago"))
                .andExpect(jsonPath("$.order.status").value("REJECTED"));

        api.get(student, lessonUrl(course, course.lockedLessonId)).andExpect(status().isForbidden());
        api.post(student, "/api/orders", order).andExpect(status().isCreated());
    }

    @Test
    void commentsAreForEnrolledStudentsAndCanBeModerated() throws Exception {
        Course course = publishedCourse("0");
        AppPrincipal student = api.student();
        AppPrincipal outsider = api.student();
        String commentsUrl = lessonUrl(course, course.lockedLessonId) + "/comments";
        String postUrl = "/api/lessons/" + course.lockedLessonId + "/comments";

        api.post(outsider, postUrl, Map.of("body", "No estoy inscrito")).andExpect(status().isForbidden());
        api.get(outsider, commentsUrl).andExpect(status().isForbidden());

        api.post(student, "/api/courses/" + course.slug + "/enroll", null);
        long commentId = api.ok(api.post(student, postUrl, Map.of("body", "¿Por qué <b>falla</b> mi código?")))
                .get("id").asLong();
        api.post(api.admin(), postUrl, Map.of("body", "Revisa el punto y coma", "parentId", commentId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorIsAdmin").value(true));

        api.get(student, commentsUrl)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].mine").value(true))
                .andExpect(jsonPath("$[0].replies", hasSize(1)));

        api.delete(outsider, "/api/comments/" + commentId).andExpect(status().isForbidden());
        api.put(api.admin(), "/api/admin/comments/" + commentId + "/hidden", Map.of("hidden", true))
                .andExpect(status().isNoContent());
        api.get(student, commentsUrl).andExpect(jsonPath("$", hasSize(0)));
        api.get(api.admin(), "/api/admin/comments").andExpect(content().string(containsString("falla")));
    }

    @Test
    void courseDescriptionIsRenderedAsSanitizedHtml() throws Exception {
        Course course = publishedCourse("0");

        api.get(null, "/api/courses/" + course.slug)
                .andExpect(jsonPath("$.descriptionHtml").value(containsString("<h2>Qué aprenderás</h2>")))
                .andExpect(jsonPath("$.descriptionHtml").value(not(containsString("<script"))));
    }

    @Test
    void catalogFiltersByCategoryPriceAndText() throws Exception {
        Course free = publishedCourse("0");
        Course paid = publishedCourse("15.00");

        api.get(null, "/api/courses?free=true&q=" + free.title).andExpect(jsonPath("$.content", hasSize(1)));
        api.get(null, "/api/courses?free=true&q=" + paid.title).andExpect(jsonPath("$.content", hasSize(0)));
        api.get(null, "/api/courses?free=false&q=" + paid.title).andExpect(jsonPath("$.content", hasSize(1)));
        api.get(null, "/api/courses?category=poo&q=" + free.title).andExpect(jsonPath("$.content", hasSize(1)));
        api.get(null, "/api/courses?category=ciberseguridad&q=" + free.title)
                .andExpect(jsonPath("$.content", hasSize(0)));
        api.get(null, "/api/courses?level=ADVANCED&q=" + free.title).andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void learningPathShowsOnlyPublishedCoursesInOrder() throws Exception {
        AppPrincipal admin = api.admin();
        Course first = publishedCourse("0");
        Course second = publishedCourse("0");
        long draftId = api.ok(api.post(admin, "/api/admin/courses", courseRequest(Api.unique("Oculto "), "0", "DRAFT")))
                .get("id").asLong();
        String title = Api.unique("Ruta Backend ");

        JsonNode path = api.ok(api.post(admin, "/api/admin/paths", Map.of("title", title, "description", "De cero a API",
                "published", true, "position", 1, "courseIds", List.of(second.id, draftId, first.id))));

        api.get(null, "/api/paths/" + path.get("slug").asString())
                .andExpect(jsonPath("$.courses", hasSize(2)))
                .andExpect(jsonPath("$.courses[0].slug").value(second.slug))
                .andExpect(jsonPath("$.courses[1].slug").value(first.slug));
        api.get(null, "/api/paths").andExpect(content().string(containsString(title)));
    }

    @Test
    void postsArePublicOnlyWhenPublished() throws Exception {
        AppPrincipal admin = api.admin();
        String title = Api.unique("Lanzamos la academia ");
        Map<String, Object> request = new HashMap<>(Map.of("type", "NEWS", "title", title,
                "excerpt", "Ya estamos en línea", "content", "Texto con **énfasis**", "published", false));
        JsonNode draft = api.ok(api.post(admin, "/api/admin/posts", request));
        String slug = draft.get("slug").asString();

        api.get(null, "/api/posts/" + slug).andExpect(status().isNotFound());

        request.put("published", true);
        api.put(admin, "/api/admin/posts/" + draft.get("id").asLong(), request).andExpect(status().isOk());
        api.get(null, "/api/posts/" + slug)
                .andExpect(jsonPath("$.contentHtml").value(containsString("<strong>énfasis</strong>")))
                .andExpect(jsonPath("$.post.authorName").exists());
        api.get(null, "/api/posts?type=NEWS").andExpect(content().string(containsString(slug)));
        api.get(null, "/api/posts?type=ARTICLE").andExpect(content().string(not(containsString(slug))));
    }

    @Test
    void siteSettingsAreValidatedAndPublic() throws Exception {
        AppPrincipal admin = api.admin();
        api.put(admin, "/api/admin/settings", Map.of("discord_invite_url", "http://inseguro.example"))
                .andExpect(status().isBadRequest());
        api.put(admin, "/api/admin/settings", Map.of("clave_inventada", "x")).andExpect(status().isBadRequest());
        api.put(admin, "/api/admin/settings", Map.of("discord_invite_url", "https://discord.gg/monkey"))
                .andExpect(status().isOk());

        api.get(null, "/api/site/settings")
                .andExpect(jsonPath("$.discord_invite_url").value("https://discord.gg/monkey"))
                .andExpect(jsonPath("$.youtube_url").exists());
        // Sin canal ni servidor configurados no se consulta nada fuera.
        api.get(null, "/api/site/videos").andExpect(jsonPath("$", hasSize(0)));
        api.get(null, "/api/site/discord").andExpect(status().isNoContent());
    }

    @Test
    void adminStatsCountTheAcademy() throws Exception {
        publishedCourse("0");
        api.get(api.admin(), "/api/admin/stats")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publishedCourses").isNumber())
                .andExpect(jsonPath("$.revenue").isNumber());
    }

    // ------------------------------------------------------------------ Datos de apoyo

    private record Course(long id, String slug, String title, long previewLessonId, long lockedLessonId, long quizId) {
    }

    /** Curso publicado en POO con un módulo, una clase de vista previa, una clase cerrada y un cuestionario. */
    private Course publishedCourse(String price) throws Exception {
        AppPrincipal admin = api.admin();
        String title = Api.unique("Curso Java ");
        JsonNode course = api.ok(api.post(admin, "/api/admin/courses", courseRequest(title, price, "DRAFT")));
        long id = course.get("id").asLong();
        long moduleId = api.ok(api.post(admin, "/api/admin/courses/" + id + "/modules",
                Map.of("title", "Fundamentos", "position", 1))).get("id").asLong();
        long preview = api.ok(api.post(admin, "/api/admin/modules/" + moduleId + "/lessons",
                Map.of("title", "Bienvenida", "youtubeVideo", "https://youtu.be/dQw4w9WgXcQ", "content", "",
                        "durationSeconds", 120, "freePreview", true, "position", 1))).get("id").asLong();
        long locked = api.ok(api.post(admin, "/api/admin/modules/" + moduleId + "/lessons",
                Map.of("title", "Variables", "content", "Mis **apuntes**", "durationSeconds", 300,
                        "freePreview", false, "position", 2))).get("id").asLong();
        long quizId = api.ok(api.put(admin, "/api/admin/modules/" + moduleId + "/quiz", Map.of(
                "title", "Repaso", "passingScore", 70, "questions", List.of(
                        question("¿Java es tipado?", "Sí", "No"),
                        question("¿int guarda texto?", "No", "Sí"))))).get("id").asLong();
        api.ok(api.put(admin, "/api/admin/courses/" + id, courseRequest(title, price, "PUBLISHED")));
        return new Course(id, course.get("slug").asString(), title, preview, locked, quizId);
    }

    private static Map<String, Object> courseRequest(String title, String price, String status) {
        return Map.of("title", title, "summary", "Aprende desde cero",
                "description", "## Qué aprenderás\n\n<script>alert(1)</script>\n\n- Variables",
                "categoryId", 2, "level", "BEGINNER", "price", price, "status", status, "featured", false);
    }

    /** La primera opción es la correcta. */
    private static Map<String, Object> question(String statement, String right, String wrong) {
        return Map.of("statement", statement, "options", List.of(
                Map.of("text", right, "correct", true), Map.of("text", wrong, "correct", false)));
    }

    /** Elige en cada pregunta la opción en la posición indicada (0 = la correcta en estos datos). */
    private static Map<String, Long> answers(JsonNode quiz, int optionIndex) {
        Map<String, Long> answers = new HashMap<>();
        for (JsonNode question : quiz.get("questions")) {
            answers.put(question.get("id").asString(), question.get("options").get(optionIndex).get("id").asLong());
        }
        return answers;
    }

    private static String lessonUrl(Course course, long lessonId) {
        return "/api/courses/" + course.slug + "/lessons/" + lessonId;
    }
}
