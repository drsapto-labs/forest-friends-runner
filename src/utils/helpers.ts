/**
 * Utility functions for math, interpolation, and drawing
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Mendapatkan posisi (X, Y) dan Skala objek pada Z-depth tertentu
 * z = 0.0 (cakrawala) s/d 1.0 (bagian paling bawah layar)
 * lane = 0 (kiri), 1 (tengah), 2 (kanan) - bisa berupa float untuk perpindahan mulus
 */
export function project3DTo2D(
  lane: number,
  z: number,
  screenW: number,
  screenH: number,
  horizonY: number,
  roadTopW: number,
  roadBottomW: number
): { x: number; y: number; scale: number; laneWidth: number } {
  // Kurva z non-linear agar ilusi kedalaman terasa lebih nyata
  const curvedZ = Math.pow(clamp(z, 0, 1), 1.35);

  const y = horizonY + curvedZ * (screenH - horizonY);
  const roadWidth = lerp(roadTopW, roadBottomW, curvedZ);
  const laneWidth = roadWidth / 3;

  // Pusat jalan di tengah layar secara horizontal
  const roadCenterX = screenW / 2;
  const roadLeftX = roadCenterX - roadWidth / 2;

  // Posisi X di jalur yang bersangkutan: lane=0 -> kiri, 1 -> tengah, 2 -> kanan
  const x = roadLeftX + (lane + 0.5) * laneWidth;
  const scale = lerp(0.18, 1.0, curvedZ);

  return { x, y, scale, laneWidth };
}

