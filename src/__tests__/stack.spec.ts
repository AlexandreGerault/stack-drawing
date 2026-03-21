import { describe, expect, test } from "vitest";
import {
  initialState,
  execute,
  stackEntry,
  stackOffset,
  nextStackAddress,
  MEMORY_ADDRESS_SIZE,
} from "~/core/stack";

const emptyState = initialState();

describe("Feature: asm instruction moves the stack pointer", () => {
  test("Example: Calling a procedure moves down the SP", () => {
    const newState = execute(emptyState, "call 0x00FF");

    expect(newState.sp).toEqual(0x04);
  });

  test("Example: Returning from a procedure moves up the SP", () => {
    const newState = execute(emptyState, "ret");

    expect(newState.sp).toEqual(-0x04);
  });

  test("Example: Pushing a value onto the stack moves down the SP", () => {
    const newState = execute(emptyState, "pushl %ebp");

    expect(newState.sp).toEqual(0x04);
  });

  test("Example: Pushing a quad value onto the stack moves down the SP", () => {
    const newState = execute(emptyState, "pushl %ebp");

    expect(newState.sp).toEqual(0x04);
  });

  test("Example: Poping a value from the stack moves up the SP", () => {
    const state = initialState({ stack: [stackEntry({ size: 4 })] });

    const newState = execute(state, "popl %ebp");

    expect(newState.sp).toEqual(0x0);
  });

  test("Example: Poping a quad value from the stack moves up the SP", () => {
    const state = initialState({ stack: [stackEntry({ size: 8 })] });

    const newState = execute(state, "popq %ebp");

    expect(newState.sp).toEqual(0);
  });
});

describe("Feature: Calling a procedure saves the return address onto the stack", () => {
  test("Example: Calling a procedure once", () => {
    const instruction = "call 0x00FF";

    const newState = execute(emptyState, instruction);

    expect(newState.ip).toEqual(0x00ff);
    expect(newState.stack).toContainEqual(
      stackEntry({
        size: MEMORY_ADDRESS_SIZE,
        value: 0x00ff,
      }),
    );
  });

  test("Example: Calling multiple procedures", () => {
    const instruction = "call 0x00FF";

    const stateA = execute(emptyState, instruction);
    const stateB = execute(stateA, instruction);

    expect(stateA.ip).toEqual(0x00ff);
    expect(stateA.stack).toContainEqual(
      stackEntry({
        size: MEMORY_ADDRESS_SIZE,
        value: 0x00ff,
      }),
    );

    expect(stateB.ip).toEqual(0xff);
    expect(stateB.stack).toContainEqual(
      stackEntry({
        size: MEMORY_ADDRESS_SIZE,
        value: 0xff,
      }),
    );
    expect(stateB.stack).toHaveLength(2);
  });
});

describe("Feature: Pushing a value saves it onto the stack", () => {
  test("Example: Push a byte value to an empty stack", () => {
    const instruction = "pushb %aex";

    const stateA = execute(emptyState, instruction);

    expect(stateA.stack).toContainEqual(
      stackEntry({
        value: 0x0,
        size: 1,
      }),
    );
  });

  test("Example: Push a word value to an empty stack", () => {
    const instruction = "pushw %aex";

    const stateA = execute(emptyState, instruction);

    expect(stateA.stack).toContainEqual(
      stackEntry({
        value: 0x0,
        size: 2,
      }),
    );
  });

  test("Example: Push a long value to an empty stack", () => {
    const instruction = "pushl %ebp";

    const stateA = execute(emptyState, instruction);

    expect(stateA.stack).toContainEqual(
      stackEntry({
        value: 0x0,
        size: 4,
      }),
    );
  });

  test("Example: Push a quad value to an empty stack", () => {
    const instruction = "pushq %ebp";

    const stateA = execute(emptyState, instruction);

    expect(stateA.stack).toContainEqual(
      stackEntry({
        value: 0x0,
        size: 8,
      }),
    );
  });
});

describe("Feature: Pushing values to the stack keeps track of corresponding offset", () => {
  test("Example: Pushing values of each type", () => {
    const stateA = execute(emptyState, "pushb %ebp");
    const stateB = execute(stateA, "pushw %ebp");
    const stateC = execute(stateB, "pushl %ebp");
    const stateD = execute(stateC, "pushq %ebp");

    expect(stackOffset(stateB.stack)).toEqual(0x3);
    expect(stackOffset(stateC.stack)).toEqual(0x7);
    expect(stackOffset(stateD.stack)).toEqual(0xf);
  });
});

describe("Feature: Poping a value removes it from the stack", () => {
  test("Example: Poping a byte value from the stack that only contains it", () => {
    const entry = stackEntry({ size: 1 });
    const stateA = initialState({ stack: [entry] });

    const stateB = execute(stateA, "popb");

    expect(stateB.stack).not.toContainEqual(entry);
    expect(stackOffset(stateB.stack)).toEqual(0);
    expect(nextStackAddress(stateB.stack)).toEqual(0);
  });

  test("Example: Poping a word value from the stack that only contains it", () => {
    const entry = stackEntry({ size: 2 });
    const stateA = initialState({ stack: [entry] });

    const stateB = execute(stateA, "popw");

    expect(stateB.stack).not.toContainEqual(entry);
    expect(stackOffset(stateB.stack)).toEqual(0);
    expect(nextStackAddress(stateB.stack)).toEqual(0);
  });

  test("Example: Poping a long value from the stack that only contains it", () => {
    const entry = stackEntry({ size: 4 });
    const stateA = initialState({ stack: [entry] });

    const stateB = execute(stateA, "popl");

    expect(stateB.stack).not.toContainEqual(entry);
    expect(stackOffset(stateB.stack)).toEqual(0);
    expect(nextStackAddress(stateB.stack)).toEqual(0);
  });

  test("Example: Poping a quad value from the stack that only contains it", () => {
    const entry = stackEntry({ size: 8 });
    const stateA = initialState({ stack: [entry] });

    const stateB = execute(stateA, "popq");

    expect(stateB.stack).not.toContainEqual(entry);
    expect(stackOffset(stateB.stack)).toEqual(0);
    expect(nextStackAddress(stateB.stack)).toEqual(0);
  });

  test("Example: Poping a byte value from a stack that already contains word/byte", () => {
    const toPop = stackEntry({ size: 2 });
    const toKeep = stackEntry({ size: 1 });
    const stateA = initialState({ stack: [toKeep, toPop] });

    const stateB = execute(stateA, "popw");

    expect(stateB.stack).not.toContainEqual(toPop);
    expect(stateB.stack).toContainEqual(toKeep);
    expect(stackOffset(stateB.stack)).toEqual(1);
    expect(nextStackAddress(stateB.stack)).toEqual(2);
  });

  test("Example: Poping a byte value from a stack that already contains many entries", () => {
    const stateA = initialState({
      stack: [
        stackEntry(),
        stackEntry(),
        stackEntry(),
        stackEntry(),
        stackEntry(),
        stackEntry(),
        stackEntry(),
        stackEntry(),
      ],
    });

    const stateB = execute(stateA, "popb");

    expect(stackOffset(stateB.stack)).toEqual(7);
    expect(nextStackAddress(stateB.stack)).toEqual(8);
  });
});
