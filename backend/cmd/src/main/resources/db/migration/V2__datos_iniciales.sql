-- Categorías con las que arranca la academia y ajustes del sitio vacíos (se rellenan desde el panel).

INSERT INTO categories (slug, name, description, color, position) VALUES
    ('programacion-basica', 'Programación Básica', 'Lógica, algoritmos y tus primeras líneas de código.', '#E8431F', 1),
    ('poo', 'POO', 'Clases, objetos, herencia y diseño orientado a objetos.', '#2F4FB5', 2),
    ('base-de-datos', 'Base de Datos', 'Modelado, SQL y persistencia de datos.', '#1F9D74', 3),
    ('ciberseguridad', 'Ciberseguridad', 'Hacking ético, redes y defensa de sistemas.', '#8A3FD1', 4),
    ('inteligencia-artificial', 'Inteligencia Artificial', 'Fundamentos de IA y modelos aplicados.', '#D99A16', 5);

INSERT INTO site_settings (setting_key, value) VALUES
    ('youtube_url', ''),
    ('youtube_channel_id', ''),
    ('tiktok_url', ''),
    ('discord_invite_url', ''),
    ('discord_guild_id', ''),
    ('github_url', ''),
    ('payment_instructions', 'Realiza el pago por Yape o Plin y registra aquí el número de operación.');
