/**
 * Game Engine — Pengendali Siklus Utama Game
 * Mengatur state permainan, tabrakan, skor buah, dan transisi layar.
 */

import { soundEngine } from '@audio/audio-synth';
import { GameAction, type InputManager } from '@input/input-manager';
import {
  INITIAL_SPEED,
  MAX_HEARTS,
  MAX_SPEED,
  SPEED_ACCELERATION,
} from '@utils/constants';
import { FantasyBackground } from './background';
import { CollectibleManager } from './collectible-manager';
import { LaneManager } from './lane-manager';
import { ObstacleManager } from './obstacle-manager';
import { ParticleSystem } from './particle-system';
import { Player } from './player';

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'CELEBRATION';

export interface GameStats {
  score: number;
  hearts: number;
  distance: number;
  carrots: number;
  stars: number;
  speed: number;
  state: GameState;
}

export class GameEngine {
  private state: GameState = 'MENU';
  private score = 0;
  private hearts = MAX_HEARTS;
  private distance = 0;
  private carrotsCollected = 0;
  private starsCollected = 0;
  private currentSpeed = INITIAL_SPEED;

  private readonly bg = new FantasyBackground();
  private readonly laneManager = new LaneManager();
  private readonly particleSystem = new ParticleSystem();
  private readonly player: Player;
  private readonly collectibles: CollectibleManager;
  private readonly obstacles = new ObstacleManager();

  public onStatsChange?: (stats: GameStats) => void;

  constructor(inputManager: InputManager) {
    this.player = new Player(this.particleSystem);
    this.collectibles = new CollectibleManager(this.particleSystem);

    this.bindInputs(inputManager);
  }

  private bindInputs(inputManager: InputManager): void {
    inputManager.subscribe((action) => {
      if (this.state === 'MENU') {
        if (action === GameAction.RESTART || action === GameAction.JUMP) {
          this.startGame();
        }
        return;
      }

      if (this.state === 'CELEBRATION') {
        if (action === GameAction.RESTART || action === GameAction.JUMP) {
          this.startGame();
        }
        return;
      }

      switch (action) {
        case GameAction.LANE_LEFT:
          this.player.setTargetLane(0);
          break;
        case GameAction.LANE_CENTER:
          this.player.setTargetLane(1);
          break;
        case GameAction.LANE_RIGHT:
          this.player.setTargetLane(2);
          break;
        case GameAction.JUMP:
          this.player.jump();
          break;
        case GameAction.DUCK_START:
          this.player.setDucking(true);
          break;
        case GameAction.DUCK_END:
          this.player.setDucking(false);
          break;
        case GameAction.PAUSE:
          this.togglePause();
          break;
        case GameAction.RESTART:
          this.startGame();
          break;
        case GameAction.TOGGLE_MUTE:
          soundEngine.toggleMute();
          break;
      }
    });
  }

  public startGame(): void {
    this.score = 0;
    this.hearts = MAX_HEARTS;
    this.distance = 0;
    this.carrotsCollected = 0;
    this.starsCollected = 0;
    this.currentSpeed = INITIAL_SPEED;

    this.player.reset();
    this.collectibles.reset();
    this.obstacles.reset();

    this.state = 'PLAYING';
    soundEngine.startBGM();
    this.notifyStats();
  }

  public togglePause(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      soundEngine.stopBGM();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      soundEngine.startBGM();
    }
    this.notifyStats();
  }

  public get currentState(): GameState {
    return this.state;
  }

  public getStats(): GameStats {
    return {
      score: this.score,
      hearts: this.hearts,
      distance: Math.floor(this.distance),
      carrots: this.carrotsCollected,
      stars: this.starsCollected,
      speed: Math.round(this.currentSpeed),
      state: this.state,
    };
  }

  private notifyStats(): void {
    this.onStatsChange?.(this.getStats());
  }

  public update(dt: number): void {
    if (this.state !== 'PLAYING') {
      this.particleSystem.update(dt);
      return;
    }

    // Naikkan kecepatan lari secara bertahap
    this.currentSpeed = Math.min(MAX_SPEED, this.currentSpeed + SPEED_ACCELERATION * dt);
    this.distance += (this.currentSpeed * dt) / 20;

    // Update dunia & lingkungan
    this.bg.update(dt);
    this.laneManager.update(dt, this.currentSpeed);
    this.particleSystem.update(dt);

    // Update Karakter
    this.player.update(dt, this.currentSpeed);

    // Update Buah & Koin
    const scoreGained = this.collectibles.update(
      dt,
      this.currentSpeed,
      this.player.lanePosition,
      this.player.jumping
    );

    if (scoreGained > 0) {
      this.score += scoreGained;
      if (scoreGained >= 50) this.starsCollected++;
      else this.carrotsCollected++;
      this.notifyStats();
    }

    // Update Rintangan & Deteksi Tabrakan
    const hit = this.obstacles.update(
      dt,
      this.currentSpeed,
      this.player.lanePosition,
      this.player.jumping,
      this.player.isInvincible
    );

    if (hit) {
      this.player.onHit();
      this.hearts--;
      this.notifyStats();

      if (this.hearts <= 0) {
        // Layar Selebrasi Ramah Balita (Bukan Game Over yang Seram)
        this.state = 'CELEBRATION';
        soundEngine.stopBGM();
        soundEngine.playVictory();
        this.notifyStats();
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. Gambar Latar Belakang Langit & Pelangi
    this.bg.render(ctx);

    // 2. Gambar Lintasan 3 Jalur & Pepohonan
    this.laneManager.render(ctx);

    // 3. Gambar Buah & Rintangan
    this.obstacles.render(ctx);
    this.collectibles.render(ctx);

    // 4. Gambar Karakter Bun-Bun
    this.player.render(ctx);

    // 5. Gambar Partikel Kilau & Bintang
    this.particleSystem.render(ctx);
  }
}

