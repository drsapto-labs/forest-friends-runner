/**
 * Collectible Manager — Manajemen Buah & Bintang Ajaib
 * Menghasilkan wortel manis, stroberi, dan Bintang Berlian Kontras Tinggi.
 */

import { soundEngine } from '@audio/audio-synth';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HORIZON_Y,
  PLAYER_Z,
  ROAD_BOTTOM_WIDTH,
  ROAD_TOP_WIDTH,
} from '@utils/constants';
import { project3DTo2D } from '@utils/helpers';
import type { ParticleSystem } from './particle-system';

export type CollectibleType = 'CARROT' | 'STRAWBERRY' | 'STAR';

export interface Collectible {
  id: number;
  lane: 0 | 1 | 2;
  z: number;
  type: CollectibleType;
  bobPhase: number;
  collected: boolean;
}

export class CollectibleManager {
  private items: Collectible[] = [];
  private nextId = 1;
  private spawnTimer = 0;
  private readonly particleSystem: ParticleSystem;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  public reset(): void {
    this.items = [];
    this.spawnTimer = 0;
  }

  public update(dt: number, speed: number, playerLane: number, _playerJumping: boolean): number {
    let scoreGained = 0;

    // Gerakkan item ke arah kamera (Z dari 0 ke 1)
    const zSpeed = speed * dt * 0.0018;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]!;
      item.z += zSpeed;
      item.bobPhase += dt * 4;

      // Cek tabrakan / koleksi dengan karakter pemain
      // Hitbox pemaaf (generous) khusus balita 4 tahun
      if (!item.collected && Math.abs(item.z - PLAYER_Z) < 0.08) {
        const laneDist = Math.abs(item.lane - playerLane);
        if (laneDist < 0.52) {
          // Sukses terkumpul!
          item.collected = true;

          const proj = project3DTo2D(
            item.lane,
            item.z,
            GAME_WIDTH,
            GAME_HEIGHT,
            HORIZON_Y,
            ROAD_TOP_WIDTH,
            ROAD_BOTTOM_WIDTH
          );

          if (item.type === 'STAR') {
            soundEngine.playStar();
            this.particleSystem.emitCollect(proj.x, proj.y, true);
            scoreGained += 50;
          } else if (item.type === 'STRAWBERRY') {
            soundEngine.playCarrot();
            this.particleSystem.emitCollect(proj.x, proj.y, false);
            scoreGained += 25;
          } else {
            soundEngine.playCarrot();
            this.particleSystem.emitCollect(proj.x, proj.y, false);
            scoreGained += 10;
          }
        }
      }

      // Hapus jika sudah lewat dari layar atau sudah terkumpul
      if (item.z > 1.05 || item.collected) {
        this.items.splice(i, 1);
      }
    }

    // Spawn item baru secara berkala
    this.spawnTimer += dt;
    if (this.spawnTimer > 0.85) {
      this.spawnTimer = 0;
      this.spawnWave();
    }

    return scoreGained;
  }

  private spawnWave(): void {
    const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const rand = Math.random();
    let type: CollectibleType = 'CARROT';

    if (rand < 0.28) {
      type = 'STAR';
    } else if (rand < 0.55) {
      type = 'STRAWBERRY';
    }

    this.items.push({
      id: this.nextId++,
      lane,
      z: 0.05,
      type,
      bobPhase: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Urutkan render dari yang terjauh (z kecil) ke terdekat
    const sorted = [...this.items].sort((a, b) => a.z - b.z);

    for (const item of sorted) {
      if (item.collected) continue;

      const proj = project3DTo2D(
        item.lane,
        item.z,
        GAME_WIDTH,
        GAME_HEIGHT,
        HORIZON_Y,
        ROAD_TOP_WIDTH,
        ROAD_BOTTOM_WIDTH
      );

      const bobY = Math.sin(item.bobPhase) * 14 * proj.scale;
      const drawX = proj.x;
      const drawY = proj.y - 48 * proj.scale + bobY;

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(proj.scale * 1.35, proj.scale * 1.35);

      if (item.type === 'CARROT') {
        this.drawCarrot(ctx);
      } else if (item.type === 'STRAWBERRY') {
        this.drawStrawberry(ctx);
      } else {
        this.drawHighContrastStar(ctx, item.bobPhase);
      }

      ctx.restore();
    }
  }

  private drawCarrot(ctx: CanvasRenderingContext2D): void {
    // Bayangan lembut di bawah
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Daun Wortel Hijau Segar
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(-5, -18, 5, 11, -0.3, 0, Math.PI * 2);
    ctx.ellipse(5, -18, 5, 11, 0.3, 0, Math.PI * 2);
    ctx.ellipse(0, -22, 4, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Badan Wortel Oranye Menyala
    ctx.fillStyle = '#ff7a00';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -12);
    ctx.quadraticCurveTo(-9, 10, 0, 22);
    ctx.quadraticCurveTo(9, 10, 11, -12);
    ctx.quadraticCurveTo(0, -16, -11, -12);
    ctx.fill();
    ctx.stroke();

    // Garis strip wortel
    ctx.strokeStyle = '#d9480f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(2, -5);
    ctx.moveTo(-2, 5);
    ctx.lineTo(4, 5);
    ctx.stroke();
  }

  private drawStrawberry(ctx: CanvasRenderingContext2D): void {
    // Bayangan
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Daun hijau
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(0, -14, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Buah stroberi merah merona dengan outline putih tajam
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-13, -10);
    ctx.quadraticCurveTo(-15, 10, 0, 19);
    ctx.quadraticCurveTo(15, 10, 13, -10);
    ctx.quadraticCurveTo(0, -14, -13, -10);
    ctx.fill();
    ctx.stroke();

    // Bintik biji kuning
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-4, -4, 1.5, 0, Math.PI * 2);
    ctx.arc(4, -4, 1.5, 0, Math.PI * 2);
    ctx.arc(0, 4, 1.5, 0, Math.PI * 2);
    ctx.arc(-3, 11, 1.5, 0, Math.PI * 2);
    ctx.arc(3, 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Bintang Berlian Kontras Tinggi (High-Contrast Cosmic Diamond Star)
   * Menggunakan kontras komplementer Biru/Cyan elektrik + perisai pendaran ungu
   * sehingga SANGAT KONTRAS dan langsung terlihat jelas di atas jalan oranye.
   */
  private drawHighContrastStar(ctx: CanvasRenderingContext2D, phase: number): void {
    ctx.save();

    // 1. Perisai Aura Pendaran Ungu/Indigo (Aura Glow Shield)
    // Menghilangkan tabrakan warna antara jalan oranye dan bintang
    const pulse = Math.sin(phase * 1.5) * 3;
    const auraRadius = 26 + pulse;
    const auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, auraRadius);
    auraGrad.addColorStop(0, 'rgba(99, 102, 241, 0.85)'); // Indigo cerah
    auraGrad.addColorStop(0.65, 'rgba(139, 92, 246, 0.45)'); // Ungu violet
    auraGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Kilau Silang Berputar di Luar (Sparkling Satellite Stars)
    ctx.save();
    ctx.rotate(phase * 0.8);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.arc(auraRadius - 4, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Badan Bintang Cyan Elektrik / Berlian Biru (Komplementer Oranye)
    const r = 20;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        r * Math.cos(((18 + i * 72) * Math.PI) / 180),
        -r * Math.sin(((18 + i * 72) * Math.PI) / 180)
      );
      ctx.lineTo(
        (r / 2) * Math.cos(((54 + i * 72) * Math.PI) / 180),
        -(r / 2) * Math.sin(((54 + i * 72) * Math.PI) / 180)
      );
    }
    ctx.closePath();

    // Gradasi Cyan Elektrik ke Biru Safir
    const starGrad = ctx.createLinearGradient(-r, -r, r, r);
    starGrad.addColorStop(0, '#67e8f9'); // Cyan terang
    starGrad.addColorStop(0.5, '#00f0ff'); // Neon Aqua
    starGrad.addColorStop(1, '#0284c7'); // Ocean Blue
    ctx.fillStyle = starGrad;
    ctx.fill();

    // Border Putih Tebal & Bersih (Maximum Edge Contrast)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 4. Inti Berlian Putih Berkilau di Tengah
    const rInner = 8;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        rInner * Math.cos(((18 + i * 72) * Math.PI) / 180),
        -rInner * Math.sin(((18 + i * 72) * Math.PI) / 180)
      );
      ctx.lineTo(
        (rInner / 2) * Math.cos(((54 + i * 72) * Math.PI) / 180),
        -(rInner / 2) * Math.sin(((54 + i * 72) * Math.PI) / 180)
      );
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 5. Mata Bintang Lucu Ceria (Kawaii Smiling Eyes untuk Balita)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-4, -1, 1.8, 0, Math.PI * 2);
    ctx.arc(4, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Kilau titik putih mata
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.6, -1.6, 0.8, 0, Math.PI * 2);
    ctx.arc(3.4, -1.6, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
