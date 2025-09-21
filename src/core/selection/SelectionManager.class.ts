import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import {
  addChild,
  getCanNotBeSelectedBySelection,
  markDirty,
  markVisible,
  setIsBoundsComputable,
  updateCanNotBeSelectedBySelection,
  updateDraggable,
  updateFill,
  updateHeight,
  updateLocalMatrix,
  updateSelectable,
  updateSelected,
  updateStroke,
  updateStrokeWidth,
  updateWidth,
  updateWorldMatrix,
} from '../ecs/components';
import { clearChildren, getChildren, removeChild } from '../ecs/components/children';
import { Events } from '../events';
import { rgbaToArgb } from '../lib/color';
import { m3 } from '../math/matrix';

export class SelectionManager {
  private camera: Camera;
  private canvas: Canvas;

  private selectedEntities: number[] = [];

  private isDragging = false;
  private dragStart: { x: number; y: number } | null = null;

  group: number | null = null;
  selectionBox: number[] | null = null;

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

    const entities = this.canvas.findEntitiesInBoundingBox({ minX, minY, maxX, maxY }).filter((entity) => !getCanNotBeSelectedBySelection(entity));

    const added = entities.filter((entity) => !this.selectedEntities.includes(entity));
    const removed = this.selectedEntities.filter((entity) => !entities.includes(entity));

    console.log(added, removed);

    // if (added.length === 0 && removed.length === 0) {
    //   this.canvas.requestRender();
    //   return;
    // }

    this.selectedEntities = entities;

    let group = this.group;

    if (!group) {
      this.group = this.initGroup();
      group = this.group;
    }

    removed.forEach((entity) => {
      removeChild(group, entity);
    });

    added.forEach((entity) => {
      addChild(group, entity);
    });

    const child = getChildren(group)[0];

    markDirty(child);
    markDirty(group);

    this.canvas.requestRender();
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.selectionBox = null;
    this.canvas.requestRender();
  }

  private getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const y = this.canvas.height - screenY;
    return this.camera.screenToWorld(screenX, y);
  }

  private initGroup() {
    const newGroup = this.canvas.world.addEntity();

    updateLocalMatrix(newGroup, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
    updateWorldMatrix(newGroup, [0, 0, 0, 0, 0, 0, 0, 0, 1]);

    updateWidth(newGroup, 0);
    updateHeight(newGroup, 0);

    //Transparent
    updateFill(newGroup, rgbaToArgb(0, 255, 4, 0.1));
    updateStrokeWidth(newGroup, 1);
    updateStroke(newGroup, rgbaToArgb(255, 4, 0, 1));

    updateDraggable(newGroup, true);
    updateSelectable(newGroup, true);
    markVisible(newGroup, true);
    updateCanNotBeSelectedBySelection(newGroup, true);
    setIsBoundsComputable(newGroup, false);

    return newGroup;
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
