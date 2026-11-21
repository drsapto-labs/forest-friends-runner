/**
 * Background & Environment — Hutan Fantasi Ceria Ramah Anak
 * Langit pastel fajar, pelangi lembut, bukit permen, dan pepohonan magis.
 */

import { GAME_HEIGHT, GAME_WIDTH, HORIZON_Y } from '@utils/constants';

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

interface Firefly {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
}

export class FantasyBackground {
  private clouds: Cloud[] = [];
  private fireflies: Firefly[] = [];
  private time = 0;

  constructor() {
    // Buat awan pastel
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * GAME_WIDTH,
        y: 30 + Math.random() * (HORIZON_Y - 90),
        scale: 0.6 + Math.random() * 0.7,
        speed: 8 + Math.random() * 12,
      });
    }

    // Buat kunang-kunang berpendar
    for (let i = 0; i < 18; i++) {
      this.fireflies.push({
        x: Math.random() * GAME_WIDTH,
        y: 40 + Math.random() * (GAME_HEIGHT - 80),
        size: 2.5 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      });
    }
  }

  public update(dt: number): void {
    this.time += dt;

    // Gerakkan awan perlahan
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > GAME_WIDTH + 150) {
        c.x = -150;
        c.y = 30 + Math.random() * (HORIZON_Y - 90);
      }
    }

    // Animasi kunang-kunang
    for (const f of this.fireflies) {
      f.phase += f.speed * dt * 2;
      f.y += Math.sin(f.phase) * 0.4;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. Langit Gradasi Fajar Pastel (Soft Lavender to Sunset Peach)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    skyGrad.addColorStop(0, '#bfdbfe'); // Soft Sky Blue
    skyGrad.addColorStop(0.5, '#fbcfe8'); // Candy Pink
    skyGrad.addColorStop(1, '#fed7aa'); // Golden Peach
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, HORIZON_Y);

    // 2. Pelangi Lembut di Cakrawala
    this.drawRainbow(ctx, GAME_WIDTH / 2, HORIZON_Y + 40, 220);

    // 3. Awan Lembut Mengapung
    for (const c of this.clouds) {
      this.drawCloud(ctx, c.x, c.y, c.scale);
    }

    // 4. Lapisan Bukit Fantasi Berwarna Mint & Ungu Lembut
    this.drawHills(ctx);

    // 5. Rumput Hutan Bunga di Samping Jalan
    const grassGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, GAME_HEIGHT);
    grassGrad.addColorStop(0, '#86efac'); // Mint Green
    grassGrad.addColorStop(1, '#4ade80'); // Emerald Grass
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, HORIZON_Y, GAME_WIDTH, GAME_HEIGHT - HORIZON_Y);

    // 6. Kunang-kunang Berpendar
    for (const f of this.fireflies) {
      const alpha = 0.35 + 0.55 * Math.sin(f.phase);
      ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRainbow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    const colors = [
      'rgba(248, 113, 113, 0.28)', // Merah
      'rgba(251, 191, 36, 0.28)',  // Kuning
      'rgba(52, 211, 153, 0.28)',  // Hijau
      'rgba(96, 165, 250, 0.28)',  // Biru
      'rgba(192, 132, 252, 0.28)', // Ungu
    ];

    ctx.save();
    ctx.lineWidth = 10;
    colors.forEach((col, idx) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.arc(cx, cy, r - idx * 10, Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.arc(22, -10, 28, 0, Math.PI * 2);
    ctx.arc(48, -4, 22, 0, Math.PI * 2);
    ctx.arc(26, 12, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHills(ctx: CanvasRenderingContext2D): void {
    // Bukit Jauh (Lavender)
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.25, HORIZON_Y - 55, GAME_WIDTH * 0.5, HORIZON_Y);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.75, HORIZON_Y - 45, GAME_WIDTH, HORIZON_Y);
    ctx.lineTo(GAME_WIDTH, HORIZON_Y);
    ctx.lineTo(0, HORIZON_Y);
    ctx.fill();

    // Bukit Depan (Mint Pastel)
    ctx.fillStyle = '#bbf7d0';
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.35, HORIZON_Y - 30, GAME_WIDTH * 0.7, HORIZON_Y);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.85, HORIZON_Y - 20, GAME_WIDTH, HORIZON_Y);
    ctx.lineTo(GAME_WIDTH, HORIZON_Y);
    ctx.lineTo(0, HORIZON_Y);
    ctx.fill();
  }
}

