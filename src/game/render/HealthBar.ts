import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { HEALTH_BAR } from './renderConfig';

const FILL_RECT = { x: 24, width: 112 };

export class HealthBarTextures {
  readonly frame: Texture;
  private readonly fills: Readonly<Record<'green' | 'red', Texture>>;
  private readonly cache = new Map<string, Texture>();

  constructor(frame: Texture, fills: Readonly<Record<'green' | 'red', Texture>>) {
    this.frame = frame;
    this.fills = fills;
  }

  fill(color: 'green' | 'red', ratio: number): Texture {
    const step = Math.max(0, Math.min(HEALTH_BAR.steps, Math.ceil(ratio * HEALTH_BAR.steps)));
    const key = `${color}:${step}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const source = this.fills[color];
    const width = FILL_RECT.x + (FILL_RECT.width * step) / HEALTH_BAR.steps;
    const texture =
      step === 0
        ? Texture.EMPTY
        : new Texture({
            source: source.source,
            frame: new Rectangle(source.frame.x, source.frame.y, width, source.frame.height),
          });
    this.cache.set(key, texture);
    return texture;
  }

  destroy(): void {
    for (const texture of this.cache.values()) {
      if (texture !== Texture.EMPTY) texture.destroy(false);
    }
    this.cache.clear();
  }
}

export class HealthBar extends Container {
  private readonly textures: HealthBarTextures;
  private readonly color: 'green' | 'red';
  private readonly fillSprite: Sprite;
  private lastKey = '';

  constructor(textures: HealthBarTextures, color: 'green' | 'red') {
    super();
    this.textures = textures;
    this.color = color;
    const frameSprite = new Sprite(textures.frame);
    this.fillSprite = new Sprite(Texture.EMPTY);
    frameSprite.anchor.set(0.5);
    this.fillSprite.position.set(-textures.frame.width / 2, -textures.frame.height / 2);
    this.addChild(frameSprite, this.fillSprite);
    this.scale.set(HEALTH_BAR.scale);
  }

  setRatio(ratio: number): void {
    const key = `${this.color}:${ratio}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.fillSprite.texture = this.textures.fill(this.color, ratio);
  }
}
