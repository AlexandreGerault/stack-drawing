/**
 * In the context of this application we'll suppose the following
 * mapping considering 8086 intel processors.
 * This might not be true so this can be updated carrefully if documented.
 */
type Suffix = "b" | "w" | "l" | "q";

export const MEMORY_ADDRESS_SIZE = 8;

const BlockSizes = {
  b: 1,
  w: 2,
  l: 4,
  q: 8,
} satisfies Record<Suffix, number>;

type StackEntry = {
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

function pushToStack(
  state: Readonly<State>,
  entry: Pick<StackEntry, "value" | "size">,
): State {
  const newEntry = { ...entry };

  return {
    ...state,
    registers: {
      ...state.registers,
      rsp: state.registers.rsp + entry.size,
    },
    stack: [...state.stack, newEntry],
  };
}

function popFromStack(state: Readonly<State>): State {
  const lastElement = state.stack[state.stack.length - 1];

  const stack = state.stack.slice(0, -1);

  const newRsp = state.registers.rsp - (lastElement?.size || 0);

  return {
    ...state,
    registers: { ...state.registers, rsp: newRsp },
    stack,
  };
}

function createStack(): Stack {
  return [];
}

export function stackEntry(overrides: Readonly<Partial<StackEntry>> = {}) {
  return { value: 0, size: 1, ...overrides } satisfies StackEntry;
}

interface State {
  registers: Record<string, number>;
  stack: Stack;
}

function assertSuffix(suffix: string): asserts suffix is Suffix {
  if (!["b", "w", "l", "q"].includes(suffix)) {
    throw new Error(
      `Invalid instruction suffix: ${suffix} is not in ["b", "w", "l", "q"]`,
    );
  }
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
  register: Readonly<keyof State["registers"]>,
  value: Readonly<number>,
) {
  return { ...state, registers: { ...state.registers, [register]: value } };
}

export function execute(state: Readonly<State>, instruction: string) {
  const [operation, ...operands] = instruction.split(" ");

  if (operation === "call") {
    const regex = new RegExp(/\*\%[a-z]+/);
    const offset = state.registers.rip + (regex.test(operands[0]) ? 2 : 5);

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
    const suffix = operation.slice(-1);

    assertSuffix(suffix);

    const blockSize = BlockSizes[suffix];

    return pushToStack(state, { value: 0, size: blockSize });
  }

  if (instruction.startsWith("pop")) {
    return popFromStack(state);
  }

  if (operation === "ret") {
    return updateRegister(
      updateRegister(state, "rip", state.registers.rip + 1),
      "rsp",
      state.registers.rsp - MEMORY_ADDRESS_SIZE,
    );
  }

  return state;
}
