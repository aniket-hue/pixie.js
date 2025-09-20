import { defineComponent } from './lib';

export const Parent = defineComponent({
  parent: 'u32',
});

export const updateParent = (eid: number, parent: number) => {
  Parent.parent[eid] = parent;
};

export const getParent = (eid: number) => {
  return Parent.parent[eid];
};

export const clearParent = (eid: number) => {
  Parent.parent[eid] = null;
};
