import type { Object } from '../entities/Object.class';

export interface Component {
  readonly type: string;
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

export interface Transform {
  matrix: number[];
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

export type Children = Object[];
export type Parent = number | null;
