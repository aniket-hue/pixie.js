import type { Constructor, MixinBase } from './types';

/**
 * Interactable mixin - handles selection and drag behavior
 */
export function Interactable<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    // Interaction component access
    get interaction() {
      const interaction = this.canvas.world.getComponent('interaction', this.entityId);

      if (!interaction) {
        console.error('Interaction not found');
        return { draggable: false, selectable: false };
      }

      return interaction;
    }

    // Draggable
    get isDraggable() {
      const interaction = this.interaction;
      return interaction?.draggable;
    }

    // Selectable
    get isSelectable() {
      const interaction = this.interaction;
      return interaction?.selectable;
    }

    set selectable(selected: boolean) {
      const interaction = this.interaction;
      this.canvas.world.updateComponent('interaction', this.entityId, { ...interaction, selectable: selected });
    }

    // Selected
    get selected() {
      const interaction = this.interaction;
      return interaction?.selected ?? false;
    }

    set selected(selected: boolean) {
      const interaction = this.interaction;
      this.canvas.world.updateComponent('interaction', this.entityId, { ...interaction, selected });
    }
  };
}
