export const Sizes = {
  f32: Float32Array,
  f64: Float64Array,
  i8: Int8Array,
  i16: Int16Array,
  i32: Int32Array,
  i64: BigInt64Array,
  u8: Uint8Array,
  u16: Uint16Array,
  u32: Uint32Array,
  u64: BigUint64Array,
};

export type ComponentType = keyof typeof Sizes;
export type Component = any;

const MAX_ENTITIES = 10_000;

export function defineComponent(schema: Record<string, ComponentType>): Record<string, Component> {
  const comp: Record<string, Component> = {};

  for (const key in schema) {
    const type = schema[key];
    comp[key] = new Sizes[type](MAX_ENTITIES);
  }

  return comp;
}
