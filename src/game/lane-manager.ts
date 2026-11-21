/**
 * Lane Manager — Sistem Lintasan 3 Jalur 2.5D Pseudo-3D
 * Menghitung proyeksi perspektif kedalaman Z (0=cakrawala s/d 1=kamera)
 * Menghasilkan ilusi berlari ke depan ala Temple Run yang mulus.
 */

import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HORIZON_Y,
  ROAD_BOTTOM_WIDTH,
  ROAD_TOP_WIDTH,
} from '@utils/constants';
import { project3DTo2D } from '@utils/helpers';

interface RoadTree {
  side: 'LEFT' | 'RIGHT';
  z: number;
  type: number;
}

export class LaneManager {
  private roadOffset = 0; // Offset animasi tekstur jalan
  private trees: RoadTree[] = [];

  constructor() {
    // Siapkan pepohonan fantasi di sisi jalan
    for (let i = 0; i < 14; i++) {
      this.trees.push({
        side: i % 2 === 0 ? 'LEFT' : 'RIGHT',
        z: (i / 14),
        type: i % 3,
      });
    }
  }

  public update(dt: number, speed: number): void {
    // Gerakkan tekstur jalan ke depan
    this.roadOffset = (this.roadOffset + (speed * dt * 0.0018)) % 1.0;

    // Gerakkan pohon ke arah kamera (Z bertambah dari 0 ke 1)
    for (const tree of this.trees) {
      tree.z += (speed * dt * 0.0018);
      if (tree.z > 1.0) {
        tree.z -= 1.0;
        tree.type = Math.floor(Math.random() * 3);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const cx = GAME_WIDTH / 2;

    // 1. Gambar Permukaan Jalan 3 Jalur (Trapesium Perspektif)
    const topW = ROAD_TOP_WIDTH;
    const botW = ROAD_BOTTOM_WIDTH;

    ctx.save();
    // Warna dasar jalan setapak kayu / tanah magis hangat
    const pathGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, GAME_HEIGHT);
    pathGrad.addColorStop(0, '#fde68a'); // Amber terang di kejauhan
    pathGrad.addColorStop(1, '#f59e0b'); // Karamel hangat di depan
    ctx.fillStyle = pathGrad;

    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, HORIZON_Y);
    ctx.lineTo(cx + topW / 2, HORIZON_Y);
    ctx.lineTo(cx + botW / 2, GAME_HEIGHT);
    ctx.lineTo(cx - botW / 2, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Border pembatas tepi jalan (Rumput Bunga Pink & Mint)
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 6;
    ctx.stroke();

    // 2. Garis Garis Melintang (Efek Papan Kayu / Kecepatan Maju)
    const stripes = 16;
    for (let i = 0; i < stripes; i++) {
      const z = (i / stripes + this.roadOffset) % 1.0;
      const proj = project3DTo2D(1, z, GAME_WIDTH, GAME_HEIGHT, HORIZON_Y, topW, botW);
      const halfW = (ROAD_TOP_WIDTH + (ROAD_BOTTOM_WIDTH - ROAD_TOP_WIDTH) * Math.pow(z, 1.35)) / 2;

      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.45)' : 'rgba(217, 119, 6, 0.25)';
      ctx.lineWidth = Math.max(2, 6 * proj.scale);
      ctx.beginPath();
      ctx.moveTo(cx - halfW, proj.y);
      ctx.lineTo(cx + halfW, proj.y);
      ctx.stroke();
    }

    // 3. Garis Putus-putus Pemisah 3 Jalur (Lane Dividers)
    this.drawLaneDividers(ctx, cx, topW, botW);

    // 4. Gambar Pohon Fantasi di Sisi Kiri & Kanan Jalan (Sortir dari z terjauh ke terdekat)
    this.drawTrees(ctx, cx, topW, botW);

    ctx.restore();
  }

  private drawLaneDividers(ctx: CanvasRenderingContext2D, cx: number, topW: number, botW: number): void {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([14, 18]);
    ctx.lineWidth = 4;
    ctx.lineDashOffset = -this.roadOffset * 60;

    // Pembatas antara Jalur 0 & 1 (1/3 lebar dari kiri)
    ctx.beginPath();
    ctx.moveTo(cx - topW / 6, HORIZON_Y);
    ctx.lineTo(cx - botW / 6, GAME_HEIGHT);
    ctx.stroke();

    // Pembatas antara Jalur 1 & 2 (1/3 lebar dari kanan)
    ctx.beginPath();
    ctx.moveTo(cx + topW / 6, HORIZON_Y);
    ctx.lineTo(cx + botW / 6, GAME_HEIGHT);
    ctx.stroke();

    ctx.restore();
  }

  private drawTrees(ctx: CanvasRenderingContext2D, cx: number, topW: number, botW: number): void {
    // Urutkan pohon berdasarkan Z (yang paling jauh digambar duluan)
    const sorted = [...this.trees].sort((a, b) => a.z - b.z);

    for (const t of sorted) {
      const proj = project3DTo2D(1, t.z, GAME_WIDTH, GAME_HEIGHT, HORIZON_Y, topW, botW);
      const halfRoad = (ROAD_TOP_WIDTH + (ROAD_BOTTOM_WIDTH - ROAD_TOP_WIDTH) * Math.pow(t.z, 1.35)) / 2;
      const margin = 50 * proj.scale;
      const treeX = t.side === 'LEFT' ? cx - halfRoad - margin : cx + halfRoad + margin;
      const treeY = proj.y;

      this.drawFantasyTree(ctx, treeX, treeY, proj.scale, t.type);
    }
  }

  private drawFantasyTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, type: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * 1.3, scale * 1.3);

    // Batang pohon kayu manis
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-6, -20, 12, 24);

    // Daun Permen Kapas Berwarna-warni (Type 0: Pink, Type 1: Mint, Type 2: Lilac)
    const foliageColors = ['#f472b6', '#34d399', '#a78bfa'];
    ctx.fillStyle = foliageColors[type] ?? '#34d399';

    ctx.beginPath();
    ctx.arc(0, -32, 22, 0, Math.PI * 2);
    ctx.arc(-14, -24, 16, 0, Math.PI * 2);
    ctx.arc(14, -24, 16, 0, Math.PI * 2);
    ctx.fill();

    // Buah beri kecil berkilau di pohon
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-6, -30, 3, 0, Math.PI * 2);
    ctx.arc(8, -26, 3, 0, Math.PI * 2);
    ctx.arc(0, -40, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

