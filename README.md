# SWF Player · Local

Aplicación web moderna, profesional e intuitiva para reproducir juegos y animaciones **Flash (.swf)** de forma 100 % local y offline.

Powered by **[Ruffle](https://ruffle.rs)** — emulador open-source de Flash Player.

## Características

- ✅ Abre archivos `.swf` desde tu dispositivo (arrastrar & soltar o selector)
- ✅ Tema claro y oscuro (se guarda la preferencia)
- ✅ Diseño totalmente responsivo (móvil, tablet y escritorio)
- ✅ Pantalla completa
- ✅ Recargar juego
- ✅ Interfaz limpia y moderna
- ✅ Funciona offline (con servidor local)

## Cómo usar

### En PC (recomendado)

1. Descomprime este ZIP.
2. **No abras `index.html` directamente** (file://). Usa un servidor local:
   - **Python**: `python -m http.server 8080` (dentro de la carpeta)
   - **Node**: `npx serve .`
   - **VS Code**: extensión "Live Server"
3. Abre `http://localhost:8080` en el navegador.
4. Arrastra un archivo `.swf` o haz clic en **Seleccionar archivo**.

### En Android

1. Copia la carpeta completa al teléfono.
2. Usa una app de servidor HTTP local (ej. **Simple HTTP Server**, **KSWEB**, **Termux** + `python -m http.server`).
3. Abre la IP local (ej. `http://127.0.0.1:8080`) en Chrome.
4. **Importante**: el servidor debe servir los archivos `.wasm` con el tipo MIME `application/wasm`.

## Error "Failed to load Ruffle WASM"

Este error significa que el navegador no pudo cargar el motor WebAssembly de Ruffle. Causas habituales:

1. **Servidor incorrecto**: estás abriendo el archivo con `file://` o un servidor que no sirve bien `.wasm`.
2. **MIME type**: el servidor envía `.wasm` como `application/octet-stream` en lugar de `application/wasm`.
3. **Ruta incompleta**: no estás sirviendo la carpeta raíz completa (debe existir `lib/ruffle/*.wasm`).

### Solución rápida en Android (Termux)

```bash
cd /ruta/a/swf-player
python -m http.server 8080
```

Luego abre `http://127.0.0.1:8080` en Chrome.

### Solución con npx (PC o Termux con Node)

```bash
npx serve .
```

## Estructura del proyecto

```
swf-player/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js      ← Punto de entrada
│   ├── ui.js        ← Interfaz y eventos
│   ├── player.js    ← Lógica de Ruffle
│   ├── theme.js     ← Tema claro/oscuro
│   └── utils.js     ← Utilidades
├── lib/
│   └── ruffle/      ← Archivos de Ruffle (self-hosted)
└── README.md
```

## Requisitos

- Navegador moderno con soporte de WebAssembly (Chrome, Firefox, Edge, Safari recientes).
- Servidor HTTP local (no abrir el HTML directamente con file://).

## Licencia

- Esta aplicación: uso libre.
- Ruffle: Apache 2.0 / MIT (ver carpeta `lib/ruffle/`).

---

Hecho con ❤️ para preservar los juegos clásicos de Flash.
