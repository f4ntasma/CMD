# Configuración: redes, login social y correo

Sitio en producción: **https://monkey-coffe-devs.vercel.app**

Todo lo de esta guía es opcional: la academia funciona sin ello. Cada parte se activa en cuanto se
configura. Orden recomendado: 1 (cinco minutos) → 4 (correo) → 2 y 3 (login social).

> **No pegues contraseñas ni secretos en chats ni en el repositorio.** Ponlos directamente en Dokploy
> (paso «Dónde se ponen las claves» al final).

---

## 1. Redes y comunidad (desde el panel, sin desplegar nada)

Entra como administrador → **Panel** → **Ajustes del sitio**.

| Campo | De dónde sale |
|---|---|
| Invitación de Discord | En Discord: clic derecho en el servidor → **Invitar gente** → **Editar enlace de invitación** → «Expirar después de: Nunca» → copiar `https://discord.gg/…` |
| ID del servidor de Discord | Ajustes de usuario → **Avanzado** → activar **Modo desarrollador**. Luego clic derecho en el servidor → **Copiar ID del servidor**. Además: Ajustes del servidor → **Widget** → activar **Habilitar widget** (sin esto no se ve cuánta gente hay en línea) |
| Canal de YouTube | La dirección de tu canal: `https://www.youtube.com/@tucanal` |
| ID del canal de YouTube | <https://www.youtube.com/account_advanced> → **ID del canal** (empieza por `UC…`). Con esto la portada muestra tus últimos 6 videos |
| TikTok | `https://www.tiktok.com/@tuusuario` |
| GitHub | `https://github.com/f4ntasma/CMD` u otro |
| Instrucciones de pago | Número de Yape/Plin y nombre del titular. Es texto público |

Guardar. La portada y el pie se actualizan al momento (los videos y el Discord pueden tardar hasta 15 minutos).

---

## 2. Login con Google

1. Entra a <https://console.cloud.google.com> con la cuenta de la academia y crea un proyecto
   («Monkey Coffe Devs»).
2. **APIs y servicios → Pantalla de consentimiento de OAuth** → tipo **Externo**. Rellena nombre de la app,
   correo de asistencia y logo (puedes usar el mono). Permisos: `email` y `profile` (no hace falta más).
   Al terminar pulsa **Publicar app**; si la dejas «En pruebas», solo podrán entrar los correos que añadas.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo **Aplicación web**:
   - Orígenes autorizados de JavaScript: `https://monkey-coffe-devs.vercel.app`
   - URI de redireccionamiento autorizados: `https://monkey-coffe-devs.vercel.app/login/oauth2/code/google`
4. Copia el **ID de cliente** y el **Secreto** → variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## 3. Login con GitHub y Discord

**GitHub**

1. <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
2. Homepage URL: `https://monkey-coffe-devs.vercel.app`
3. Authorization callback URL: `https://monkey-coffe-devs.vercel.app/login/oauth2/code/github`
4. **Register application** → **Generate a new client secret**.
5. Variables `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET`.

**Discord**

1. <https://discord.com/developers/applications> → **New Application** («Monkey Coffe Devs»).
2. Menú **OAuth2**: copia el **Client ID** y pulsa **Reset Secret** para obtener el secreto.
3. En **Redirects** → **Add Redirect**: `https://monkey-coffe-devs.vercel.app/login/oauth2/code/discord` → **Save Changes**.
4. Variables `DISCORD_CLIENT_ID` y `DISCORD_CLIENT_SECRET`.

La URL de retorno tiene que coincidir **exactamente**, letra por letra. Si cambias de dominio, actualízala en
los tres proveedores y en `APP_BASE_URL`.

---

## 4. Correo (verificación de cuenta y «olvidé mi contraseña»)

Sin esto, los enlaces de los correos solo se escriben en el log de la API y los estudiantes no los reciben.

**Opción A — Gmail (rápida, hasta ~500 correos al día)**

1. La cuenta de Gmail necesita la verificación en dos pasos activada.
2. <https://myaccount.google.com/apppasswords> → crea una contraseña de aplicación («Monkey Coffe Devs»).
   Te da 16 letras: esa es la contraseña SMTP (no la de tu cuenta).
3. Variables:

   ```
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=monkeycoffedevs@gmail.com
   MAIL_PASSWORD=<las 16 letras, sin espacios>
   MAIL_FROM=monkeycoffedevs@gmail.com
   ```

**Opción B — Brevo (gratis hasta 300 correos al día, mejor entrega)**

1. Crea una cuenta en <https://www.brevo.com> y verifica el remitente.
2. **SMTP y API** → **Claves SMTP** → genera una.
3. `MAIL_HOST=smtp-relay.brevo.com`, `MAIL_PORT=587`, `MAIL_USER` = el usuario SMTP que muestra Brevo,
   `MAIL_PASSWORD` = la clave, `MAIL_FROM` = el remitente verificado.

---

## Dónde se ponen las claves

1. Abre Dokploy → proyecto **monkey-coffe-devs** → aplicación **cmd-api** → pestaña **Environment**.
2. Rellena las variables que correspondan (ya están creadas, vacías).
3. **Save** y luego **Deploy** (las variables se leen al arrancar).
4. Comprueba: en **Ingresar** aparecen los botones de los proveedores que configuraste.

Para comprobar el correo: crea una cuenta de prueba y revisa que llegue el mensaje «Confirma tu correo».
