import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const CLASSIFICATION_MIN_SCORE = 0.55;
const MODEL_IMAGE_SIZE = 224;

function Icon({ name, size = 20 }) {
  const sharedProps = {
    'aria-hidden': true,
    fill: 'none',
    height: size,
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    width: size,
  };

  if (name === 'camera') {
    return (
      <svg {...sharedProps}>
        <path d="M14 5h-4L8.5 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5L14 5Z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  }

  if (name === 'box') {
    return (
      <svg {...sharedProps}>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v8l9 5 9-5V8M12 13v8" />
      </svg>
    );
  }

  if (name === 'activity') {
    return (
      <svg {...sharedProps}>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </svg>
    );
  }

  if (name === 'sparkles') {
    return (
      <svg {...sharedProps}>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" />
      </svg>
    );
  }

  if (name === 'refresh') {
    return (
      <svg {...sharedProps}>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const cameraRequestPendingRef = useRef(false);
  const modelLoadPromiseRef = useRef(null);
  const lastDetectionsRef = useRef('');
  const [model, setModel] = useState(null);
  const [modelStatus, setModelStatus] = useState('loading');
  const [modelError, setModelError] = useState('');
  const [cameraStatus, setCameraStatus] = useState('starting');
  const [cameraError, setCameraError] = useState('');
  const [detectedItems, setDetectedItems] = useState([]);
  const [detectionError, setDetectionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const metadataResponse = await fetch(`${import.meta.env.BASE_URL}model/metadata.json`);
      if (!metadataResponse.ok) {
        throw new Error(`No se pudo cargar metadata.json (${metadataResponse.status}).`);
      }
      const metadata = await metadataResponse.json();
      if (!Array.isArray(metadata.labels) || metadata.labels.length === 0) {
        throw new Error('El modelo no contiene etiquetas de clases.');
      }
      if (!Number.isInteger(metadata.imageSize) || metadata.imageSize !== MODEL_IMAGE_SIZE) {
        throw new Error(`El tamaño de imagen del modelo debe ser ${MODEL_IMAGE_SIZE}.`);
      }

      const classifier = await tf.loadLayersModel(`${import.meta.env.BASE_URL}model/model.json`);
      const outputShape = classifier.outputs[0]?.shape;
      if (outputShape?.[outputShape.length - 1] !== metadata.labels.length) {
        classifier.dispose();
        throw new Error('La cantidad de etiquetas no coincide con las salidas del modelo.');
      }

      return {
        classifier,
        imageSize: metadata.imageSize,
        labels: metadata.labels,
        tf,
      };
    }

    modelLoadPromiseRef.current ??= loadModel();
    modelLoadPromiseRef.current
      .then((loadedModel) => {
        if (cancelled) return;
        setModel(loadedModel);
        setModelStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('No se pudo cargar el modelo personalizado:', error);
        setModelError('No se pudo cargar el modelo personalizado. Verifica los archivos en public/model.');
        setModelStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        window.isSecureContext
          ? 'Este navegador no permite acceder a la cámara. Prueba con Chrome, Edge o Firefox actualizado.'
          : 'El navegador solo permite usar la cámara en localhost o mediante una conexión HTTPS.',
      );
      setCameraStatus('error');
      return;
    }

    if (cameraRequestPendingRef.current) return;
    cameraRequestPendingRef.current = true;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    setCameraError('');
    setCameraStatus('starting');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (!videoRef.current) {
        throw new Error('No se encontró el reproductor de video.');
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (requestId === cameraRequestRef.current) {
        setCameraStatus('active');
      }
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (requestId !== cameraRequestRef.current) return;
      streamRef.current = null;
      console.error('No se pudo iniciar la cámara:', error);

      const errorMessages = {
        AbortError: 'La cámara se interrumpió. Vuelve a intentarlo.',
        NotAllowedError: 'Permite el acceso a la cámara en tu navegador y vuelve a intentarlo.',
        NotFoundError: 'No se encontró ninguna cámara conectada a este dispositivo.',
        NotReadableError: 'El navegador no pudo iniciar la cámara. Puede estar ocupada por otra aplicación o pestaña, o bloqueada por el sistema. Cierra las apps de videollamadas y las otras pestañas que la usen; si sigue igual, revisa los permisos de cámara de Windows.',
        OverconstrainedError: 'La cámara no admite la configuración solicitada. Inténtalo de nuevo.',
        SecurityError: 'El navegador bloqueó la cámara. Abre esta página en localhost o mediante HTTPS.',
      };
      setCameraError(
        errorMessages[error.name] ?? 'No se pudo iniciar la cámara. Revisa los permisos del navegador e inténtalo de nuevo.',
      );
      setCameraStatus('error');
    } finally {
      cameraRequestPendingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const startupFrame = requestAnimationFrame(startCamera);
    return () => {
      cancelAnimationFrame(startupFrame);
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  useEffect(() => {
    if (!model || cameraStatus !== 'active') return undefined;

    let frameId;
    let active = true;
    let detecting = false;

    async function detectFrame() {
      if (!active) return;

      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        frameId = requestAnimationFrame(detectFrame);
        return;
      }

      if (!detecting) {
        detecting = true;
        try {
          const predictionTensor = model.tf.tidy(() => {
            const pixels = model.tf.browser.fromPixels(video);
            const resized = model.tf.image.resizeBilinear(pixels, [model.imageSize, model.imageSize]);
            const normalized = resized.toFloat().div(127.5).sub(1);
            const prediction = model.classifier.predict(normalized.expandDims(0));
            if (Array.isArray(prediction)) {
              throw new Error('El modelo debe producir una única salida de clasificación.');
            }
            return prediction;
          });
          let scores;
          try {
            scores = await predictionTensor.data();
          } finally {
            predictionTensor.dispose();
          }
          if (!active) return;

          const topScore = Math.max(...scores);
          const topIndex = scores.indexOf(topScore);
          const currentItems = topScore >= CLASSIFICATION_MIN_SCORE
            ? [{ label: model.labels[topIndex], score: Math.round(topScore * 100) }]
            : [];

          const serializedItems = JSON.stringify(currentItems);
          if (serializedItems !== lastDetectionsRef.current) {
            lastDetectionsRef.current = serializedItems;
            setDetectedItems(currentItems);
          }
          setDetectionError('');
        } catch (error) {
          console.error('Falló la clasificación de la imagen:', error);
          setDetectionError('Ocurrió un error durante la clasificación. Recarga la página para reiniciar.');
          active = false;
        } finally {
          detecting = false;
        }
      }

      if (active) frameId = requestAnimationFrame(detectFrame);
    }

    detectFrame();
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [model, cameraStatus]);

  const isLive = cameraStatus === 'active' && modelStatus === 'ready';
  const classCount = model?.labels.length ?? 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="VisionLab, inicio">
          <span className="brand-mark"><Icon name="sparkles" size={19} /></span>
          <span>vision<span className="brand-accent">lab</span></span>
        </a>
        <div className="topbar-meta">
          <span className="topbar-label">PROYECTO DE COMPUTER VISION</span>
          <span className="topbar-divider" />
          <span className="topbar-author">Portfolio · 2026</span>
        </div>
        <span className={`connection-pill ${isLive ? 'is-connected' : ''}`}>
          <span className="connection-dot" />
          {isLive ? 'EN VIVO' : cameraStatus === 'starting' ? 'CONECTANDO' : 'INACTIVO'}
        </span>
      </header>

      <div className="page-content" id="inicio">
        <section className="intro">
          <div className="intro-copy">
            <p className="eyebrow"><span /> INTELIGENCIA ARTIFICIAL EN EL NAVEGADOR</p>
            <h1>Las cosas que te rodean,<br /><span>ahora tienen nombre.</span></h1>
            <p className="intro-description">
              Clasificación de imágenes en tiempo real con tu modelo personalizado.
              Privado por diseño: el análisis ocurre directamente en tu dispositivo.
            </p>
          </div>
          <div className="intro-tag">
            <span className="tag-icon"><Icon name="activity" size={18} /></span>
            <span><strong>TensorFlow.js</strong><small>Inferencia en el navegador</small></span>
          </div>
        </section>

        <section className="dashboard" aria-label="Clasificador de imágenes">
          <div className="camera-card">
            <div className="card-heading">
              <div>
                <p className="section-kicker">01 — VISOR</p>
                <h2>Vista en directo</h2>
              </div>
              <span className={`camera-state ${cameraStatus === 'active' ? 'is-active' : ''}`}>
                <span className="connection-dot" />
                {cameraStatus === 'active' ? 'CÁMARA ACTIVA' : cameraStatus === 'starting' ? 'CONECTANDO' : 'SIN SEÑAL'}
              </span>
            </div>

            <div className="camera-viewport">
              <video ref={videoRef} autoPlay muted playsInline aria-label="Vista en directo de la cámara" />
              {cameraStatus === 'active' && detectedItems[0] && (
                <div className="classification-overlay">
                  {detectedItems[0].label} · {detectedItems[0].score}%
                </div>
              )}
              {cameraStatus !== 'active' && (
                <div className="camera-placeholder">
                  <div className="placeholder-icon"><Icon name="camera" size={26} /></div>
                  <strong>{cameraStatus === 'starting' ? 'Conectando con tu cámara…' : 'Tu cámara aún no está activa'}</strong>
                  <span>
                    {cameraStatus === 'starting'
                      ? 'Asegúrate de permitir el acceso cuando el navegador lo solicite.'
                      : 'Activa el permiso para empezar a detectar objetos.'}
                  </span>
                  {cameraStatus === 'error' && (
                    <button className="button button-primary" onClick={startCamera} type="button">
                      <Icon name="refresh" size={17} /> Reintentar cámara
                    </button>
                  )}
                  {cameraError && <p className="inline-error" role="alert">{cameraError}</p>}
                </div>
              )}
              {cameraStatus === 'active' && modelStatus === 'loading' && (
                <div className="model-loading"><span className="loading-spinner" /> Cargando tu modelo…</div>
              )}
              <div className="viewport-caption">
                <span><span className="legend-dot" /> CLASIFICADOR PERSONALIZADO</span>
                <span>224 × 224 · REAL-TIME</span>
              </div>
            </div>

            <div className="camera-footer">
              <span><span className="privacy-icon">◇</span> El video no se graba ni se envía</span>
              <button
                className="button button-quiet"
                disabled={cameraStatus === 'starting'}
                onClick={startCamera}
                type="button"
              >
                <Icon name={cameraStatus === 'error' ? 'refresh' : 'camera'} size={16} />
                {cameraStatus === 'active' ? 'Reconectar' : cameraStatus === 'starting' ? 'Conectando…' : 'Activar cámara'}
              </button>
            </div>
          </div>

          <aside className="insights-column">
            <div className="insights-heading">
              <div>
                <p className="section-kicker">02 — ANÁLISIS</p>
                <h2>En esta escena</h2>
              </div>
              <span className="live-indicator" title="Actualización en tiempo real"><Icon name="activity" size={17} /></span>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon mint"><Icon name="box" size={18} /></span>
                <span className="stat-value">{detectedItems.length.toString().padStart(2, '0')}</span>
                <span className="stat-label">CLASE PREDICHA</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon lavender"><Icon name="sparkles" size={18} /></span>
                <span className="stat-value">{classCount.toString().padStart(2, '0')}</span>
                <span className="stat-label">CLASES ENTRENADAS</span>
              </div>
            </div>

            <div className="detections-card">
              <div className="detections-heading">
                <span>Clase más probable</span>
                <span className="count-badge">{detectedItems.length}</span>
              </div>
              {modelStatus === 'loading' && (
                <div className="empty-state"><span className="loading-spinner" />Preparando tu modelo…</div>
              )}
              {modelStatus === 'error' && <p className="inline-error" role="alert">{modelError}</p>}
              {modelStatus === 'ready' && detectedItems.length === 0 && (
                <div className="empty-state">
                  <span className="empty-symbol"><Icon name="sparkles" size={21} /></span>
                  <strong>Listo para clasificar</strong>
                  <span>Muestra uno de los objetos entrenados frente a la cámara.</span>
                </div>
              )}
              {detectedItems.length > 0 && (
                <ul className="detection-list" aria-live="polite">
                  {detectedItems.map((item, index) => (
                    <li className="detection-item" key={`${item.label}-${index}`}>
                      <span className="object-marker"><Icon name="box" size={16} /></span>
                      <span className="object-name">{item.label}</span>
                      <span className="confidence">{item.score}%</span>
                    </li>
                  ))}
                </ul>
              )}
              {detectionError && <p className="inline-error" role="alert">{detectionError}</p>}
            </div>

            <div className="model-card">
              <span className="model-icon"><Icon name="sparkles" size={17} /></span>
              <div>
                <span className="model-title">TEACHABLE MACHINE</span>
                <span className="model-detail">{classCount} clases · modelo local</span>
              </div>
              <span className={`model-status ${modelStatus === 'ready' ? 'is-ready' : ''}`}>
                {modelStatus === 'ready' ? 'LISTO' : modelStatus === 'error' ? 'ERROR' : 'CARGANDO'}
              </span>
            </div>
          </aside>
        </section>

        <footer className="page-footer">
          <span>Construido con React <span className="footer-separator">·</span> TensorFlow.js</span>
          <span>Visión artificial, hecha accesible.</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
