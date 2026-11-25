# VisionLab — Detector de objetos

Aplicación web de visión por computadora que reconoce objetos en tiempo real usando React, TensorFlow.js y el modelo COCO-SSD. La inferencia se realiza en el navegador; el video de la cámara no se graba ni se envía a un servidor.

## Modelo y detecciones

Las dependencias de TensorFlow y del detector se cargan bajo demanda para que el JavaScript inicial de la interfaz sea más ligero. COCO-SSD usa su base rápida Lite MobileNetV2 y un umbral de confianza del 40 % para mostrar algunas detecciones menos seguras; esto puede aumentar los falsos positivos. La primera detección todavía depende de descargar los pesos del modelo. COCO-SSD reconoce hasta 80 categorías conocidas; no puede detectar de forma fiable objetos fuera de esas categorías ni sustituye un modelo entrenado con ejemplos propios.

Teachable Machine es adecuado si quieres clasificar una escena u objeto entre tus propias clases, pero su modelo de imágenes no ofrece por sí solo recuadros para localizar varios objetos. Para localizar varios objetos personalizados se necesita entrenar un modelo de detección con imágenes etiquetadas con sus recuadros.

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
