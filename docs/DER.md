# DER — Monkey Coffe Dev's

Motor: PostgreSQL 16. El esquema lo crean las migraciones Flyway de
`backend/cmd/src/main/resources/db/migration`, que implementan este diagrama.

```mermaid
erDiagram
    USERS ||--o{ USER_IDENTITIES : "inicia sesión con"
    USERS ||--o{ AUTH_TOKENS : "recibe"
    USERS ||--o{ ENROLLMENTS : "se inscribe"
    USERS ||--o{ LESSON_PROGRESS : "completa"
    USERS ||--o{ QUIZ_ATTEMPTS : "rinde"
    USERS ||--o{ LESSON_COMMENTS : "comenta"
    USERS ||--o{ ORDERS : "compra"
    USERS ||--o{ POSTS : "escribe"

    CATEGORIES ||--o{ COURSES : "agrupa"
    COURSES ||--o{ COURSE_MODULES : "se divide en"
    COURSE_MODULES ||--o{ LESSONS : "contiene"
    COURSE_MODULES ||--o| QUIZZES : "se evalúa con"
    QUIZZES ||--o{ QUIZ_QUESTIONS : "pregunta"
    QUIZ_QUESTIONS ||--o{ QUIZ_OPTIONS : "ofrece"
    QUIZZES ||--o{ QUIZ_ATTEMPTS : "recibe"

    LEARNING_PATHS ||--o{ LEARNING_PATH_COURSES : "ordena"
    COURSES ||--o{ LEARNING_PATH_COURSES : "forma parte de"

    COURSES ||--o{ ENROLLMENTS : "tiene"
    ENROLLMENTS ||--o| CERTIFICATES : "otorga"
    LESSONS ||--o{ LESSON_PROGRESS : "registra"
    LESSONS ||--o{ LESSON_COMMENTS : "recibe"
    LESSON_COMMENTS ||--o{ LESSON_COMMENTS : "responde a"
    COURSES ||--o{ ORDERS : "se vende en"

    USERS {
        bigint id PK
        varchar email UK
        varchar password_hash "BCrypt; nulo si solo usa Google/GitHub/Discord"
        varchar display_name
        varchar avatar_url
        varchar role "STUDENT | ADMIN"
        boolean email_verified
        boolean enabled
        int failed_attempts
        timestamptz locked_until
        timestamptz created_at
    }
    USER_IDENTITIES {
        bigint id PK
        bigint user_id FK
        varchar provider "GOOGLE | GITHUB | DISCORD"
        varchar provider_user_id "UK junto con provider"
    }
    AUTH_TOKENS {
        bigint id PK
        bigint user_id FK
        varchar type "EMAIL_VERIFICATION | PASSWORD_RESET"
        varchar token_hash UK "SHA-256; el token nunca se guarda"
        timestamptz expires_at
        timestamptz used_at
    }
    CATEGORIES {
        bigint id PK
        varchar slug UK
        varchar name
        varchar description
        varchar color
        int position
    }
    COURSES {
        bigint id PK
        varchar slug UK
        varchar title
        varchar summary
        text description "Markdown"
        bigint category_id FK
        varchar level "BEGINNER | INTERMEDIATE | ADVANCED"
        varchar cover_url
        numeric price "0 = gratis"
        varchar currency
        varchar status "DRAFT | PUBLISHED | ARCHIVED"
        boolean featured
        timestamptz published_at
    }
    COURSE_MODULES {
        bigint id PK
        bigint course_id FK
        varchar title
        int position
    }
    LESSONS {
        bigint id PK
        bigint module_id FK
        varchar title
        varchar youtube_video_id "video no listado; opcional"
        text content "Markdown; opcional"
        int duration_seconds
        boolean free_preview "visible sin inscripción"
        int position
    }
    QUIZZES {
        bigint id PK
        bigint module_id FK "UK: uno por módulo"
        varchar title
        int passing_score "porcentaje mínimo"
    }
    QUIZ_QUESTIONS {
        bigint id PK
        bigint quiz_id FK
        varchar statement
        int position
    }
    QUIZ_OPTIONS {
        bigint id PK
        bigint question_id FK
        varchar text
        boolean correct
        int position
    }
    LEARNING_PATHS {
        bigint id PK
        varchar slug UK
        varchar title
        varchar description
        boolean published
        int position
    }
    LEARNING_PATH_COURSES {
        bigint path_id PK
        bigint course_id PK
        int position
    }
    ENROLLMENTS {
        bigint id PK
        bigint user_id FK
        bigint course_id FK
        varchar source "FREE | PURCHASE | GRANT"
        timestamptz created_at
        timestamptz completed_at
    }
    LESSON_PROGRESS {
        bigint id PK
        bigint user_id FK
        bigint lesson_id FK
        timestamptz completed_at
    }
    QUIZ_ATTEMPTS {
        bigint id PK
        bigint user_id FK
        bigint quiz_id FK
        int score "0 a 100"
        boolean passed
        timestamptz created_at
    }
    CERTIFICATES {
        bigint id PK
        bigint enrollment_id FK "UK"
        varchar code UK "código público de verificación"
        timestamptz issued_at
    }
    LESSON_COMMENTS {
        bigint id PK
        bigint lesson_id FK
        bigint user_id FK
        bigint parent_id FK "respuesta a otro comentario"
        varchar body
        boolean hidden
        timestamptz created_at
    }
    ORDERS {
        bigint id PK
        bigint user_id FK
        bigint course_id FK
        numeric amount "precio en el momento de la compra"
        varchar currency
        varchar payment_method "YAPE | PLIN | TRANSFER | OTHER"
        varchar payment_reference "n.º de operación"
        varchar status "PENDING | APPROVED | REJECTED"
        varchar review_note
        bigint reviewed_by FK
        timestamptz reviewed_at
    }
    POSTS {
        bigint id PK
        varchar slug UK
        varchar type "ARTICLE | NEWS"
        varchar title
        varchar excerpt
        text content "Markdown"
        varchar cover_url
        bigint author_id FK
        boolean published
        timestamptz published_at
    }
    SITE_SETTINGS {
        varchar setting_key PK
        varchar value
    }
```

## Decisiones de diseño

| Decisión | Motivo |
|---|---|
| `USERS` separada de `USER_IDENTITIES` | Una persona es una sola cuenta aunque entre con correo, Google, GitHub o Discord. Añadir otro proveedor no cambia el esquema. |
| `password_hash` nulo | Quien solo usa un proveedor externo no tiene contraseña; puede crearla después con "olvidé mi contraseña". |
| `AUTH_TOKENS` guarda solo el hash | Si se filtra la base, los enlaces de verificación y recuperación no sirven. |
| Curso → Módulo → Clase | Es la estructura de temario que usan las academias de referencia y la que el reproductor recorre en orden (`position`). |
| Una clase admite video, texto o ambos | Evita tablas por tipo de clase; un video con apuntes es el caso más común. |
| El video es un `youtube_video_id` | Los videos viven en YouTube como "no listados". La academia solo entrega el identificador a quien tiene acceso. |
| `price = 0` significa gratis | Un solo campo decide si el curso se abre con inscripción directa o con compra. |
| `ENROLLMENTS` es la única fuente de acceso | Da igual cómo se obtuvo (`FREE`, `PURCHASE`, `GRANT`): tener la fila es tener el curso. |
| `ORDERS` con aprobación manual | El cobro empieza por Yape/Plin. Al aprobar una orden se crea la inscripción en la misma transacción. Una pasarela futura solo cambia quién aprueba. |
| Índice único parcial en órdenes `PENDING` | Impide dos compras abiertas del mismo curso por el mismo estudiante. |
| `LESSON_PROGRESS` por usuario y clase | El porcentaje se calcula, no se guarda: no puede desincronizarse si se añaden clases. |
| `CERTIFICATES.code` público | Cualquiera puede verificar un certificado sin iniciar sesión y sin exponer ids internos. |
| `SITE_SETTINGS` clave-valor | Redes sociales, Discord e instrucciones de pago se cambian desde el panel sin desplegar. |
| Contenido en Markdown | Se escribe cómodo y el servidor lo convierte a HTML saneado; nunca se guarda HTML del usuario. |

## Reglas de negocio

- Un curso se **completa** cuando todas sus clases están marcadas como vistas y todos los cuestionarios
  de sus módulos están aprobados. En ese momento se emite el certificado.
- Las clases con `free_preview` se pueden ver sin inscripción; el resto exige inscripción.
- Solo se listan públicamente los cursos `PUBLISHED`, las rutas y publicaciones con `published = true`.
- Los comentarios solo los pueden escribir estudiantes inscritos; un administrador puede ocultarlos.
