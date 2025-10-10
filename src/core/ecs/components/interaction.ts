import { defineComponent } from './lib';

export const Interaction = defineComponent({
  draggable: 'f32',
  selectable: 'f32',
  selected: 'f32',
});

export const setDraggable = (eid: number, draggable: boolean) => {
  Interaction.draggable[eid] = draggable ? 0 : 1;
};

export const setSelectable = (eid: number, selectable: boolean) => {
  Interaction.selectable[eid] = selectable ? 0 : 1;
};

export const getDraggable = (eid: number) => {
  return Interaction.draggable[eid] === 0;
};

export const getSelectable = (eid: number) => {
  return Interaction.selectable[eid] === 0;
};

export const setSelected = (eid: number, selected: boolean) => {
  Interaction.selected[eid] = selected ? 0 : 1;
};

export const getSelected = (eid: number) => {
  return Interaction.selected[eid] === 0;
};
