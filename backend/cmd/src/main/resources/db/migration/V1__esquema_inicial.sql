-- Esquema inicial de Monkey Coffe Dev's. Implementa docs/DER.md.

-- ---------------------------------------------------------------- Usuarios y acceso
CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(254) NOT NULL,
    password_hash   VARCHAR(100),
    display_name    VARCHAR(80)  NOT NULL,
    avatar_url      VARCHAR(500),
    role            VARCHAR(20)  NOT NULL DEFAULT 'STUDENT',
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_attempts INT          NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('STUDENT', 'ADMIN'))
);

-- Una fila por cuenta externa enlazada (Google, GitHub, Discord).
CREATE TABLE user_identities (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          BIGINT       NOT NULL,
    provider         VARCHAR(20)  NOT NULL,
    provider_user_id VARCHAR(120) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_identities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_identities_provider_user UNIQUE (provider, provider_user_id),
    CONSTRAINT uk_identities_user_provider UNIQUE (user_id, provider),
    CONSTRAINT ck_identities_provider CHECK (provider IN ('GOOGLE', 'GITHUB', 'DISCORD'))
);

-- Enlaces de un solo uso enviados por correo. Solo se guarda el hash del token.
CREATE TABLE auth_tokens (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    type       VARCHAR(30) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_auth_tokens_hash UNIQUE (token_hash),
    CONSTRAINT ck_auth_tokens_type CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET'))
);

-- ---------------------------------------------------------------- Catálogo
CREATE TABLE categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug        VARCHAR(80)  NOT NULL,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(300),
    color       VARCHAR(7)   NOT NULL DEFAULT '#E8431F',
    position    INT          NOT NULL DEFAULT 0,
    CONSTRAINT uk_categories_slug UNIQUE (slug)
);

CREATE TABLE courses (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         VARCHAR(120)   NOT NULL,
    title        VARCHAR(150)   NOT NULL,
    summary      VARCHAR(300)   NOT NULL,
    description  TEXT           NOT NULL DEFAULT '',
    category_id  BIGINT         NOT NULL,
    level        VARCHAR(20)    NOT NULL DEFAULT 'BEGINNER',
    cover_url    VARCHAR(500),
    price        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency     VARCHAR(3)     NOT NULL DEFAULT 'PEN',
    status       VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    featured     BOOLEAN        NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uk_courses_slug UNIQUE (slug),
    CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT ck_courses_level CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    CONSTRAINT ck_courses_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT ck_courses_price CHECK (price >= 0)
);

CREATE INDEX ix_courses_category ON courses (category_id);
CREATE INDEX ix_courses_status ON courses (status, published_at DESC);

CREATE TABLE course_modules (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id BIGINT       NOT NULL,
    title     VARCHAR(150) NOT NULL,
    position  INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

CREATE INDEX ix_modules_course ON course_modules (course_id, position);

-- Una clase es un video de YouTube, un artículo en Markdown, o ambos (video con apuntes).
CREATE TABLE lessons (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_id        BIGINT       NOT NULL,
    title            VARCHAR(150) NOT NULL,
    youtube_video_id VARCHAR(20),
    content          TEXT         NOT NULL DEFAULT '',
    duration_seconds INT          NOT NULL DEFAULT 0,
    free_preview     BOOLEAN      NOT NULL DEFAULT FALSE,
    position         INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES course_modules (id) ON DELETE CASCADE,
    CONSTRAINT ck_lessons_duration CHECK (duration_seconds >= 0)
);

CREATE INDEX ix_lessons_module ON lessons (module_id, position);

-- Cuestionario opcional al final de un módulo.
CREATE TABLE quizzes (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_id     BIGINT       NOT NULL,
    title         VARCHAR(150) NOT NULL,
    passing_score INT          NOT NULL DEFAULT 70,
    CONSTRAINT fk_quizzes_module FOREIGN KEY (module_id) REFERENCES course_modules (id) ON DELETE CASCADE,
    CONSTRAINT uk_quizzes_module UNIQUE (module_id),
    CONSTRAINT ck_quizzes_passing_score CHECK (passing_score BETWEEN 1 AND 100)
);

CREATE TABLE quiz_questions (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id   BIGINT       NOT NULL,
    statement VARCHAR(500) NOT NULL,
    position  INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
);

CREATE INDEX ix_questions_quiz ON quiz_questions (quiz_id, position);

CREATE TABLE quiz_options (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT       NOT NULL,
    text        VARCHAR(300) NOT NULL,
    correct     BOOLEAN      NOT NULL DEFAULT FALSE,
    position    INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES quiz_questions (id) ON DELETE CASCADE
);

CREATE INDEX ix_options_question ON quiz_options (question_id, position);

-- Ruta de aprendizaje: una secuencia ordenada de cursos.
CREATE TABLE learning_paths (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug        VARCHAR(120) NOT NULL,
    title       VARCHAR(150) NOT NULL,
    description VARCHAR(600) NOT NULL DEFAULT '',
    published   BOOLEAN      NOT NULL DEFAULT FALSE,
    position    INT          NOT NULL DEFAULT 0,
    CONSTRAINT uk_paths_slug UNIQUE (slug)
);

CREATE TABLE learning_path_courses (
    path_id   BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    position  INT    NOT NULL DEFAULT 0,
    CONSTRAINT pk_path_courses PRIMARY KEY (path_id, course_id),
    CONSTRAINT fk_path_courses_path FOREIGN KEY (path_id) REFERENCES learning_paths (id) ON DELETE CASCADE,
    CONSTRAINT fk_path_courses_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------- Aprendizaje
CREATE TABLE enrollments (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL,
    course_id    BIGINT      NOT NULL,
    source       VARCHAR(20) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses (id),
    CONSTRAINT uk_enrollments_user_course UNIQUE (user_id, course_id),
    CONSTRAINT ck_enrollments_source CHECK (source IN ('FREE', 'PURCHASE', 'GRANT'))
);

CREATE INDEX ix_enrollments_course ON enrollments (course_id);

CREATE TABLE lesson_progress (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL,
    lesson_id    BIGINT      NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
    CONSTRAINT uk_progress_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE TABLE quiz_attempts (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    quiz_id    BIGINT      NOT NULL,
    score      INT         NOT NULL,
    passed     BOOLEAN     NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE,
    CONSTRAINT ck_attempts_score CHECK (score BETWEEN 0 AND 100)
);

CREATE INDEX ix_attempts_user_quiz ON quiz_attempts (user_id, quiz_id);

CREATE TABLE certificates (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    enrollment_id BIGINT      NOT NULL,
    code          VARCHAR(20) NOT NULL,
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_certificates_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT uk_certificates_enrollment UNIQUE (enrollment_id),
    CONSTRAINT uk_certificates_code UNIQUE (code)
);

CREATE TABLE lesson_comments (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lesson_id  BIGINT        NOT NULL,
    user_id    BIGINT        NOT NULL,
    parent_id  BIGINT,
    body       VARCHAR(2000) NOT NULL,
    hidden     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT fk_comments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES lesson_comments (id) ON DELETE CASCADE
);

CREATE INDEX ix_comments_lesson ON lesson_comments (lesson_id, created_at);

-- ---------------------------------------------------------------- Pagos
-- Compra de un curso. El pago se confirma a mano: el estudiante informa su operación y un admin la aprueba.
CREATE TABLE orders (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id           BIGINT         NOT NULL,
    course_id         BIGINT         NOT NULL,
    amount            NUMERIC(10, 2) NOT NULL,
    currency          VARCHAR(3)     NOT NULL,
    payment_method    VARCHAR(20)    NOT NULL,
    payment_reference VARCHAR(80)    NOT NULL,
    status            VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    review_note       VARCHAR(300),
    reviewed_by       BIGINT,
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_orders_course FOREIGN KEY (course_id) REFERENCES courses (id),
    CONSTRAINT fk_orders_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
    CONSTRAINT ck_orders_method CHECK (payment_method IN ('YAPE', 'PLIN', 'TRANSFER', 'OTHER')),
    CONSTRAINT ck_orders_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT ck_orders_amount CHECK (amount > 0)
);

CREATE INDEX ix_orders_status ON orders (status, created_at);
-- Un mismo estudiante no puede tener dos compras en curso del mismo curso.
CREATE UNIQUE INDEX uk_orders_pending ON orders (user_id, course_id) WHERE status = 'PENDING';

-- ---------------------------------------------------------------- Contenido del sitio
CREATE TABLE posts (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         VARCHAR(160) NOT NULL,
    type         VARCHAR(20)  NOT NULL,
    title        VARCHAR(160) NOT NULL,
    excerpt      VARCHAR(300) NOT NULL,
    content      TEXT         NOT NULL DEFAULT '',
    cover_url    VARCHAR(500),
    author_id    BIGINT       NOT NULL,
    published    BOOLEAN      NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_posts_slug UNIQUE (slug),
    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users (id),
    CONSTRAINT ck_posts_type CHECK (type IN ('ARTICLE', 'NEWS'))
);

CREATE INDEX ix_posts_listing ON posts (type, published, published_at DESC);

-- Ajustes editables desde el panel: redes sociales, Discord, instrucciones de pago.
CREATE TABLE site_settings (
    setting_key VARCHAR(60)   PRIMARY KEY,
    value       VARCHAR(2000) NOT NULL DEFAULT ''
);
