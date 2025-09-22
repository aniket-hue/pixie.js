import { defineComponent } from './lib';

export const Interaction = defineComponent({
  draggable: 'f32',
  selectable: 'f32',
  selected: 'f32',
});

export const setDraggable = (eid: number, draggable: boolean) => {
  Interaction.draggable[eid] = draggable;
};

export const setSelectable = (eid: number, selectable: boolean) => {
  Interaction.selectable[eid] = selectable;
};

export const getDraggable = (eid: number) => {
  return Interaction.draggable[eid];
};

export const getSelectable = (eid: number) => {
  return Interaction.selectable[eid];
};

export const setSelected = (eid: number, selected: boolean) => {
  Interaction.selected[eid] = selected;
};

export const getSelected = (eid: number) => {
  return Interaction.selected[eid];
};
