/**
 * Forest Friends Runner — Constants & Configurations
 * Disesuaikan khusus untuk kenyamanan motorik anak 4+ tahun
 */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Jalur permainan (3 Lanes: Kiri = 0, Tengah = 1, Kanan = 2)
export const TOTAL_LANES = 3;
export const LANE_LEFT = 0;
export const LANE_CENTER = 1;
export const LANE_RIGHT = 2;

// Parameter Perspektif 2.5D Jalan
export const HORIZON_Y = 260; // Titik lenyap cakrawala (vanishing point)
export const ROAD_TOP_WIDTH = 140; // Lebar jalan di ujung cakrawala
export const ROAD_BOTTOM_WIDTH = 980; // Lebar jalan di bagian bawah layar
export const PLAYER_Z = 0.82; // Kedalaman karakter (0 = jauh di cakrawala, 1 = depan kamera)

// Kecepatan dan Gameplay Ramah Anak (Pace Lembut)
export const INITIAL_SPEED = 280; // pixel/detik dalam Z-space
export const MAX_SPEED = 520;
export const SPEED_ACCELERATION = 2.5; // Kenaikan kecepatan sangat bertahap
export const MAX_HEARTS = 3; // 3 Kesempatan / Berry Energi
export const INVINCIBLE_TIME_AFTER_HIT = 2.4; // 2.4 detik perlindungan berkedip setelah kena rintangan

// Mitigasi Gerak Tubuh untuk Anak 4 Tahun (Child Body Tracking Mitigations)
export const CHILD_TRACKING = {
  // Smoothing EMA: 0.28 memberikan respons responsif namun bebas getar (jitter-free)
  EMA_ALPHA_STEADY: 0.22,
  EMA_ALPHA_MOVING: 0.45,

  // Normalisasi relatif terhadap lebar bahu (Body-Width Invariance)
  // Anak melangkah ~35% dari lebar tubuhnya sudah memicu perpindahan jalur
  LANE_STEP_THRESHOLD: 0.35,

  // Hysteresis (Schmitt Trigger) agar tidak flickering saat berdiri di perbatasan
  HYSTERESIS_CENTER_RETURN: 0.18,

  // Deadzone tengah: goyangan kecil di dalam ±12% diabaikan
  CENTER_DEADZONE: 0.12,

  // Cooldown antar perpindahan jalur (mencegah double-trigger jika anak melompat goyang)
  LANE_COOLDOWN_MS: 240,

  // Ambang batas lompat & tunduk (relatif terhadap tinggi torso)
  JUMP_DELTA_Y: -0.22, // Bahu naik > 22% tinggi torso
  DUCK_DELTA_Y: 0.26,  // Bahu turun > 26% tinggi torso
  VERTICAL_COOLDOWN_MS: 400,

  // Durasi kalibrasi cepat (frame)
  CALIBRATION_FRAMES: 25,
};

