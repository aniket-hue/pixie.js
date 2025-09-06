export class Vector2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  multiplyVector(other: Vector2): Vector2 {
    return new Vector2(this.x * other.x, this.y * other.y);
  }

  divide(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  divideVector(other: Vector2): Vector2 {
    return new Vector2(this.x / other.x, this.y / other.y);
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const len = this.length();
    return len > 0 ? new Vector2(this.x / len, this.y / len) : Vector2.zero();
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }
}

// WebGL-style factory function
export function vec2(x: number = 0, y: number = 0): Vector2 {
  return new Vector2(x, y);
}
