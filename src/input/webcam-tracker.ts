/**
 * Webcam Tracker — Integrasi MediaPipe PoseLandmarker dengan PiP Visualizer Ceria
 * 100% on-device WASM, zero server upload (Privasi penuh anak).
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

  // Callback status
  public onStatusChange?: (status: TrackerStatus, msg?: string) => void;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
  }

  public get currentStatus(): TrackerStatus {
    return this.status;
  }

  public setPipCanvas(canvas: HTMLCanvasElement): void {
    this.pipCanvas = canvas;
    this.pipCtx = canvas.getContext('2d');
  }

  public recalibrate(): void {
    this.filter.resetCalibration();
    this.setStatus('CALIBRATING', 'Berdiri di tengah cermin...');
  }

  private setStatus(status: TrackerStatus, message: string = ''): void {
    this.status = status;
    this.statusMessage = message;
    this.onStatusChange?.(status, message);
  }

  /**
   * Mulai webcam dan inisialisasi MediaPipe
   */
  public async start(): Promise<void> {
    this.setStatus('LOADING', 'Membuka kamera petualang...');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
    } catch {
      this.setStatus('DENIED', 'Kamera tidak aktif — gunakan keyboard panah ◀ ▶');
      return;
    }

    try {
      this.setStatus('LOADING', 'Memuat kecerdasan gerak...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
      );

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
    } catch (err) {
      console.warn('Gagal memuat MediaPipe model, fallback ke keyboard:', err);
      this.setStatus('ERROR', 'Gagal memuat sensor gerak — gunakan keyboard');
      return;
    }

    // Siapkan video element di memori
    this.videoEl = document.createElement('video');
    this.videoEl.style.display = 'none';
    this.videoEl.srcObject = this.stream;
    this.videoEl.autoplay = true;
    this.videoEl.playsInline = true;

    await new Promise<void>((resolve) => {
      if (!this.videoEl) return resolve();
      this.videoEl.onloadedmetadata = () => {
        void this.videoEl?.play();
        resolve();
      };
    });

    this.setStatus('CALIBRATING', 'Ayo berdiri di tengah cermin!');
    this.startDetectionLoop();
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
      this.videoEl = null;
    }
    this.setStatus('IDLE');
  }

  private startDetectionLoop(): void {
    const loop = (timestamp: number) => {
      if (!this.videoEl || this.videoEl.readyState < 2 || !this.landmarker) {
        this.animFrameId = requestAnimationFrame(loop);
        return;
      }

      const results: PoseLandmarkerResult = this.landmarker.detectForVideo(this.videoEl, timestamp);
      const poseLandmarks = results.landmarks[0];

      if (poseLandmarks && poseLandmarks.length > 0) {
        const filterResult = this.filter.process(poseLandmarks, timestamp);

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

        // Render PiP Mirror preview
        this.renderPipPreview(filterResult.lane, filterResult.isCalibrated, filterResult.calibrationProgress, poseLandmarks);
      } else {
        // Tidak ada tubuh di kamera
        this.renderPipEmpty();
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Render cermin PiP dengan 3 zona jalur berwarna ceria ramah anak
   */
  private renderPipPreview(
    activeLane: 0 | 1 | 2,
    isCalibrated: boolean,
    progress: number,
    landmarks: { x: number; y: number }[]
  ): void {
    if (!this.pipCanvas || !this.pipCtx || !this.videoEl) return;
    const ctx = this.pipCtx;
    const w = this.pipCanvas.width;
    const h = this.pipCanvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1. Gambar video kamera secara mirror (dibalik horizontal agar seperti cermin)
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoEl, 0, 0, w, h);
    ctx.restore();

    // 2. Gambar 3 Zona Jalur Transparan Ceria
    const zoneW = w / 3;
    const zones = [
      { lane: 0, color: 'rgba(52, 211, 153, 0.28)', activeColor: 'rgba(52, 211, 153, 0.7)', label: 'KIRI', icon: '🌿' },
      { lane: 1, color: 'rgba(251, 191, 36, 0.24)', activeColor: 'rgba(251, 191, 36, 0.7)', label: 'TENGAH', icon: '⭐' },
      { lane: 2, color: 'rgba(96, 165, 250, 0.28)', activeColor: 'rgba(96, 165, 250, 0.7)', label: 'KANAN', icon: '🌸' },
    ];

    zones.forEach((z, i) => {
      const zx = i * zoneW;
      const isActive = isCalibrated && activeLane === z.lane;

      ctx.fillStyle = isActive ? z.activeColor : z.color;
      ctx.fillRect(zx, 0, zoneW, h);

      // Garis pemisah zona
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(zx, 0);
        ctx.lineTo(zx, h);
        ctx.stroke();
      }

      // Label & Icon Jalur
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${z.icon} ${z.label}`, zx + zoneW / 2, h - 10);
      ctx.shadowBlur = 0;
    });

    // 3. Gambar titik-titik lembut landmark tubuh (bahu & dada)
    const ls = landmarks[11];
    const rs = landmarks[12];
    if (ls && rs) {
      // Ingat mirror: landmark.x di mirror adalah 1 - landmark.x
      const mx = (1 - (ls.x + rs.x) * 0.5) * w;
      const my = ((ls.y + rs.y) * 0.5) * h;

      // Lingkaran berpendar di dada anak
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 4. Jika sedang kalibrasi, tampilkan progress bar manis
    if (!isCalibrated) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ayo Berdiri di Tengah!', w / 2, h / 2 - 12);

      // Bar
      const barW = w * 0.7;
      const barH = 10;
      const barX = (w - barW) / 2;
      const barY = h / 2 + 6;

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(barX, barY, barW * Math.min(1, progress), barH);
    }
  }

  private renderPipEmpty(): void {
    if (!this.pipCanvas || !this.pipCtx) return;
    const ctx = this.pipCtx;
    const w = this.pipCanvas.width;
    const h = this.pipCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mencari Si Kecil...', w / 2, h / 2);
  }
}

