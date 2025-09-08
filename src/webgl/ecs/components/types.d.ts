export interface Component {
  readonly type: string;
}

export interface Transform {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
}

export interface Selectable {
  selected: boolean;
  hoverable: boolean;
}

export interface Size {
  width?: number;
  height?: number;
  radius?: number;
}

export interface Bounds {
  matrix: number[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface Style {
  fill: [number, number, number, number];
  stroke: [number, number, number, number];
  strokeWidth: number;
}

export interface Interaction {
  draggable?: boolean;
  selectable?: boolean;
}

export type Children = number[];
export type Parent = number | null;
