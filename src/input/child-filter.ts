/**
 * Child Pose Filter — Mesin Pemfilter & Mitigasi Kesalahan Gerak Anak 4+ Tahun
 *
 * Mengatasi 2 masalah utama:
 * 1. UNDER-SENSITIVITY:
 *    - Tubuh anak kecil (~1m) menghasilkan delta pixel kecil di kamera.
 *    - Diatasi dengan "Body-Width Normalization": pergeseran diukur terhadap lebar bahu anak,
 *      bukan koordinat absolut layar. Jarak ke kamera tidak lagi mempengaruhi sensitivitas.
 *
 * 2. OVER-SENSITIVITY & FLICKERING (JITTER):
 *    - Diatasi dengan EMA adaptif (halus saat diam, cepat saat bergerak).
 *    - Schmitt Trigger (Hysteresis): Ambang batas masuk (0.32) dan keluar (0.16) berbeda
 *      sehingga berdiri di perbatasan tidak menyebabkan karakter bergetar bolak-balik jalur.
 *    - Torso Center of Mass: Menolehkan kepala tidak memicu perpindahan jalur.
 */

import { CHILD_TRACKING } from '@utils/constants';
import { clamp } from '@utils/helpers';

export interface RawLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface FilterResult {
  lane: 0 | 1 | 2; // Jalur yang aktif saat ini
  normalizedOffset: number; // -1.0 (kiri) s/d +1.0 (kanan)
  smoothedComX: number; // 0..1 koordinat x ter-filter
  smoothedComY: number; // 0..1 koordinat y ter-filter
  isJumping: boolean;
  isDucking: boolean;
  isCalibrated: boolean;
  calibrationProgress: number; // 0.0 s/d 1.0
  laneChangedThisFrame: boolean;
}

export class ChildPoseFilter {
  // Koordinat terevaluasi (EMA)
  private smoothedComX = 0.5;
  private smoothedComY = 0.5;
  private prevComX = 0.5;

  // Kalibrasi Baseline
  private baselineX = 0.5;
  private baselineY = 0.5;
  private baselineShoulderWidth = 0.2;
  private baselineTorsoHeight = 0.25;
  private calibrationSamples: { x: number; y: number; sw: number; th: number }[] = [];
  private isCalibrated = false;

  // State Jalur & Hysteresis
  private currentLane: 0 | 1 | 2 = 1;
  private lastLaneChangeTime = 0;

  // Jump / Duck State
  private isJumping = false;
  private isDucking = false;
  private lastVerticalActionTime = 0;

  public resetCalibration(): void {
    this.calibrationSamples = [];
    this.isCalibrated = false;
    this.currentLane = 1;
  }

  /**
   * Proses koordinat mentah dari MediaPipe BlazePose
   * landmarks: array 33 titik pose MediaPipe
   */
  public process(
    landmarks: RawLandmark[],
    now: number = performance.now()
  ): FilterResult {
    // 1. Ekstrak landmark kunci tubuh
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    if (!leftShoulder || !rightShoulder) {
      // Data tidak lengkap, kembalikan posisi aman terakhir
      return {
        lane: this.currentLane,
        normalizedOffset: 0,
        smoothedComX: this.smoothedComX,
        smoothedComY: this.smoothedComY,
        isJumping: this.isJumping,
        isDucking: this.isDucking,
        isCalibrated: this.isCalibrated,
        calibrationProgress: this.calibrationSamples.length / CHILD_TRACKING.CALIBRATION_FRAMES,
        laneChangedThisFrame: false,
      };
    }

    // Hitung titik tengah bahu
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) * 0.5;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) * 0.5;

    // Lebar bahu aktual anak di layar saat ini (0.05 - 0.40)
    const currentShoulderWidth = Math.max(0.06, Math.abs(leftShoulder.x - rightShoulder.x));

    // Hitung Torso Center of Mass (COM)
    let rawComX = shoulderMidX;
    let rawComY = shoulderMidY;
    let currentTorsoHeight = this.baselineTorsoHeight;

    if (leftHip && rightHip && (leftHip.visibility ?? 1) > 0.4 && (rightHip.visibility ?? 1) > 0.4) {
      const hipMidX = (leftHip.x + rightHip.x) * 0.5;
      const hipMidY = (leftHip.y + rightHip.y) * 0.5;
      rawComX = shoulderMidX * 0.6 + hipMidX * 0.4;
      rawComY = shoulderMidY * 0.6 + hipMidY * 0.4;
      currentTorsoHeight = Math.max(0.1, Math.abs(hipMidY - shoulderMidY));
    }

    // 2. Adaptive Exponential Moving Average (EMA)
    // Menghilangkan jitter getaran kamera tanpa menciptakan lag saat anak melangkah
    const deltaMove = Math.abs(rawComX - this.prevComX);
    const alpha = deltaMove > 0.015 ? CHILD_TRACKING.EMA_ALPHA_MOVING : CHILD_TRACKING.EMA_ALPHA_STEADY;
    this.smoothedComX = this.smoothedComX * (1 - alpha) + rawComX * alpha;
    this.smoothedComY = this.smoothedComY * (1 - alpha) + rawComY * alpha;
    this.prevComX = this.smoothedComX;

    // 3. Fase Kalibrasi Awal
    if (!this.isCalibrated) {
      this.calibrationSamples.push({
        x: this.smoothedComX,
        y: this.smoothedComY,
        sw: currentShoulderWidth,
        th: currentTorsoHeight,
      });

      if (this.calibrationSamples.length >= CHILD_TRACKING.CALIBRATION_FRAMES) {
        // Rata-ratakan sampel
        const sum = this.calibrationSamples.reduce(
          (acc, cur) => ({
            x: acc.x + cur.x,
            y: acc.y + cur.y,
            sw: acc.sw + cur.sw,
            th: acc.th + cur.th,
          }),
          { x: 0, y: 0, sw: 0, th: 0 }
        );
        const count = this.calibrationSamples.length;
        this.baselineX = sum.x / count;
        this.baselineY = sum.y / count;
        this.baselineShoulderWidth = sum.sw / count;
        this.baselineTorsoHeight = sum.th / count;
        this.isCalibrated = true;
      }

      return {
        lane: 1,
        normalizedOffset: 0,
        smoothedComX: this.smoothedComX,
        smoothedComY: this.smoothedComY,
        isJumping: false,
        isDucking: false,
        isCalibrated: false,
        calibrationProgress: this.calibrationSamples.length / CHILD_TRACKING.CALIBRATION_FRAMES,
        laneChangedThisFrame: false,
      };
    }

    // 4. Normalisasi Relatif Lebar Tubuh (Mitigasi Under-Sensitivity)
    // Catatan: Karena webcam di-mirror (efek cermin), jika anak bergerak ke kanan fisiknya (kiri di kamera),
    // kita balik tanda agar gerak kanan fisik = karakter ke kanan game.
    // Normalized offset: -1.0 (sangat kiri) s/d +1.0 (sangat kanan)
    const effectiveShoulderWidth = Math.max(0.08, this.baselineShoulderWidth);
    // Di mirror view: bergerak ke kanan fisik = rawComX di kamera mengecil
    const physicalXOffset = (this.baselineX - this.smoothedComX) / effectiveShoulderWidth;
    const clampedOffset = clamp(physicalXOffset, -1.5, 1.5);

    // 5. Hysteresis (Schmitt Trigger) & Deadzone (Mitigasi Over-Sensitivity & Flickering)
    const canChangeLane = now - this.lastLaneChangeTime > CHILD_TRACKING.LANE_COOLDOWN_MS;
    let newLane: 0 | 1 | 2 = this.currentLane;

    const stepThresh = CHILD_TRACKING.LANE_STEP_THRESHOLD; // e.g. 0.35
    const returnThresh = CHILD_TRACKING.HYSTERESIS_CENTER_RETURN; // e.g. 0.18

    if (canChangeLane) {
      if (this.currentLane === 1) {
        // Sedang di TENGAH
        if (clampedOffset < -stepThresh) {
          newLane = 0; // Geser ke KIRI
        } else if (clampedOffset > stepThresh) {
          newLane = 2; // Geser ke KANAN
        }
      } else if (this.currentLane === 0) {
        // Sedang di KIRI: harus melewati batas hysteresis untuk kembali ke tengah
        if (clampedOffset > -returnThresh) {
          newLane = 1; // Kembali ke TENGAH
        }
      } else if (this.currentLane === 2) {
        // Sedang di KANAN: harus melewati batas hysteresis untuk kembali ke tengah
        if (clampedOffset < returnThresh) {
          newLane = 1; // Kembali ke TENGAH
        }
      }
    }

    const laneChangedThisFrame = newLane !== this.currentLane;
    if (laneChangedThisFrame) {
      this.currentLane = newLane;
      this.lastLaneChangeTime = now;
    }

    // 6. Deteksi Lompat (Jump) & Tunduk (Duck)
    const deltaY = (this.smoothedComY - this.baselineY) / Math.max(0.12, this.baselineTorsoHeight);
    const canTriggerVertical = now - this.lastVerticalActionTime > CHILD_TRACKING.VERTICAL_COOLDOWN_MS;

    if (canTriggerVertical) {
      if (deltaY < CHILD_TRACKING.JUMP_DELTA_Y) {
        // Badan naik signifikan = LOMPAT
        this.isJumping = true;
        this.isDucking = false;
        this.lastVerticalActionTime = now;
      } else if (deltaY > CHILD_TRACKING.DUCK_DELTA_Y) {
        // Badan turun signifikan = TUNDUK / JONGKOK
        this.isDucking = true;
        this.isJumping = false;
        this.lastVerticalActionTime = now;
      } else {
        this.isJumping = false;
        this.isDucking = false;
      }
    }

    return {
      lane: this.currentLane,
      normalizedOffset: clampedOffset,
      smoothedComX: this.smoothedComX,
      smoothedComY: this.smoothedComY,
      isJumping: this.isJumping,
      isDucking: this.isDucking,
      isCalibrated: this.isCalibrated,
      calibrationProgress: 1.0,
      laneChangedThisFrame,
    };
  }
}

