# VisionLab — Clasificador de imágenes

Aplicación web de visión por computadora que clasifica en tiempo real las imágenes de la cámara con un modelo exportado desde Teachable Machine. La inferencia se realiza en el navegador; el video no se graba ni se envía a un servidor.

## Modelo personalizado

El modelo exportado está en `public/model/`: `model.json`, `weights.bin` y `metadata.json`. La aplicación lee las etiquetas y el tamaño de entrada desde los metadatos. TensorFlow.js ya es una dependencia del proyecto, así que no hace falta instalar otra biblioteca para cargar este formato.

Este es un clasificador de imagen, no un detector con recuadros: predice la clase más probable para el fotograma completo y no localiza varios objetos a la vez. Solo reconoce las clases con las que se entrenó. Para localizar objetos con recuadros hace falta exportar y conectar un modelo de detección distinto.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre la dirección local que muestra Vite y permite el acceso a la cámara cuando el navegador lo solicite. El modelo se sirve desde `public/model/`; no requiere descargar pesos externos.

## Cámara y permisos

El acceso a la cámara funciona en `localhost` o en un sitio servido mediante HTTPS. Si la cámara no se inicia, permite el acceso desde los permisos del navegador y pulsa **Reintentar cámara**. Si el navegador no puede abrir el dispositivo, cierra las aplicaciones de videollamadas y las otras pestañas que puedan estar usando la cámara. En Windows, comprueba también **Configuración > Privacidad y seguridad > Cámara** y habilita el acceso para las aplicaciones de escritorio.

## Scripts

- `npm run dev`: inicia el servidor local de desarrollo.
- `npm run build`: genera la versión de producción en `dist/`.
- `npm run preview`: sirve localmente la versión de producción.
- `npm run lint`: ejecuta ESLint.
