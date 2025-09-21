export { addChild, clearChildren, getChildren, removeChild } from './children';
export { clearAllDirty, clearDirty, isDirty, markDirty } from './dirty';
export {
  getCanNotBeSelectedBySelection,
  getDraggable,
  getSelectable,
  getSelected,
  updateCanNotBeSelectedBySelection,
  updateDraggable,
  updateSelectable,
  updateSelected,
} from './interaction';
export { defineComponent } from './lib';
export {
  getBounds,
  getLocalMatrix,
  getWorldMatrix,
  isComputableBounds,
  setIsBoundsComputable,
  updateBounds,
  updateLocalMatrix,
  updateWorldMatrix,
} from './matrix';
export { getParent, updateParent } from './parent';
export { getHeight, getWidth, updateHeight, updateWidth } from './size';
export { getFill, getStroke, getStrokeWidth, updateFill, updateStroke, updateStrokeWidth } from './style';
export { isVisible, markVisible } from './visible';
