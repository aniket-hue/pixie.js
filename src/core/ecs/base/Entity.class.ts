import { BoundsComponent } from './components/BoundsComponent.class';
import { DirtyComponent } from './components/DirtyComponent.class';
import { HierarchyComponent } from './components/HierarchyComponent.class';
import { InteractionComponent } from './components/InteractionComponent.class';
import { MatrixComponent } from './components/MatrixComponent.class';
import { SizeComponent } from './components/SizeComponent.class';
import { StyleComponent } from './components/StyleComponent.class';
import type { TextureComponent } from './components/TextureComponent.class';
import { VisibilityComponent } from './components/VisibilityComponent.class';

let nextId = 1;

export class Entity {
  public readonly id: number;

  public matrix: MatrixComponent;
  public size: SizeComponent;
  public bounds: BoundsComponent;
  public style: StyleComponent;
  public hierarchy: HierarchyComponent;
  public interaction: InteractionComponent;
  public visibility: VisibilityComponent;
  public dirty: DirtyComponent;
  public texture?: TextureComponent;

  constructor() {
    this.id = nextId++;

    this.matrix = new MatrixComponent(this);
    this.size = new SizeComponent(this);
    this.bounds = new BoundsComponent(this);
    this.style = new StyleComponent(this);
    this.hierarchy = new HierarchyComponent(this);
    this.interaction = new InteractionComponent();
    this.visibility = new VisibilityComponent(this);
    this.dirty = new DirtyComponent();
  }
}
