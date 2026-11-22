/**
 * HUD Overlay — Tampilan Antarmuka Ramah Anak
 * Indikator Hati/Berry, Skor Wortel, Bintang Berlian, dan Status Sensor Kamera
 */

import type { GameStats } from '@game/game-engine';
import type { TrackerStatus } from '@input/webcam-tracker';

export class HudOverlay {
  private container: HTMLDivElement;
  private heartsContainer: HTMLDivElement;
  private scoreEl: HTMLSpanElement;
  private carrotsEl: HTMLSpanElement;
  private starsEl: HTMLSpanElement;
  private laneIndicatorEl: HTMLDivElement;
  private trackerBadgeEl: HTMLDivElement;

  public onCameraClick?: () => void;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'hud-overlay';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
    `;

    // ─── Header: Hati & Skor ───────────────────────────
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    `;

    // Wadah Hati Berry
    this.heartsContainer = document.createElement('div');
    this.heartsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.88);
      padding: 8px 16px;
      border-radius: 999px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.12);
      backdrop-filter: blur(8px);
    `;

    // Wadah Skor & Buah
    const statsPill = document.createElement('div');
    statsPill.style.cssText = `
      display: flex;
      gap: 18px;
      background: rgba(255, 255, 255, 0.88);
      padding: 8px 24px;
      border-radius: 999px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.12);
      backdrop-filter: blur(8px);
      font-size: 19px;
      font-weight: bold;
      color: #334155;
    `;

    const carrotItem = document.createElement('span');
    carrotItem.innerHTML = '🥕 <span id="carrot-val">0</span>';
    this.carrotsEl = carrotItem.querySelector('#carrot-val')!;

    // Bintang Berlian Cyan Kontras Tinggi
    const starItem = document.createElement('span');
    starItem.innerHTML = '⭐ <span id="star-val" style="color: #0284c7; text-shadow: 0 0 8px rgba(6,182,212,0.4);">0</span>';
    this.starsEl = starItem.querySelector('#star-val')!;

    const scoreItem = document.createElement('span');
    scoreItem.innerHTML = '🏆 <span id="score-val">0</span>';
    this.scoreEl = scoreItem.querySelector('#score-val')!;

    statsPill.appendChild(carrotItem);
    statsPill.appendChild(starItem);
    statsPill.appendChild(scoreItem);

    header.appendChild(this.heartsContainer);
    header.appendChild(statsPill);
    this.container.appendChild(header);

    // ─── Footer: Status Sensor & Jalur Aktif ──────────
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
    `;

    // Sensor Status Badge (Dapat diklik untuk menyalakan kamera)
    this.trackerBadgeEl = document.createElement('div');
    this.trackerBadgeEl.style.cssText = `
      background: rgba(15, 23, 42, 0.82);
      color: #f8fafc;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.15s, background 0.15s;
    `;
    this.trackerBadgeEl.onmouseenter = () => (this.trackerBadgeEl.style.transform = 'scale(1.04)');
    this.trackerBadgeEl.onmouseleave = () => (this.trackerBadgeEl.style.transform = 'scale(1)');
    this.trackerBadgeEl.onclick = () => this.onCameraClick?.();
    this.trackerBadgeEl.innerHTML = '📷 Klik: Aktifkan Kamera';

    // Indikator Jalur
    this.laneIndicatorEl = document.createElement('div');
    this.laneIndicatorEl.style.cssText = `
      background: rgba(255, 255, 255, 0.92);
      padding: 8px 20px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: bold;
      color: #0f172a;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    this.laneIndicatorEl.innerText = '⭐ Jalur Tengah';

    footer.appendChild(this.trackerBadgeEl);
    footer.appendChild(this.laneIndicatorEl);
    this.container.appendChild(footer);

    parent.appendChild(this.container);
  }

  public updateStats(stats: GameStats): void {
    this.scoreEl.innerText = stats.score.toString();
    this.carrotsEl.innerText = stats.carrots.toString();
    this.starsEl.innerText = stats.stars.toString();

    // Render Hati / Energi Berry
    this.heartsContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('span');
      heart.style.fontSize = '24px';
      heart.innerText = i < stats.hearts ? '🍓' : '⚪';
      this.heartsContainer.appendChild(heart);
    }
  }

  public updateLane(lane: 0 | 1 | 2): void {
    if (lane === 0) {
      this.laneIndicatorEl.innerText = '🌿 Jalur Kiri';
      this.laneIndicatorEl.style.color = '#059669';
    } else if (lane === 1) {
      this.laneIndicatorEl.innerText = '⭐ Jalur Tengah';
      this.laneIndicatorEl.style.color = '#d97706';
    } else {
      this.laneIndicatorEl.innerText = '🌸 Jalur Kanan';
      this.laneIndicatorEl.style.color = '#2563eb';
    }
  }

  public updateTrackerStatus(status: TrackerStatus, msg?: string): void {
    if (status === 'TRACKING') {
      this.trackerBadgeEl.innerHTML = '🟢 Sensor Gerak Tubuh Aktif';
      this.trackerBadgeEl.style.background = 'rgba(16, 185, 129, 0.9)';
    } else if (status === 'CALIBRATING') {
      this.trackerBadgeEl.innerHTML = `🟡 ${msg || 'Kalibrasi Posisi...'}`;
      this.trackerBadgeEl.style.background = 'rgba(245, 158, 11, 0.9)';
    } else if (status === 'LOADING') {
      this.trackerBadgeEl.innerHTML = `⏳ ${msg || 'Menyiapkan Kamera...'}`;
      this.trackerBadgeEl.style.background = 'rgba(59, 130, 246, 0.85)';
    } else if (status === 'DENIED' || status === 'ERROR') {
      this.trackerBadgeEl.innerHTML = '📷 Klik untuk Nyalakan Kamera (atau ◀ ▶)';
      this.trackerBadgeEl.style.background = 'rgba(239, 68, 68, 0.9)';
    } else {
      this.trackerBadgeEl.innerHTML = '📷 Klik: Aktifkan Kamera';
      this.trackerBadgeEl.style.background = 'rgba(15, 23, 42, 0.85)';
    }
  }
}
