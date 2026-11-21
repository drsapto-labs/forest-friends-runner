/**
 * Obstacle Manager — Rintangan Ceria & Ramah Balita (Non-Scary Obstacles)
 * Semak bunga membal, puding jeli pelangi, dan kubangan air berkilau.
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

export type ObstacleType = 'BUSH' | 'JELLY' | 'PUDDLE';

export interface Obstacle {
  id: number;
  lane: 0 | 1 | 2;
  z: number;
  type: ObstacleType;
  wobblePhase: number;
  hit: boolean;
}

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private nextId = 1;
  private spawnTimer = 0;

  public reset(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
  }

  public update(
    dt: number,
    speed: number,
    playerLane: number,
    playerJumping: boolean,
    isInvincible: boolean
  ): boolean {
    let playerHit = false;
    const zSpeed = speed * dt * 0.0018;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]!;
      obs.z += zSpeed;
      obs.wobblePhase += dt * 5;

      // Cek tabrakan
      if (!obs.hit && !isInvincible && Math.abs(obs.z - PLAYER_Z) < 0.055) {
        const laneDist = Math.abs(obs.lane - playerLane);

        // Jika rintangan BUSH atau PUDDLE, anak bisa melompat untuk melewatinya!
        const canJumpOver = obs.type === 'BUSH' || obs.type === 'PUDDLE';
        const avoidedByJump = canJumpOver && playerJumping;

        // Hitbox sempit di tengah jalur agar pemaaf untuk anak 4 tahun
        if (laneDist < 0.40 && !avoidedByJump) {
          obs.hit = true;
          playerHit = true;
          soundEngine.playSoftBump();
        }
      }

      // Hapus jika sudah lewat layar
      if (obs.z > 1.05) {
        this.obstacles.splice(i, 1);
      }
    }

    // Spawn rintangan baru (interval ramah anak: tidak terlalu padat)
    this.spawnTimer += dt;
    if (this.spawnTimer > 2.4) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    return playerHit;
  }

  private spawnObstacle(): void {
    // Pilih jalur acak (0, 1, 2)
    const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const types: ObstacleType[] = ['BUSH', 'JELLY', 'PUDDLE'];
    const type = types[Math.floor(Math.random() * types.length)] ?? 'BUSH';

    this.obstacles.push({
      id: this.nextId++,
      lane,
      z: 0.05,
      type,
      wobblePhase: Math.random() * Math.PI * 2,
      hit: false,
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const sorted = [...this.obstacles].sort((a, b) => a.z - b.z);

    for (const obs of sorted) {
      const proj = project3DTo2D(
        obs.lane,
        obs.z,
        GAME_WIDTH,
        GAME_HEIGHT,
        HORIZON_Y,
        ROAD_TOP_WIDTH,
        ROAD_BOTTOM_WIDTH
      );

      ctx.save();
      ctx.translate(proj.x, proj.y - 20 * proj.scale);
      ctx.scale(proj.scale * 1.3, proj.scale * 1.3);

      if (obs.type === 'BUSH') {
        this.drawBouncyBush(ctx);
      } else if (obs.type === 'JELLY') {
        this.drawRainbowJelly(ctx, obs.wobblePhase);
      } else {
        this.drawSparklePuddle(ctx);
      }

      ctx.restore();
    }
  }

  private drawBouncyBush(ctx: CanvasRenderingContext2D): void {
    // Semak daun hijau bulat
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, -6, 20, 0, Math.PI * 2);
    ctx.arc(-14, 0, 15, 0, Math.PI * 2);
    ctx.arc(14, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Bunga kecil tersenyum di atas semak
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, -14, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRainbowJelly(ctx: CanvasRenderingContext2D, phase: number): void {
    const wobble = Math.sin(phase) * 3;

    // Puding jeli tembus pandang membal
    ctx.fillStyle = 'rgba(236, 72, 153, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-18 + wobble, 10);
    ctx.quadraticCurveTo(-15 - wobble, -24, 0, -26);
    ctx.quadraticCurveTo(15 + wobble, -24, 18 - wobble, 10);
    ctx.closePath();
    ctx.fill();

    // Kilau mata jeli lucu
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6, -12, 3, 0, Math.PI * 2);
    ctx.arc(6, -12, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(-6, -12, 1.5, 0, Math.PI * 2);
    ctx.arc(6, -12, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSparklePuddle(ctx: CanvasRenderingContext2D): void {
    // Kubangan air pelangi
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Kilau riak air
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 7, 0, 0, Math.PI);
    ctx.stroke();
  }
}

