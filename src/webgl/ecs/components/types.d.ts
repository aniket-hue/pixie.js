export interface Component {
  readonly type: string;
}

export interface Transform {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  matrix: number[];
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

export interface Style {
  fill: [number, number, number, number];
  stroke: [number, number, number, number];
  strokeWidth: number;
}

export interface InteractionComponent {
  draggable?: boolean;
  selectable?: boolean;
}
