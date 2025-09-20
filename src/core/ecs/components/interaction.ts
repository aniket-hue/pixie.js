import { defineComponent } from './lib';

export const Interaction = defineComponent({
  draggable: 'f32',
  selectable: 'f32',
  selected: 'f32',
  canNotBeSelectedBySelection: 'f32',
});

export const updateDraggable = (eid: number, draggable: boolean) => {
  Interaction.draggable[eid] = draggable;
};

export const updateSelectable = (eid: number, selectable: boolean) => {
  Interaction.selectable[eid] = selectable;
};

export const getDraggable = (eid: number) => {
  return Interaction.draggable[eid];
};

export const getSelectable = (eid: number) => {
  return Interaction.selectable[eid];
};

export const updateSelected = (eid: number, selected: boolean) => {
  Interaction.selected[eid] = selected;
};

export const getSelected = (eid: number) => {
  return Interaction.selected[eid];
};

export const updateCanNotBeSelectedBySelection = (eid: number, canNotBeSelectedBySelection: boolean) => {
  Interaction.canNotBeSelectedBySelection[eid] = canNotBeSelectedBySelection ? 1 : 0;
};

export const getCanNotBeSelectedBySelection = (eid: number) => {
  return Interaction.canNotBeSelectedBySelection[eid] === 1;
};
