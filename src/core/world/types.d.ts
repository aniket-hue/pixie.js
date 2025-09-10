import type { Object } from '../entities/Object.class';

export interface Entity {
  id: string;
  components: Map<string, Component>;
}

export interface IComponent {
  readonly type: ComponentType;
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
  selected?: boolean;
  hovered?: boolean;
}

export type Children = Object[];
export type Parent = number | null;

export type ComponentType = 'children' | 'parent' | 'style' | 'size' | 'interaction' | 'transform';

export type ComponentToData<T extends ComponentType> = T extends 'children'
  ? Children
  : T extends 'parent'
    ? Parent
    : T extends 'style'
      ? Style
      : T extends 'size'
        ? Size
        : T extends 'interaction'
          ? Interaction
          : T extends 'transform'
            ? Transform
            : T;
