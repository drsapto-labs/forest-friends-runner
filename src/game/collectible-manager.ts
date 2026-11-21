/**
 * Collectible Manager — Manajemen Buah & Bintang Ajaib
 * Menghasilkan wortel manis, stroberi, dan bintang yang meluncur ke arah pemain.
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

  public update(dt: number, speed: number, playerLane: number, playerJumping: boolean): number {
    let scoreGained = 0;

    // Gerakkan item ke arah kamera (Z dari 0 ke 1)
    const zSpeed = speed * dt * 0.0018;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]!;
      item.z += zSpeed;
      item.bobPhase += dt * 4;

      // Cek tabrakan / koleksi dengan karakter pemain
      // Hitbox pemaaf (generous) khusus balita 4 tahun: toleransi Z dan Lane yang longgar
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
    // Tentukan jalur (0, 1, atau 2)
    const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const rand = Math.random();
    let type: CollectibleType = 'CARROT';

    if (rand < 0.2) {
      type = 'STAR';
    } else if (rand < 0.5) {
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

      const bobY = Math.sin(item.bobPhase) * 12 * proj.scale;
      const drawX = proj.x;
      const drawY = proj.y - 45 * proj.scale + bobY;

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(proj.scale * 1.25, proj.scale * 1.25);

      if (item.type === 'CARROT') {
        this.drawCarrot(ctx);
      } else if (item.type === 'STRAWBERRY') {
        this.drawStrawberry(ctx);
      } else {
        this.drawStar(ctx);
      }

      ctx.restore();
    }
  }

  private drawCarrot(ctx: CanvasRenderingContext2D): void {
    // Bayangan lembut di bawah
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Daun Wortel Hijau Segar
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(-4, -18, 5, 10, -0.3, 0, Math.PI * 2);
    ctx.ellipse(4, -18, 5, 10, 0.3, 0, Math.PI * 2);
    ctx.ellipse(0, -22, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Badan Wortel Oranye Segar
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.quadraticCurveTo(-8, 10, 0, 22);
    ctx.quadraticCurveTo(8, 10, 10, -12);
    ctx.quadraticCurveTo(0, -16, -10, -12);
    ctx.fill();

    // Garis strip wortel
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(2, -6);
    ctx.moveTo(-2, 4);
    ctx.lineTo(4, 4);
    ctx.stroke();
  }

  private drawStrawberry(ctx: CanvasRenderingContext2D): void {
    // Daun hijau
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(0, -14, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Buah stroberi merah muda manis
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.quadraticCurveTo(-14, 10, 0, 18);
    ctx.quadraticCurveTo(14, 10, 12, -10);
    ctx.quadraticCurveTo(0, -14, -12, -10);
    ctx.fill();

    // Bintik biji kuning berkilau
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-4, -4, 1.5, 0, Math.PI * 2);
    ctx.arc(4, -4, 1.5, 0, Math.PI * 2);
    ctx.arc(0, 4, 1.5, 0, Math.PI * 2);
    ctx.arc(-3, 10, 1.5, 0, Math.PI * 2);
    ctx.arc(3, 10, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;

    const r = 18;
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
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

