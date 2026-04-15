# Resumen de Videos

Este proyecto es una aplicación web que permite procesar la URL de un video de YouTube para generar un resumen, traducciones (inglés y español) y una lista de capítulos. La aplicación consta de un frontend en JavaScript puro y un backend en Node.js que interactúa con AWS S3 y Amazon Transcribe.

## Características

### Frontend
- **Interfaz de Usuario:** Una página web con un campo de entrada para la URL del video y un botón "Subir".
- **Diseño:** Se agregó un degradado de fondo basado en las paletas de colores de AWS.
- **Arquitectura Modular:** Frontend estructurado en módulos (utils, services) para una mejor organización y mantenibilidad.
- **Resultados:** Muestra cuatro cuadros de resultados: "Resumen", "English", "Español" y "Capítulos".
- **Interactividad:** Los cuadros de resultados están ocultos por defecto y se muestran solo después de que el procesamiento se completa.
- **Polling de Resultados:** El frontend sondea periódicamente al backend para obtener el estado y los resultados de la transcripción.
- **Loader y Estado:** Un indicador de "Cargando..." o "Procesando..." y mensajes de estado detallados aparecen mientras se espera la respuesta del backend y la transcripción de AWS.
- **Estilo:** El input y el botón tienen un estilo moderno y alineado. Los capítulos se muestran como una lista.

### Backend (Node.js)
- **API REST:** Un servidor Express con un endpoint POST `/process-video` para iniciar el procesamiento y un endpoint GET `/results/:fileName` para consultar los resultados.
- **Arquitectura Modular:** Backend estructurado en módulos (config, controllers, services, routes) para una mejor organización y mantenibilidad.
- **Descarga de YouTube:** Utiliza `@distube/ytdl-core` (un fork mantenido de `ytdl-core`) para descargar videos directamente desde URLs de YouTube.
- **Integración S3:** Sube el video a un bucket S3 configurado, específicamente a la carpeta `raw-videos/`. El video se streamea directamente desde YouTube a S3, sin almacenarse temporalmente en el disco local del servidor, optimizando el uso de recursos.
- **Integración Amazon Transcribe (vía Eventos S3):** El backend no inicia directamente los trabajos de Transcribe. Se asume que una configuración de Eventos S3 en tu bucket dispara automáticamente un trabajo de Amazon Transcribe cuando un nuevo video se sube a `raw-videos/`.
- **Recuperación de Resultados:** El backend lee los archivos de transcripción y resumen generados por Transcribe (y otros procesos) desde S3.
- **CORS:** Configurado para permitir solicitudes desde el frontend.

## Estructura del Proyecto

```
.
├── index.html
├── styles/
│   └── main.css
├── scripts/
│   ├── utils/
│   │   ├── domElements.js
│   │   └── display.js
│   ├── services/
│   │   └── videoProcessor.js
│   └── app.js
└── backend/
    ├── src/
    │   ├── config/
    │   │   └── aws.js
    │   ├── controllers/
    │   │   └── videoController.js
    │   ├── services/
    │   │   ├── s3Service.js
    │   │   └── youtubeService.js
    │   ├── routes/
    │   │   └── index.js
    │   └── app.js
    ├── .env                    // Archivo para variables de entorno
    ├── package.json
    ├── package-lock.json
    └── server.js
```

## Configuración y Ejecución

### 1. Configuración del Backend

#### Requisitos
- Node.js (versión 14 o superior recomendada)
- npm (viene con Node.js)
- Cuenta de AWS con credenciales de acceso y un bucket S3.
- **Configuración de Eventos S3:** Debes configurar las notificaciones de eventos en tu bucket S3 para que, al subir un archivo `.mp4` a la carpeta `raw-videos/`, se dispare un trabajo de Amazon Transcribe.

#### Estructura de Carpetas en S3
Asegúrate de que tu bucket S3 tenga (o que tus procesos generen) la siguiente estructura de carpetas para los archivos de salida:
- `raw-videos/`: Contendrá los videos `.mp4` originales subidos.
- `transcriptions/`: Contendrá el JSON de transcripción principal generado por Amazon Transcribe (ej: `transcripcion-video.json`).
- `Chapters/`: Contendrá el JSON de capítulos (ej: `capitulos-video.json`).
- `outputs/`: Contendrá los archivos de texto de resumen en inglés y español.
    - `resumen-en-*.txt` (para el resumen en inglés)
    - `resumen-es-*.txt` (para el resumen en español)

#### Pasos
1.  **Navega al directorio `backend`:**
    ```bash
    cd backend
    ```
2.  **Instala las dependencias:**
    ```bash
    npm install
    ```
3.  **Configura tus credenciales de AWS y el nombre del bucket (usando `.env`):**
    Crea un archivo llamado `.env` en el directorio `backend` (al mismo nivel que `package.json` y `server.js`).
    Dentro de este archivo, agrega tus credenciales de AWS y el nombre de tu bucket S3. Reemplaza los valores de ejemplo con tus datos reales:

    ```dotenv
    AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
    AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
    AWS_REGION="YOUR_REGION" # Ej: us-east-1
    S3_BUCKET_NAME="YOUR_S3_BUCKET_NAME"
    S3_TRANSCRIPTS_BUCKET_NAME="YOUR_S3_BUCKET_NAME" # Opcional: si los transcripts están en un bucket diferente
    PORT=3000
    ```
    El servidor cargará automáticamente estas variables al iniciar.

4.  **Permisos IAM:**
    Asegúrate de que el usuario de IAM cuyas credenciales usas en el `.env` tenga los siguientes permisos en tu bucket S3:
    - `s3:PutObject` (para subir videos a `raw-videos/`)
    - `s3:GetObject` (para leer los JSON/TXT de `transcriptions/`, `Chapters/`, `outputs/`)
    - `s3:ListBucket` (para listar objetos en las carpetas y encontrar el más reciente)

5.  **Inicia el servidor backend:**
    Para desarrollo (con reinicio automático):
    ```bash
    npm run dev
    ```
    Para producción:
    ```bash
    npm start
    ```
    El servidor se iniciará en `http://localhost:3000`.

### 2. Configuración y Ejecución del Frontend

#### Pasos
1.  **Abre `index.html`:**
    Simplemente abre el archivo `index.html` en tu navegador web. No requiere un servidor web para funcionar, ya que todas las operaciones de red se dirigen al backend.
2.  **URL del Backend:**
    La URL del backend ya está configurada en `scripts/services/videoProcessor.js` para `http://localhost:3000`. Si tu backend se ejecuta en una URL diferente, deberás actualizarla allí.

## Uso

1.  Asegúrate de que el servidor backend de Node.js esté corriendo (`npm run dev` o `npm start`).
2.  Abre `index.html` en tu navegador.
3.  Ingresa la URL de un video de YouTube en el campo de entrada.
4.  Haz clic en "Procesar".
5.  Verás mensajes de estado en la interfaz de usuario mientras el video se sube y se espera la transcripción. Una vez que todos los archivos de salida estén disponibles en S3, los resultados (resumen, traducciones, capítulos) aparecerán en los cuadros correspondientes.

## Docker

También puedes ejecutar la aplicación completa (frontend y backend) usando Docker y Docker Compose.

### Requisitos
- Docker
- Docker Compose

### Pasos

1.  **Configura tus credenciales de AWS en `.env`:**
    Asegúrate de que el archivo `.env` en el directorio `backend` esté completo con tus credenciales de AWS y el nombre del bucket S3, como se describe en la sección de configuración del backend.

2.  **Construye y ejecuta los contenedores:**
    Desde la raíz del proyecto (donde se encuentra `docker-compose.yml`), ejecuta el siguiente comando:
    ```bash
    docker-compose up --build
    ```
    Esto construirá la imagen de Docker para el backend, descargará la imagen de Nginx para el frontend y ejecutará ambos servicios.

3.  **Accede a la aplicación:**
    - El frontend estará disponible en `http://localhost:8080`.
    - El backend estará disponible en `http://localhost:3000`.

4.  **Para detener los contenedores:**
    ```bash
    docker-compose down
    ```


---
🤖 Generated with [opencode](https://opencode.ai)
