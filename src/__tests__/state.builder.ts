import { pushToStack, type StackEntry, type State } from "~/core/stack";

export function stateBuilder(state: State) {
  const clone = structuredClone(state);

  return {
    withStackEntry(entry: StackEntry) {
      return stateBuilder(pushToStack(state, entry));
    },
    withRegisterValue(register: string, value: number) {
      return stateBuilder({
        ...clone,
        registers: {
          ...clone.registers,
          [register]: value,
        },
      });
    },
    build() {
      return structuredClone(clone);
    },
  };
}
