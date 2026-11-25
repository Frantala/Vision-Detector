# VisionLab — Detector de objetos

Aplicación web de visión por computadora que reconoce objetos en tiempo real usando React, TensorFlow.js y el modelo COCO-SSD. La inferencia se realiza en el navegador; el video de la cámara no se graba ni se envía a un servidor.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre la dirección local que muestra Vite y permite el acceso a la cámara cuando el navegador lo solicite. La primera carga del modelo requiere conexión a internet.

## Cámara y permisos

El acceso a la cámara funciona en `localhost` o en un sitio servido mediante HTTPS. Si la cámara no se inicia, permite el acceso desde los permisos del navegador y pulsa **Reintentar cámara**. Si el navegador no puede abrir el dispositivo, cierra las aplicaciones de videollamadas y las otras pestañas que puedan estar usando la cámara. En Windows, comprueba también **Configuración > Privacidad y seguridad > Cámara** y habilita el acceso para las aplicaciones de escritorio.

## Scripts

- `npm run dev`: inicia el servidor local de desarrollo.
- `npm run build`: genera la versión de producción en `dist/`.
- `npm run preview`: sirve localmente la versión de producción.
- `npm run lint`: ejecuta ESLint.
