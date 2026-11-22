/**
 * Forest Friends Runner — Main Entry Point
 * Game Lari Gerak Tubuh Kamera (Webcam Exergaming) Ramah Balita 4+ Tahun
 */

import { GameEngine } from '@game/game-engine';
import { GameAction, InputManager } from '@input/input-manager';
import { WebcamTracker } from '@input/webcam-tracker';
import { CelebrationModal } from '@ui/celebration-modal';
import { HudOverlay } from '@ui/hud-overlay';
import { GAME_HEIGHT, GAME_WIDTH } from '@utils/constants';

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) return;

  root.style.cssText = `
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #0f172a;
    overflow: hidden;
  `;

  // 1. Game Canvas Container (Rasio 16:9 Adaptif)
  const gameWrapper = document.createElement('div');
  gameWrapper.style.cssText = `
    position: relative;
    width: min(100vw, calc(100vh * 16 / 9));
    height: min(100vh, calc(100vw * 9 / 16));
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    border-radius: 16px;
    overflow: hidden;
    background: #000;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    display: block;
  `;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  gameWrapper.appendChild(canvas);
  root.appendChild(gameWrapper);

  // 2. PiP Webcam Container di Pojok Layar
  const pipContainer = document.createElement('div');
  pipContainer.style.cssText = `
    position: absolute;
    bottom: 24px;
    right: 24px;
    width: 240px;
    height: 160px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0,0,0,0.35);
    border: 3px solid rgba(255,255,255,0.85);
    z-index: 40;
    background: #1e293b;
    pointer-events: auto;
    cursor: pointer;
  `;

  const pipCanvas = document.createElement('canvas');
  pipCanvas.width = 320;
  pipCanvas.height = 240;
  pipCanvas.style.cssText = 'width: 100%; height: 100%; display: block;';
  pipContainer.appendChild(pipCanvas);

  // Tombol Kalibrasi Ulang di PiP
  const recalBtn = document.createElement('button');
  recalBtn.innerHTML = '🔄 Kalibrasi';
  recalBtn.title = 'Kalibrasi ulang posisi anak di tengah';
  recalBtn.style.cssText = `
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(15, 23, 42, 0.75);
    color: white;
    border: none;
    font-size: 11px;
    font-weight: bold;
    padding: 5px 9px;
    border-radius: 999px;
    cursor: pointer;
    backdrop-filter: blur(4px);
    z-index: 10;
  `;
  pipContainer.appendChild(recalBtn);
  gameWrapper.appendChild(pipContainer);

  // 3. Tombol Kontrol Bantuan Sentuh (Touch / Parent On-Screen Controls)
  const onScreenControls = document.createElement('div');
  onScreenControls.style.cssText = `
    position: absolute;
    bottom: 24px;
    left: 24px;
    display: flex;
    gap: 12px;
    z-index: 40;
    pointer-events: auto;
  `;

  const createTouchBtn = (label: string, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.innerHTML = label;
    btn.style.cssText = `
      background: rgba(255, 255, 255, 0.88);
      border: 2px solid rgba(255,255,255,0.95);
      border-radius: 999px;
      padding: 10px 18px;
      font-size: 17px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      backdrop-filter: blur(6px);
      transition: transform 0.1s;
    `;
    btn.onmousedown = () => (btn.style.transform = 'scale(0.92)');
    btn.onmouseup = () => (btn.style.transform = 'scale(1)');
    btn.onclick = onClick;
    return btn;
  };

  // 4. Inisialisasi Modul
  const inputManager = new InputManager();
  const webcamTracker = new WebcamTracker(inputManager);
  webcamTracker.setPipCanvas(pipCanvas);

  const startOrRecalibrateCamera = () => {
    if (webcamTracker.currentStatus === 'IDLE' || webcamTracker.currentStatus === 'DENIED' || webcamTracker.currentStatus === 'ERROR') {
      void webcamTracker.start();
    } else {
      webcamTracker.recalibrate();
    }
  };

  recalBtn.onclick = (e) => {
    e.stopPropagation();
    startOrRecalibrateCamera();
  };

  pipContainer.onclick = () => {
    startOrRecalibrateCamera();
  };

  const hud = new HudOverlay(gameWrapper);
  hud.onCameraClick = startOrRecalibrateCamera;

  const celebrationModal = new CelebrationModal(gameWrapper);
  const engine = new GameEngine(inputManager);

  // Sambungkan kontrol bantuan layar
  onScreenControls.appendChild(
    createTouchBtn('◀ Kiri', () => {
      const cur = inputManager.currentLane;
      if (cur === 2) inputManager.emit(GameAction.LANE_CENTER);
      else if (cur === 1) inputManager.emit(GameAction.LANE_LEFT);
    })
  );
  onScreenControls.appendChild(
    createTouchBtn('⬆ Lompat', () => {
      inputManager.emit(GameAction.JUMP);
    })
  );
  onScreenControls.appendChild(
    createTouchBtn('Kanan ▶', () => {
      const cur = inputManager.currentLane;
      if (cur === 0) inputManager.emit(GameAction.LANE_CENTER);
      else if (cur === 1) inputManager.emit(GameAction.LANE_RIGHT);
    })
  );
  gameWrapper.appendChild(onScreenControls);

  // Hubungkan event engine ke UI
  engine.onStatsChange = (stats) => {
    hud.updateStats(stats);
    if (stats.state === 'CELEBRATION') {
      celebrationModal.showCelebration(stats, () => {
        engine.startGame();
      });
    }
  };

  inputManager.subscribe((action) => {
    if (action === GameAction.LANE_LEFT) hud.updateLane(0);
    else if (action === GameAction.LANE_CENTER) hud.updateLane(1);
    else if (action === GameAction.LANE_RIGHT) hud.updateLane(2);
  });

  webcamTracker.onStatusChange = (status, msg) => {
    hud.updateTrackerStatus(status, msg);
  };

  // Tampilkan Layar Mulai
  celebrationModal.showStart(() => {
    // Jalankan tracker kamera dan mulai permainan
    startOrRecalibrateCamera();
    engine.startGame();
  });

  // Coba mulai kamera secara proaktif jika diizinkan browser
  if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    navigator.permissions
      ?.query({ name: 'camera' as PermissionName })
      .then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          void webcamTracker.start();
        }
      })
      .catch(() => {
        // Abaikan jika browser tidak mendukung permissions.query
      });
  }

  // 5. Game Loop Utama (RAF 60 FPS)
  let lastTime = performance.now();
  const frame = (time: number) => {
    const dt = Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;

    engine.update(dt);
    engine.render(ctx);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', bootstrap);
