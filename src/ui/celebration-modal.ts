/**
 * Celebration & Menu Modal — Antarmuka Ramah Balita
 * Tidak ada layar "Game Over" yang menakutkan, melainkan selebrasi pencapaian!
 */

import type { GameStats } from '@game/game-engine';

export class CelebrationModal {
  private el: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private subtitleEl: HTMLParagraphElement;
  private statsBox: HTMLDivElement;
  private actionBtn: HTMLButtonElement;

  private onActionCallback?: () => void;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'modal-overlay';
    this.el.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 50;
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(135deg, #ffffff, #fef2f2);
      border-radius: 36px;
      padding: 36px 32px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 4px solid #fbcfe8;
      animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    this.titleEl = document.createElement('h2');
    this.titleEl.style.cssText = `
      font-size: 30px;
      font-weight: 800;
      color: #f43f5e;
      margin: 0 0 10px 0;
    `;

    this.subtitleEl = document.createElement('p');
    this.subtitleEl.style.cssText = `
      font-size: 16px;
      color: #64748b;
      margin: 0 0 20px 0;
      line-height: 1.5;
    `;

    this.statsBox = document.createElement('div');
    this.statsBox.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    `;

    this.actionBtn = document.createElement('button');
    this.actionBtn.style.cssText = `
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      font-size: 22px;
      font-weight: bold;
      padding: 16px 36px;
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.5);
      transition: transform 0.15s, background 0.15s;
    `;
    this.actionBtn.onmouseenter = () => {
      this.actionBtn.style.transform = 'scale(1.04)';
    };
    this.actionBtn.onmouseleave = () => {
      this.actionBtn.style.transform = 'scale(1)';
    };
    this.actionBtn.onclick = () => {
      this.hide();
      this.onActionCallback?.();
    };

    card.appendChild(this.titleEl);
    card.appendChild(this.subtitleEl);
    card.appendChild(this.statsBox);
    card.appendChild(this.actionBtn);
    this.el.appendChild(card);

    parent.appendChild(this.el);
  }

  public showStart(onStart: () => void): void {
    this.onActionCallback = onStart;
    this.titleEl.innerHTML = '🐰 Petualangan Bun-Bun!';
    this.subtitleEl.innerText =
      'Geser tubuhmu ke kiri dan kanan di depan kamera untuk mengumpulkan wortel & bintang ajaib!';

    this.statsBox.innerHTML = `
      <div style="background:#f0fdf4; padding:12px; border-radius:18px;">
        <div style="font-size:26px;">🥕</div>
        <div style="font-weight:bold; color:#16a34a; font-size:13px;">Wortel Manis</div>
      </div>
      <div style="background:#f0f9ff; padding:12px; border-radius:18px;">
        <div style="font-size:26px;">⭐</div>
        <div style="font-weight:bold; color:#0284c7; font-size:13px;">Bintang Berlian</div>
      </div>
      <div style="background:#fdf2f8; padding:12px; border-radius:18px;">
        <div style="font-size:26px;">🏃</div>
        <div style="font-weight:bold; color:#db2777; font-size:13px;">Gerak Tubuh</div>
      </div>
    `;

    this.actionBtn.innerHTML = 'Mulai Main & Buka Kamera! 🚀';
    this.el.style.display = 'flex';
  }

  public showCelebration(stats: GameStats, onPlayAgain: () => void): void {
    this.onActionCallback = onPlayAgain;
    this.titleEl.innerHTML = '🎉 Hebat Sekali!';
    this.subtitleEl.innerText = 'Kamu sudah berpetualang dan bergerak sangat lincah hari ini!';

    this.statsBox.innerHTML = `
      <div style="background:#f0fdf4; padding:12px; border-radius:18px;">
        <div style="font-size:24px;">🥕 ${stats.carrots}</div>
        <div style="color:#64748b; font-size:12px;">Wortel</div>
      </div>
      <div style="background:#f0f9ff; padding:12px; border-radius:18px;">
        <div style="font-size:24px; color:#0284c7;">⭐ ${stats.stars}</div>
        <div style="color:#64748b; font-size:12px;">Bintang</div>
      </div>
      <div style="background:#eff6ff; padding:12px; border-radius:18px;">
        <div style="font-size:24px;">🏆 ${stats.score}</div>
        <div style="color:#64748b; font-size:12px;">Total Skor</div>
      </div>
    `;

    this.actionBtn.innerHTML = 'Main Lagi! 🌟';
    this.el.style.display = 'flex';
  }

  public hide(): void {
    this.el.style.display = 'none';
  }
}
