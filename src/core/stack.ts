export const MEMORY_ADDRESS_SIZE = 8;

export type StackEntry = {
  value: number;
  size: number;
};

type Stack = StackEntry[];

export function stackOffset(stack: Readonly<Stack>) {
  return stack.reduce((acc, entry) => acc + entry.size, 0);
}

export function nextStackAddress(stack: Readonly<Stack>) {
  if (stack.length === 0) {
    return 0;
  }

  return stackOffset(stack) + stack[stack.length - 1].size;
}

export function pushToStack(state: Readonly<State>, entry: StackEntry): State {
  const newEntry = { ...entry };

  return updateRegister(
    {
      ...state,
      stack: [...state.stack, newEntry],
    },
    "rsp",
    state.registers.rsp + entry.size,
  );
}

function popFromStack<T extends State>(
  state: Readonly<T>,
  register: Readonly<keyof T["registers"]>,
): State {
  const lastElement = state.stack[state.stack.length - 1];

  const stack = state.stack.slice(0, -1);

  const updatedRsp = readRegister(state, "rsp") - (lastElement?.size || 0); //?

  const updateRspState = updateRegister(
    {
      ...state,
      stack,
    },
    "rsp",
    updatedRsp,
  );

  return updateRegister(updateRspState, register, lastElement.value);
}

function createStack(): Stack {
  return [];
}

export function stackEntry(overrides: Readonly<Partial<StackEntry>> = {}) {
  return { value: 0, size: 1, ...overrides } satisfies StackEntry;
}

export interface State {
  registers: Record<string, number>;
  stack: Stack;
}

export function initialState(overrides: Partial<State> = {}) {
  let state = {
    registers: {
      rbp: 0,
      rip: 0,
      rsp: 0,
    },
    ...overrides,
    stack: createStack(),
  };

  if (overrides.stack) {
    for (const entry of overrides.stack) {
      state = pushToStack(state, entry);
    }
  }

  state.registers.rsp = stackOffset(state.stack);

  return state;
}

function updateRegister<T extends State>(
  state: Readonly<T>,
  register: Readonly<keyof T["registers"]>,
  value: Readonly<number>,
): Readonly<T> {
  return { ...state, registers: { ...state.registers, [register]: value } };
}

function extractRegisterNameFromOperand(operand: string): string {
  return operand.split("%")[1];
}

export function readRegister<T extends State>(
  state: Readonly<T>,
  register: Readonly<keyof T["registers"]>,
) {
  return state.registers[register];
}

export function execute(state: Readonly<State>, instruction: string) {
  const [operation, ...operands] = instruction.split(" ");

  if (operation === "call") {
    const regex = new RegExp(/\*\%[a-z]+/);
    const offset =
      readRegister(state, "rip") + (regex.test(operands[0]) ? 2 : 5);

    return updateRegister(
      pushToStack(state, {
        value: offset,
        size: MEMORY_ADDRESS_SIZE,
      }),
      "rip",
      offset,
    );
  }

  if (operation.startsWith("push")) {
    const register = extractRegisterNameFromOperand(operands[0]);
    const value = readRegister(state, register);

    return pushToStack(state, { value: value, size: 8 });
  }

  if (instruction.startsWith("pop")) {
    const register = extractRegisterNameFromOperand(operands[0]);

    return popFromStack(state, register);
  }

  if (operation === "ret") {
    return updateRegister(
      updateRegister(state, "rip", state.registers.rip + 1),
      "rsp",
      readRegister(state, "rsp") - MEMORY_ADDRESS_SIZE,
    );
  }

  return state;
}
