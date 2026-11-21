/**
 * Player Character — "Bun-Bun" Si Kelinci Ajaib
 * Animasi melompat, telinga bergoyang luwes, belok miring lembut, dan ekspresi menggemaskan.
 */

import { soundEngine } from '@audio/audio-synth';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HORIZON_Y,
  INVINCIBLE_TIME_AFTER_HIT,
  PLAYER_Z,
  ROAD_BOTTOM_WIDTH,
  ROAD_TOP_WIDTH,
} from '@utils/constants';
import { clamp, lerp, project3DTo2D } from '@utils/helpers';
import type { ParticleSystem } from './particle-system';

export class Player {
  private targetLane: 0 | 1 | 2 = 1;
  private currentLaneFloat = 1.0; // Interpolasi mulus antar jalur
  private tiltAngle = 0; // Kemiringan tubuh saat belok (-0.2 s/d +0.2 rad)

  // Fisika Lompat & Tunduk
  private jumpY = 0;
  private jumpVelocity = 0;
  private isJumping = false;
  private isDucking = false;
  private readonly gravity = 1800; // gravitasi lompat

  // Status Terluka / Kebal
  private invincibleTimer = 0;
  private wobbleTimer = 0;

  // Siklus Lari
  private runPhase = 0;
  private readonly particleSystem: ParticleSystem;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  public reset(): void {
    this.targetLane = 1;
    this.currentLaneFloat = 1.0;
    this.jumpY = 0;
    this.jumpVelocity = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.invincibleTimer = 0;
    this.wobbleTimer = 0;
  }

  public setTargetLane(lane: 0 | 1 | 2): void {
    if (this.targetLane !== lane) {
      this.targetLane = lane;
      soundEngine.playLaneShift();
    }
  }

  public jump(): void {
    if (!this.isJumping && !this.isDucking) {
      this.isJumping = true;
      this.jumpVelocity = -620; // Dorongan ke atas
      soundEngine.playJump();
    }
  }

  public setDucking(ducking: boolean): void {
    if (this.isDucking !== ducking && !this.isJumping) {
      this.isDucking = ducking;
      if (ducking) soundEngine.playDuck();
    }
  }

  public onHit(): void {
    this.invincibleTimer = INVINCIBLE_TIME_AFTER_HIT;
    this.wobbleTimer = 0.6; // Goyang lucu 0.6 detik
  }

  public get isInvincible(): boolean {
    return this.invincibleTimer > 0;
  }

  public get lanePosition(): number {
    return this.currentLaneFloat;
  }

  public get jumping(): boolean {
    return this.isJumping;
  }

  public update(dt: number, speed: number): void {
    // 1. Interpolasi perpindahan jalur yang kenyal (Spring Lerp)
    const laneDiff = this.targetLane - this.currentLaneFloat;
    this.currentLaneFloat += laneDiff * Math.min(1, dt * 14);

    // Miringkan badan sesuai arah belok
    const targetTilt = clamp(laneDiff * 0.28, -0.22, 0.22);
    this.tiltAngle = lerp(this.tiltAngle, targetTilt, dt * 12);

    // 2. Siklus Lari (Bunny Hop)
    this.runPhase += dt * (speed * 0.024);
    if (!this.isJumping && Math.sin(this.runPhase) < -0.85) {
      const proj = project3DTo2D(
        this.currentLaneFloat,
        PLAYER_Z,
        GAME_WIDTH,
        GAME_HEIGHT,
        HORIZON_Y,
        ROAD_TOP_WIDTH,
        ROAD_BOTTOM_WIDTH
      );
      this.particleSystem.emitFootDust(proj.x, proj.y);
    }

    // 3. Fisika Lompat
    if (this.isJumping) {
      this.jumpVelocity += this.gravity * dt;
      this.jumpY += this.jumpVelocity * dt;

      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpVelocity = 0;
        this.isJumping = false;
      }
    }

    // 4. Timer Kebal & Efek Goyang
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }
    if (this.wobbleTimer > 0) {
      this.wobbleTimer -= dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const proj = project3DTo2D(
      this.currentLaneFloat,
      PLAYER_Z,
      GAME_WIDTH,
      GAME_HEIGHT,
      HORIZON_Y,
      ROAD_TOP_WIDTH,
      ROAD_BOTTOM_WIDTH
    );

    const bobY = this.isJumping ? this.jumpY : Math.sin(this.runPhase) * 6;
    const drawX = proj.x;
    const drawY = proj.y - 48 * proj.scale + bobY;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(proj.scale * 1.5, proj.scale * 1.5);

    // Efek Berkedip saat Kebal
    if (this.invincibleTimer > 0) {
      const blink = Math.sin(this.invincibleTimer * 20);
      ctx.globalAlpha = blink > 0 ? 0.4 : 0.9;
    }

    // Kemiringan Belok / Goyang
    let rot = this.tiltAngle;
    if (this.wobbleTimer > 0) {
      rot += Math.sin(this.wobbleTimer * 30) * 0.2;
    }
    ctx.rotate(rot);

    // Gambar Bayangan di Bawah Karakter
    ctx.save();
    ctx.translate(0, -bobY + 36);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Gambar Kelinci Bun-Bun
    if (this.isDucking) {
      this.drawRollingBall(ctx);
    } else {
      this.drawBunBun(ctx);
    }

    ctx.restore();
  }

  private drawBunBun(ctx: CanvasRenderingContext2D): void {
    // 1. Telinga Panjang Berbulu Lucu
    this.drawEar(ctx, -10, -32, -0.15 + Math.sin(this.runPhase) * 0.1);
    this.drawEar(ctx, 10, -32, 0.15 - Math.sin(this.runPhase) * 0.1);

    // 2. Badan Bulat Putih Mengembang
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 8, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Syal Petualang Merah Muda
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(0, -4, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Kepala Bulat
    ctx.fillStyle = '#fdfbf7';
    ctx.beginPath();
    ctx.arc(0, -18, 18, 0, Math.PI * 2);
    ctx.fill();

    // Pipi Merona Merah Muda
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(-11, -12, 5, 0, Math.PI * 2);
    ctx.arc(11, -12, 5, 0, Math.PI * 2);
    ctx.fill();

    // Hidung Pink Kecil
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(0, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Mata Bulat Berbinar
    if (this.wobbleTimer > 0) {
      // Mata Lucu > < saat menabrak lembut
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Kiri >
      ctx.moveTo(-10, -22);
      ctx.lineTo(-6, -19);
      ctx.lineTo(-10, -16);
      // Kanan <
      ctx.moveTo(10, -22);
      ctx.lineTo(6, -19);
      ctx.lineTo(10, -16);
      ctx.stroke();
    } else {
      // Mata Berbinar Bahagia
      this.drawSparkleEye(ctx, -7, -19);
      this.drawSparkleEye(ctx, 7, -19);
    }

    // Kaki Kelinci Melangkah
    const footOffset = Math.sin(this.runPhase) * 5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-10, 30 + footOffset, 7, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(10, 30 - footOffset, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEar(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Telinga Luar Putih
    ctx.fillStyle = '#fdfbf7';
    ctx.beginPath();
    ctx.ellipse(0, -16, 7, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bagian Dalam Telinga Pink Lembut
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -16, 3.5, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSparkleEye(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Bola mata hitam kebiruan
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Kilau putih
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 1.5, y + 1.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRollingBall(ctx: CanvasRenderingContext2D): void {
    // Kelinci menggelinding lucu saat duck
    ctx.fillStyle = '#fdfbf7';
    ctx.beginPath();
    ctx.arc(0, 10, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(-8, 6, 6, 0, Math.PI * 2);
    ctx.arc(8, 6, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

