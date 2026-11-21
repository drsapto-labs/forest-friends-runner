/**
 * Input Manager — Abstraksi Input Terpadu (Webcam Motion + Keyboard + Touch)
 * Menjamin game engine tidak terikat pada hardware tertentu.
 */

export enum GameAction {
  LANE_LEFT = 'LANE_LEFT',
  LANE_CENTER = 'LANE_CENTER',
  LANE_RIGHT = 'LANE_RIGHT',
  JUMP = 'JUMP',
  DUCK_START = 'DUCK_START',
  DUCK_END = 'DUCK_END',
  PAUSE = 'PAUSE',
  RESTART = 'RESTART',
  TOGGLE_MUTE = 'TOGGLE_MUTE',
}

export type ActionCallback = (action: GameAction) => void;

export class InputManager {
  private readonly listeners: ActionCallback[] = [];
  private activeLane: 0 | 1 | 2 = 1; // Default di tengah (1)

  constructor() {
    this.setupKeyboardListeners();
  }

  public subscribe(cb: ActionCallback): () => void {
    this.listeners.push(cb);
    return () => {
      const idx = this.listeners.indexOf(cb);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  public emit(action: GameAction): void {
    if (action === GameAction.LANE_LEFT) this.activeLane = 0;
    if (action === GameAction.LANE_CENTER) this.activeLane = 1;
    if (action === GameAction.LANE_RIGHT) this.activeLane = 2;

    for (const listener of this.listeners) {
      listener(action);
    }
  }

  public get currentLane(): 0 | 1 | 2 {
    return this.activeLane;
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Cegah default scroll untuk tombol panah & spasi
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (this.activeLane === 2) this.emit(GameAction.LANE_CENTER);
          else if (this.activeLane === 1) this.emit(GameAction.LANE_LEFT);
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          if (this.activeLane === 0) this.emit(GameAction.LANE_CENTER);
          else if (this.activeLane === 1) this.emit(GameAction.LANE_RIGHT);
          break;

        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          this.emit(GameAction.JUMP);
          break;

        case 'ArrowDown':
        case 's':
        case 'S':
          this.emit(GameAction.DUCK_START);
          break;

        case 'p':
        case 'P':
          this.emit(GameAction.PAUSE);
          break;

        case 'm':
        case 'M':
          this.emit(GameAction.TOGGLE_MUTE);
          break;

        case 'r':
        case 'R':
          this.emit(GameAction.RESTART);
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (['ArrowDown', 's', 'S'].includes(e.key)) {
        this.emit(GameAction.DUCK_END);
      }
    });
  }
}

