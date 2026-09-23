# Table Topics AI

Noche de juegos Toastmasters: el orador improvisa en español y un proyector
**a su espalda** reacciona en directo para el público. Las decisiones las toma
[TypeSafe Jev](https://docs.typesafe.ai) (vía OpenRouter), un modelo que no
genera texto: devuelve decisiones estructuradas con probabilidades.

**Desplegado:** https://topics.esteban.site

## Los tres juegos

1. **Ilustrador automático.** Una pizarra dibuja en directo lo que el orador
   dice: Jev elige cada pocos segundos qué garabato trazar (de un vocabulario
   de ~130), con qué tamaño y color, y de vez en cuando pega una foto. Los
   trazos se dibujan animados y se enlazan con flechas, como un mapa mental.
   Desde el móvil se puede pedir «¡Que se dé la vuelta!» para que el orador
   vea su propio discurso dibujado.
2. **Subtítulos de la verdad.** En pantalla van los subtítulos en directo de
   lo que dice el orador y, debajo, en amarillo, el subtexto que Jev detecta
   (haciendo tiempo, exagerando, comida, familia, animal, confesión, chiste,
   épico, amor, quejándose…) de un banco de frases editable, en tono
   ridículo y cariñoso. Cien por cien automático, con historial y un detector
   en vivo.
3. **Banda sonora.** Jev clasifica el tono (épico, drama, suspense, romántico,
   comedia, telenovela, terror, neutro) y la música de fondo cambia con él, sin
   saltar a cada frase.

## Cómo se usa en la sala

Solo hay dos dispositivos (si no hay proyector, dos móviles: uno crea la sesión y
hace de pantalla en horizontal, el otro escanea el QR y es el micrófono):

1. **Ordenador del proyector** (con altavoces): pulsar **Crear sesión**. Esa
   misma página es la pantalla; pulsar «Empezar» para activar el sonido. Muestra
   el código y un QR.
2. **Móvil**: escanear el QR (o entrar con el código). Es el **micrófono** y el
   mando: tocar el botón de escuchar (Chrome en Android, Safari en iPhone),
   elegir juego, elegir uno de los tres temas («Otros tres» para cambiarlos) y
   pulsar **Empezar**. Desde ahí también se para, se pasa de diapositiva o de
   pista. Una ronda se para sola a los 10 minutos, y hay un tope de sesiones
   nuevas por día, para que una pestaña olvidada no salga cara. Los ajustes
   finos están en «Ajustes», al pie; ahí también se elige el **motor de decisiones**: «Nube» (rápido, por defecto) o «Local», que usa
   un modelo abierto en el Mac de casa a través de un túnel (experimento).

## Desarrollo

```bash
nvm use && pnpm install
cp .env.example .env            # OPENROUTER_KEY + credenciales de Cloudflare
pnpm dev                        # http://localhost:5173
pnpm eval                       # autoevaluación de los 3 juegos contra Jev
pnpm run deploy                 # Cloudflare Workers
```

Detalles de arquitectura y decisiones en `CLAUDE.md`. Créditos de imágenes
(Wikimedia Commons) y música (Kevin MacLeod, CC BY 4.0) en `/creditos`.
