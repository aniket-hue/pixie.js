import { SELECTION_BOX_BORDER_COLOR, SELECTION_BOX_FILL_COLOR } from '../app/colors';
import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import {
  addChild,
  Bounds,
  getSelectable,
  Interaction,
  LocalMatrix,
  markDirty,
  Parent,
  Size,
  Style,
  setDraggable,
  setFill,
  setHeight,
  setLocalMatrix,
  setSelectable,
  setStroke,
  setStrokeWidth,
  setVisible,
  setWidth,
  setWorldMatrix,
  Visibility,
  WorldMatrix,
} from '../ecs/components';
import { clearChildren } from '../ecs/components/children';
import { Events } from '../events';
import { m3 } from '../math/matrix';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';

export class SelectionManager {
  private camera: Camera;
  private canvas: Canvas;

  private selectedEntities: number[] = [];

  private isDragging = false;
  private dragStart: { x: number; y: number } | null = null;

  private group: number | null = null;

  selectionBox: number[] | null = null;
  tempBoundingRect: number | null = null;

  constructor(context: Canvas) {
    this.canvas = context;
    this.camera = context.camera;

    this.initListeners();
  }

  private initListeners(): void {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.canvas.on(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.on(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.on(Events.MOUSE_UP, this.onMouseUp);
  }

  private onMouseDown(event: MouseEvent): void {
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);
    const eid = this.canvas.findObjectAtPoint(worldPos.x, worldPos.y);

    if (eid !== null) {
      return;
    }

    if (this.group) {
      clearChildren(this.group);

      this.selectedEntities = [];
      this.canvas.world.removeEntity(this.group);

      this.group = null;
    }

    this.isDragging = true;
    this.dragStart = { x: worldPos.x, y: worldPos.y };

    this.selectionBox = m3.compose({
      tx: worldPos.x,
      ty: worldPos.y,
      sx: 1,
      sy: 1,
      r: 0,
    });

    this.canvas.requestRender();
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.dragStart === null) {
      return;
    }

    const currentPos = this.getWorldPosition(event.offsetX, event.offsetY);

    const minX = Math.min(this.dragStart.x, currentPos.x);
    const maxX = Math.max(this.dragStart.x, currentPos.x);
    const minY = Math.min(this.dragStart.y, currentPos.y);
    const maxY = Math.max(this.dragStart.y, currentPos.y);

    const width = maxX - minX;
    const height = maxY - minY;

    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    this.selectionBox = m3.compose({
      tx: centerX,
      ty: centerY,
      sx: width,
      sy: height,
      r: 0,
    });

    if (!this.tempBoundingRect) {
      const world = this.canvas.world;

      this.tempBoundingRect = this.canvas.world.addEntity();

      setFill(this.tempBoundingRect, SELECTION_BOX_FILL_COLOR);
      setStrokeWidth(this.tempBoundingRect, 1.5);
      setStroke(this.tempBoundingRect, SELECTION_BOX_BORDER_COLOR);
      setVisible(this.tempBoundingRect, true);
      setSelectable(this.tempBoundingRect, false);

      world.addComponent(LocalMatrix, this.tempBoundingRect);
      world.addComponent(Size, this.tempBoundingRect);
      world.addComponent(Interaction, this.tempBoundingRect);
      world.addComponent(Visibility, this.tempBoundingRect);
      world.addComponent(Style, this.tempBoundingRect);
      world.addComponent(Parent, this.tempBoundingRect);
      world.addComponent(WorldMatrix, this.tempBoundingRect);
    }

    const entities = this.canvas.findEntitiesInBoundingBox({ minX, minY, maxX, maxY }).filter((eid) => getSelectable(eid));
    this.selectedEntities = entities;

    const bounds = createBoundingBoxOfchildren(entities);
    setLocalMatrix(this.tempBoundingRect, bounds.localMatrix);
    setWorldMatrix(this.tempBoundingRect, bounds.localMatrix);
    setWidth(this.tempBoundingRect, bounds.width);
    setHeight(this.tempBoundingRect, bounds.height);

    markDirty(this.tempBoundingRect);

    this.canvas.requestRender();
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.selectionBox = null;

    if (this.tempBoundingRect) {
      this.canvas.world.removeEntity(this.tempBoundingRect);
      this.tempBoundingRect = null;
    }

    if (this.selectedEntities.length > 0) {
      this.createGroupFromSelection();
    }

    this.canvas.requestRender();
  }

  private createGroupFromSelection(): void {
    if (this.group) {
      clearChildren(this.group);
      this.canvas.world.removeEntity(this.group);
    }

    this.group = this.initGroup();
    const group = this.group;

    this.selectedEntities.forEach((entity) => {
      addChild(group, entity);
    });

    if (this.selectedEntities.length > 0) {
      markDirty(group);
      this.selectedEntities.forEach((entity) => {
        markDirty(entity);
      });
    }

    // Reset selection state
    this.selectedEntities = [];
    this.dragStart = null;
  }

  private getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const y = this.canvas.height - screenY;
    return this.camera.screenToWorld(screenX, y);
  }

  private initGroup() {
    const world = this.canvas.world;
    const newGroup = world.addEntity();

    setLocalMatrix(newGroup, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
    setWorldMatrix(newGroup, [0, 0, 0, 0, 0, 0, 0, 0, 1]);

    setWidth(newGroup, 0);
    setHeight(newGroup, 0);

    //Transparent
    setFill(newGroup, SELECTION_BOX_FILL_COLOR);
    setStrokeWidth(newGroup, 1.5);
    setStroke(newGroup, SELECTION_BOX_BORDER_COLOR);

    setDraggable(newGroup, true);
    setSelectable(newGroup, false);
    setVisible(newGroup, true);

    world.addComponent(LocalMatrix, newGroup);
    world.addComponent(Size, newGroup);
    world.addComponent(Interaction, newGroup);
    world.addComponent(Visibility, newGroup);
    world.addComponent(Bounds, newGroup);
    world.addComponent(Style, newGroup);
    world.addComponent(Parent, newGroup);
    world.addComponent(WorldMatrix, newGroup);

    return newGroup;
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
