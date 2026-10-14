# MONKEY COFFE DEV'S

### Proyecto OpenCode, se agradece a cualquier persona que quiera apoyar dentro de la web

Academia en línea de programación, POO, bases de datos, ciberseguridad e IA: cursos con video, rutas de
aprendizaje, cuestionarios, certificados verificables, blog, noticias y comunidad.

- **Backend:** Java 21, Spring Boot 4.1 (Web MVC, Security, Data JPA), PostgreSQL 16, Flyway.
- **Frontend:** Angular 21 con render en servidor (SSR).
- **Modelo de datos:** [docs/DER.md](docs/DER.md).

## Qué incluye

| Área | Funcionalidad |
|---|---|
| Catálogo | Categorías, cursos gratuitos y de pago, módulos, clases (video de YouTube y/o apuntes en Markdown), vista previa gratuita, rutas de aprendizaje |
| Aprendizaje | Inscripción, progreso por clase, cuestionarios por módulo, certificado PDF con código de verificación público, comentarios con respuestas |
| Cuentas | Registro con correo y contraseña, verificación y recuperación por correo, acceso con Google, GitHub y Discord |
| Pagos | Compra con confirmación manual (Yape, Plin, transferencia): el estudiante informa su operación y un administrador la aprueba |
| Sitio | Portada con la mascota, últimos videos de YouTube, estado del Discord, enlaces a TikTok y redes, blog y noticias |
| Panel | Cursos y temario, categorías, rutas, publicaciones, pagos, moderación de comentarios, usuarios y ajustes del sitio |

## Estructura

```
backend/cmd/src/main/java/com/monkeycoffedevs/cmd
├── common     Errores de la API, Markdown seguro, slugs, paginación
├── config     Seguridad, proveedores OAuth, propiedades
├── user       Cuentas, sesión, login social, correos
├── catalog    Categorías, cursos, módulos, clases, cuestionarios, rutas
├── learning   Inscripciones, progreso, intentos, certificados, comentarios
├── billing    Órdenes de compra
└── content    Publicaciones, ajustes del sitio, YouTube y Discord

frontend/src/app
├── core       Modelos, clientes de la API, sesión, guardas
├── shared     Componentes y utilidades reutilizables
├── layout     Cabecera y pie
└── pages      Una carpeta/archivo por pantalla (admin/ para el panel)
```

Cada módulo del backend depende solo de los que tiene encima en la lista (`billing` → `learning` → `catalog`
→ `user`). Los cambios de esquema se hacen con una migración nueva (`V3__...sql`), nunca editando una aplicada.

## Ejecutar en local

```bash
cp .env.example .env        # rellenar DB_PASSWORD, APP_ADMIN_EMAIL y APP_ADMIN_PASSWORD
docker compose up --build
```

Abrir <http://localhost:4000> e ingresar con el correo y la contraseña del administrador. En el panel,
**Ajustes del sitio** permite poner el Discord, YouTube, TikTok y las instrucciones de pago.

Para desarrollar con recarga en caliente:

```bash
docker compose up db                                   # solo la base de datos (publicar el puerto 5432)
cd backend/cmd && ./mvnw spring-boot:run               # API en :8080 (necesita las variables DB_* y APP_ADMIN_*)
cd frontend && npm install && npm start                # sitio en :4200, reenvía /api a :8080
```

## Tests

```bash
cd backend/cmd && ./mvnw test      # requiere Docker: levanta un PostgreSQL real con Testcontainers
```

| Suite | Qué cubre |
|---|---|
| `AuthIntegrationTest` | Registro, sesión, bloqueo por intentos, CSRF, permisos por rol, enlace de cuentas sociales |
| `AcademyFlowIntegrationTest` | De publicar un curso a obtener el certificado; compras; comentarios; rutas; blog; ajustes |
| `CommonUnitTest`, `YouTubeIdsTest`, `SocialFeedParserTest` | Markdown seguro, slugs, enlaces de YouTube, lectura del feed |

## Seguridad

- Sesión en cookie `HttpOnly`; el navegador no guarda tokens. CSRF por cookie + cabecera en toda escritura.
- Contraseñas con BCrypt (coste 12) y bloqueo de 15 minutos tras 5 intentos fallidos.
- Los enlaces de verificación y recuperación son de un solo uso y solo se guarda su hash.
- El contenido se escribe en Markdown y se sirve como HTML saneado; el HTML escrito a mano se muestra como texto.
- La API no se publica: solo el servidor del frontend la alcanza por la red interna.
- Autorización en dos capas: por ruta (rol) y en los servicios (inscripción, autoría).

## Despliegue

En producción: **https://monkey-coffe-devs.vercel.app** (Dokploy, proyecto `monkey-coffe-devs`, con
`deploy/vercel` como proxy HTTPS). Redes, login social y correo: [docs/CONFIGURACION.md](docs/CONFIGURACION.md).

Tres servicios: PostgreSQL, `backend/cmd` (Dockerfile, puerto 8080, sin dominio público) y `frontend`
(Dockerfile, puerto 4000, con el dominio). Variables en [.env.example](.env.example). Con HTTPS, poner
`SESSION_COOKIE_SECURE=true`, `APP_BASE_URL=https://tu-dominio` y `SITE_HOSTS=tu-dominio`.

## Pendiente

- Pasarela de pagos automática (Mercado Pago, Culqi…): hoy la aprobación es manual.
- Subida de imágenes: las portadas y avatares se indican por enlace.
- Sesiones en base de datos o Redis para ejecutar más de una instancia de la API.
- Reordenar módulos y clases arrastrando (hoy se usa el campo «Orden»).
