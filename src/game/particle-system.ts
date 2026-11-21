/**
 * Particle System — Efek Visual Penuh Kilau & Balon Ceria
 * Memberikan kepuasan visual seketika (instant gratification) yang sangat disukai balita.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'STAR' | 'HEART' | 'DUST' | 'SPARK';
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  color: string;
  life: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];

  public update(dt: number): void {
    // Update partikel
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update teks melayang
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]!;
      t.y += t.vy * dt;
      t.life += dt;
      t.alpha = Math.max(0, 1 - t.life / 0.8);

      if (t.life >= 0.8) {
        this.texts.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Render partikel
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'STAR') {
        this.drawStar(ctx, p.x, p.y, p.size);
      } else if (p.type === 'HEART') {
        this.drawHeart(ctx, p.x, p.y, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render floating texts
    for (const t of this.texts) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, t.y);
    }

    ctx.restore();
  }

  public emitCollect(x: number, y: number, isStar = false): void {
    const count = isStar ? 16 : 8;
    const colors = isStar
      ? ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff']
      : ['#f87171', '#fb923c', '#f472b6', '#fed7aa'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)] ?? '#fbbf24',
        alpha: 1,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.35,
        type: isStar ? 'STAR' : 'HEART',
      });
    }

    this.texts.push({
      text: isStar ? '⭐ BINTANG!' : '+10',
      x,
      y: y - 20,
      vy: -55,
      alpha: 1,
      color: isStar ? '#f59e0b' : '#ec4899',
      life: 0,
    });
  }

  public emitFootDust(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: -15 - Math.random() * 20,
        size: 3 + Math.random() * 4,
        color: 'rgba(254, 243, 199, 0.7)',
        alpha: 0.8,
        life: 0,
        maxLife: 0.3,
        type: 'DUST',
      });
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        cx + r * Math.cos(((18 + i * 72) * Math.PI) / 180),
        cy - r * Math.sin(((18 + i * 72) * Math.PI) / 180)
      );
      ctx.lineTo(
        cx + (r / 2) * Math.cos(((54 + i * 72) * Math.PI) / 180),
        cy - (r / 2) * Math.sin(((54 + i * 72) * Math.PI) / 180)
      );
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 10, size / 10);
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.bezierCurveTo(-4, -8, -8, -4, -8, 0);
    ctx.bezierCurveTo(-8, 5, 0, 9, 0, 11);
    ctx.bezierCurveTo(0, 9, 8, 5, 8, 0);
    ctx.bezierCurveTo(8, -4, 4, -8, 0, -2);
    ctx.fill();
    ctx.restore();
  }
}

