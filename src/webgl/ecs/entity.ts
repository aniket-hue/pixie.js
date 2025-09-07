export interface Entity {
  id: string;
  components: Map<string, Component>;
}

export interface Component {
  readonly type: string;
}
