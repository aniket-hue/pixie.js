export { addChild, Children, clearChildren, getChildren, removeChild } from './children';
export { clearAllDirty, clearDirty, isDirty, markDirty } from './dirty';
export {
  getCanNotBeSelectedBySelection,
  getDraggable,
  getSelectable,
  getSelected,
  Interaction,
  updateCanNotBeSelectedBySelection,
  updateDraggable,
  updateSelectable,
  updateSelected,
} from './interaction';
export { defineComponent } from './lib';
export {
  Bounds,
  getBounds,
  getLocalMatrix,
  getWorldMatrix,
  LocalMatrix,
  updateBounds,
  updateLocalMatrix,
  updateWorldMatrix,
  WorldMatrix,
} from './matrix';
export { getParent, Parent, updateParent } from './parent';
export { getHeight, getWidth, Size, updateHeight, updateWidth } from './size';
export { getFill, getStroke, getStrokeWidth, Style, updateFill, updateStroke, updateStrokeWidth } from './style';
export { isVisible, markVisible, Visibility } from './visible';
