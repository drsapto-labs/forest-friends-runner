/**
 * Webcam Tracker — Integrasi MediaPipe PoseLandmarker dengan PiP Visualizer Ceria
 * 100% on-device WASM, zero server upload (Privasi penuh anak).
 * Dilengkapi GPU -> CPU fallback, DOM-attached video guard, dan auto-render mirror.
 */

import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { ChildPoseFilter } from './child-filter';
import { GameAction, type InputManager } from './input-manager';

export type TrackerStatus = 'IDLE' | 'LOADING' | 'READY' | 'CALIBRATING' | 'TRACKING' | 'DENIED' | 'ERROR';

export class WebcamTracker {
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private landmarker: PoseLandmarker | null = null;
  private animFrameId: number | null = null;
  private status: TrackerStatus = 'IDLE';
  private statusMessage = '';

  private readonly filter = new ChildPoseFilter();
  private readonly inputManager: InputManager;
  private pipCanvas: HTMLCanvasElement | null = null;
  private pipCtx: CanvasRenderingContext2D | null = null;
  private isProcessingLandmarker = false;

  // Callback status
  public onStatusChange?: (status: TrackerStatus, msg?: string) => void;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
  }

  public get currentStatus(): TrackerStatus {
    return this.status;
  }

  public get isTracking(): boolean {
    return this.status === 'TRACKING';
  }

  public setPipCanvas(canvas: HTMLCanvasElement): void {
    this.pipCanvas = canvas;
    this.pipCtx = canvas.getContext('2d', { willReadFrequently: false });
  }

  public recalibrate(): void {
    this.filter.resetCalibration();
    this.setStatus('CALIBRATING', 'Berdiri di tengah cermin...');
  }

  private setStatus(status: TrackerStatus, message: string = ''): void {
    this.status = status;
    this.statusMessage = message;
    console.log(`[WebcamTracker] ${status}: ${message}`);
    this.onStatusChange?.(status, message);
  }

  /**
   * Mulai webcam dan inisialisasi MediaPipe
   */
  public async start(): Promise<void> {
    if (this.status === 'LOADING' || this.status === 'TRACKING') return;

    this.setStatus('LOADING', 'Membuka kamera petualang...');

    // 1. Cek dukungan kamera di browser
    if (!navigator.mediaDevices) {
      this.setStatus('DENIED', 'Browser tidak mendukung akses kamera — gunakan keyboard panah');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
    } catch (err) {
      console.error('[WebcamTracker] getUserMedia gagal:', err);
      this.setStatus('DENIED', 'Izin kamera belum diberikan — klik tombol Kamera di layar');
      return;
    }

    // 2. Siapkan elemen video di DOM (Wajib di WebKit/Safari agar feed mengalir)
    if (!this.videoEl) {
      this.videoEl = document.createElement('video');
      this.videoEl.setAttribute('playsinline', 'true');
      this.videoEl.setAttribute('webkit-playsinline', 'true');
      this.videoEl.muted = true;
      this.videoEl.autoplay = true;
      this.videoEl.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 320px;
        height: 240px;
        opacity: 0;
        pointer-events: none;
        z-index: -100;
      `;
      document.body.appendChild(this.videoEl);
    }

    this.videoEl.srcObject = this.stream;

    // Pastikan video mulai berputar
    await new Promise<void>((resolve) => {
      if (!this.videoEl) return resolve();

      const tryPlay = () => {
        if (!this.videoEl) return resolve();
        this.videoEl
          .play()
          .then(() => resolve())
          .catch((e) => {
            console.warn('[WebcamTracker] video.play() warning:', e);
            resolve();
          });
      };

      if (this.videoEl.readyState >= 2) {
        tryPlay();
      } else {
        this.videoEl.onloadeddata = tryPlay;
        this.videoEl.onloadedmetadata = tryPlay;
        setTimeout(tryPlay, 1200); // Batas aman 1.2 detik
      }
    });

    // Mulai render PiP video segera agar pengguna melihat cermin aktif!
    this.startDetectionLoop();

    // 3. Load MediaPipe PoseLandmarker (WASM)
    try {
      this.setStatus('LOADING', 'Menyiapkan kecerdasan gerak...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
      );

      // Coba GPU delegate terlebih dahulu, jika gagal otomatis fallback ke CPU
      try {
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuErr) {
        console.warn('[WebcamTracker] GPU delegate gagal, beralih ke CPU delegate:', gpuErr);
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      this.setStatus('CALIBRATING', 'Ayo berdiri di tengah cermin!');
    } catch (err) {
      console.error('[WebcamTracker] Gagal load model MediaPipe:', err);
      this.setStatus('ERROR', 'Gagal memuat sensor gerak — tombol panah keyboard tetap aktif');
    }
  }

  public stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      if (this.videoEl.parentElement) {
        this.videoEl.parentElement.removeChild(this.videoEl);
      }
      this.videoEl = null;
    }
    this.poseLandmarkerClose();
    this.setStatus('IDLE');
  }

  private poseLandmarkerClose(): void {
    try {
      this.landmarker?.close();
    } catch {
      // Abaikan jika sudah tertutup
    }
    this.landmarker = null;
  }

  private startDetectionLoop(): void {
    if (this.animFrameId !== null) return;

    const loop = (timestamp: number) => {
      // 1. Gambar live webcam feed ke PiP Canvas terlebih dahulu (Real-Time Mirror)
      let poseLandmarks: { x: number; y: number }[] | undefined;
      let filterResult: ReturnType<ChildPoseFilter['process']> | undefined;

      if (this.videoEl && this.videoEl.readyState >= 2 && this.landmarker && !this.isProcessingLandmarker) {
        try {
          this.isProcessingLandmarker = true;
          const results: PoseLandmarkerResult = this.landmarker.detectForVideo(this.videoEl, timestamp);
          poseLandmarks = results.landmarks[0];

          if (poseLandmarks && poseLandmarks.length > 0) {
            filterResult = this.filter.process(poseLandmarks, timestamp);

            if (!filterResult.isCalibrated) {
              if (this.status !== 'CALIBRATING') {
                this.setStatus('CALIBRATING', 'Tersenyum dan berdiri di tengah...');
              }
            } else {
              if (this.status !== 'TRACKING') {
                this.setStatus('TRACKING', 'Deteksi Tubuh Aktif!');
              }

              // Emit perpindahan jalur ke game engine
              if (filterResult.laneChangedThisFrame) {
                if (filterResult.lane === 0) this.inputManager.emit(GameAction.LANE_LEFT);
                else if (filterResult.lane === 1) this.inputManager.emit(GameAction.LANE_CENTER);
                else if (filterResult.lane === 2) this.inputManager.emit(GameAction.LANE_RIGHT);
              }

              // Emit lompat & tunduk
              if (filterResult.isJumping) {
                this.inputManager.emit(GameAction.JUMP);
              }
              if (filterResult.isDucking) {
                this.inputManager.emit(GameAction.DUCK_START);
              }
            }
          }
        } catch (err) {
          console.warn('[WebcamTracker] Error detectForVideo:', err);
        } finally {
          this.isProcessingLandmarker = false;
        }
      }

      // Render tampilan visual PiP
      this.renderPip(filterResult, poseLandmarks);

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Render cermin PiP: selalu menampilkan video asli pengguna + overlay jalur ceria
   */
  private renderPip(
    filterResult?: ReturnType<ChildPoseFilter['process']>,
    landmarks?: { x: number; y: number }[]
  ): void {
    if (!this.pipCanvas || !this.pipCtx) return;
    const ctx = this.pipCtx;
    const w = this.pipCanvas.width;
    const h = this.pipCanvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1. Gambar Video Kamera Live (jika feed video sudah siap)
    if (this.videoEl && this.videoEl.readyState >= 2) {
      ctx.save();
      // Efek Cermin (Horizontal Flip)
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.videoEl, 0, 0, w, h);
      ctx.restore();
    } else {
      // Placeholder jika video belum siap
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Menyiapkan Kamera...', w / 2, h / 2);
    }

    // 2. Gambar 3 Zona Jalur Berwarna Ceria di atas cermin
    const zoneW = w / 3;
    const activeLane = filterResult?.isCalibrated ? filterResult.lane : 1;
    const isCalibrated = filterResult?.isCalibrated ?? false;

    const zones = [
      { lane: 0, color: 'rgba(52, 211, 153, 0.22)', activeColor: 'rgba(52, 211, 153, 0.65)', label: 'KIRI', icon: '🌿' },
      { lane: 1, color: 'rgba(251, 191, 36, 0.18)', activeColor: 'rgba(251, 191, 36, 0.65)', label: 'TENGAH', icon: '⭐' },
      { lane: 2, color: 'rgba(96, 165, 250, 0.22)', activeColor: 'rgba(96, 165, 250, 0.65)', label: 'KANAN', icon: '🌸' },
    ];

    zones.forEach((z, i) => {
      const zx = i * zoneW;
      const isActive = isCalibrated && activeLane === z.lane;

      ctx.fillStyle = isActive ? z.activeColor : z.color;
      ctx.fillRect(zx, 0, zoneW, h);

      // Garis pemisah zona
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(zx, 0);
        ctx.lineTo(zx, h);
        ctx.stroke();
      }

      // Label & Icon Jalur
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${z.icon} ${z.label}`, zx + zoneW / 2, h - 8);
      ctx.shadowBlur = 0;
    });

    // 3. Gambar Titik Bahu & Dada Lembut jika terdeteksi
    if (landmarks && landmarks.length > 12) {
      const ls = landmarks[11];
      const rs = landmarks[12];
      if (ls && rs) {
        const mx = (1 - (ls.x + rs.x) * 0.5) * w;
        const my = ((ls.y + rs.y) * 0.5) * h;

        // Lingkaran berpendar lembut di dada
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 4. Progress Bar Kalibrasi jika sedang kalibrasi
    if (this.status === 'CALIBRATING' && filterResult && !filterResult.isCalibrated) {
      const progress = filterResult.calibrationProgress;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, w, 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ayo Berdiri di Tengah Cermin!', w / 2, 14);

      // Progress bar kecil
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(20, 20, w - 40, 4);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(20, 20, (w - 40) * Math.min(1, progress), 4);
    }

    ctx.restore();
  }
}
