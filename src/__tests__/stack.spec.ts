import { describe, expect, test } from "vitest";
import {
  initialState,
  execute,
  stackEntry,
  stackOffset,
  nextStackAddress,
  MEMORY_ADDRESS_SIZE,
  readRegister,
} from "~/core/stack";
import { stateBuilder } from "./state.builder";

const emptyState = initialState();

/**
 * Test typology for call instruction:
 * - direct calls
 * - indirect calls
 *
 * Direct call example: Call a procedure to a given address
 *     118c:	e8 ef fe ff ff       	call   1080 <__x86.get_pc_thunk.bx>
 *     1191:	81 c3 63 2e 00 00    	add    $0x2e63,%ebx
 *
 * Indirect call example: Call a procedure from the address of a register
 *     1019:	ff d0                	call   *%eax
 *
 * We can see that the size of the direct call instruction is 5 bytes,
 * We can see that the size of the indirect call instruction is 2 bytes,
 */
describe("Instruction: call", () => {
  describe("sets instruction pointer", () => {
    test("Example: call 00FF increments the instruction pointer by 5", () => {
      const newState = execute(emptyState, "call 00FF");

      expect(readRegister(newState, "rip")).toEqual(0x5);
    });

    test("Example: call *%eax increments the instruction pointer by 2", () => {
      const newState = execute(emptyState, "call *%eax");

      expect(readRegister(newState, "rip")).toEqual(0x2);
    });
  });

  describe("pushes return address to stack", () => {
    test("call 00FF pushes return address 5", () => {
      const newState = execute(emptyState, "call 00FF");

      expect(newState.stack).toContainEqual(
        stackEntry({
          size: MEMORY_ADDRESS_SIZE,
          value: 0x5,
        }),
      );
    });

    test("call 00FF then call 00FF creates two stack entries", () => {
      const stateA = execute(emptyState, "call 00FF");
      const stateB = execute(stateA, "call 00FF");

      expect(stateB.stack).toHaveLength(2);
      expect(stateB.stack).toContainEqual(
        stackEntry({
          size: MEMORY_ADDRESS_SIZE,
          value: 0xa,
        }),
      );
    });
  });

  describe("updates stack pointer", () => {
    test("call 00FF updates SP", () => {
      const newState = execute(emptyState, "call 00FF");

      expect(readRegister(newState, "rsp")).toEqual(MEMORY_ADDRESS_SIZE);
    });
  });
});

/**
 * This instruction allows to exit a procedure and get back to the
 * previous execution context.
 *
 * Example from disassembled code:
 *     1158:	c3                   	ret
 *
 * We can see that the instruction size here is only 1 byte.
 */
describe("Instruction: ret", () => {
  describe("sets instruction pointer", () => {
    test("Example: ret increments the instruction pointer by 1", () => {
      const newState = execute(emptyState, "ret");

      expect(readRegister(newState, "rip")).toEqual(0x1);
    });
  });

  describe("updates stack pointer", () => {
    test("ret updates SP", () => {
      const state = initialState({
        stack: [
          // Return address on the stack
          stackEntry({ value: 0xf0ff, size: MEMORY_ADDRESS_SIZE }),
        ],
      });

      const newState = execute(state, "ret");

      expect(readRegister(newState, "rsp")).toEqual(0);
    });
  });
});

/**
 * This instruction pushes the base pointer register value onto the stack.
 *
 * Examples from disassembled code:
 *     1020:	ff 35 ca 2f 00 00    	push   0x2fca(%rip)
 *     104d:	50                   	push   %rax
 *     104e:	54                   	push   %rsp
 *     10ed:	55                   	push   %rbp
 *
 * We distinguish that there are two cases:
 * - pushing a register values
 * - pushing a value from memory
 *
 * Instruction size from registers rax, rsp and rbp are 1 byte (just an
 * opcode).
 *
 * Instruction to push a value from memory is not supported yet.
 */
describe("Instruction: push", () => {
  describe("stores value on stack", () => {
    test("push %rax stores stack entry", () => {
      const state = stateBuilder(emptyState)
        .withRegisterValue("rax", 0x274234bdcdefae4e)
        .build();

      const newState = execute(state, "pushb %rax");

      expect(newState.stack).toContainEqual(
        stackEntry({
          value: 0x274234bdcdefae4e,
          size: 8,
        }),
      );
    });
  });

  describe("updates stack pointer", () => {
    test("push %rax updates SP to 0x08", () => {
      const state = stateBuilder(emptyState)
        .withRegisterValue("rax", 0xaefdda4eca8dc455)
        .build();

      const newState = execute(state, "pushb %rax");

      expect(readRegister(newState, "rsp")).toEqual(0x08);
    });
  });

  describe("tracks stack offset", () => {
    test("push followed by push sets stack offset to 0xF1", () => {
      const state = stateBuilder(emptyState)
        .withRegisterValue("rax", 0xaefdda4eca8dc455)
        .build();

      const stateA = execute(state, "push %rax");
      const stateB = execute(stateA, "push %rax");

      expect(stackOffset(stateB.stack)).toEqual(0x10);
    });
  });
});

/**
 * This instruction pops a value from the stack
 *
 * Examples from disassembled code:
 *     1045:	5e                   	pop    %rsi
 *     1113:	5d                   	pop    %rbp
 *     1143:	5d                   	pop    %rbp
 *
 * We can see that there are two opcodes without operands.
 * It seems the opcode defines a pop for a given register.
 * The register is the destination of the popped value.
 */
describe("Instruction: pop", () => {
  describe("removes entry from stack", () => {
    test("pop removes entry from stack", () => {
      const state = stateBuilder(emptyState)
        .withStackEntry({ value: 0x1234567890abcdef, size: 8 })
        .build();

      const newState = execute(state, "pop %rax");

      expect(newState.stack).not.toContainEqual({
        value: 0x1234567890abcdef,
        size: 8,
      });
    });

    test("pop removes top entry while keeping bottom entries", () => {
      const state = stateBuilder(emptyState)
        .withStackEntry({ value: 0x1234567890abcdef, size: 8 })
        .withStackEntry({ value: 0x325463face321c1f, size: 8 })
        .build();

      const newState = execute(state, "pop %rax");

      expect(newState.stack).not.toContainEqual({
        value: 0x325463face321c1f,
        size: 8,
      });
      expect(newState.stack).toContainEqual({
        value: 0x1234567890abcdef,
        size: 8,
      });
    });
  });

  describe("resets stack offset", () => {
    test("pop on single-entry stack sets stack offset to 0", () => {
      const state = stateBuilder(emptyState)
        .withStackEntry({ value: 0x1234567890abcdef, size: 8 })
        .build();

      const newState = execute(state, "pop %rax");

      expect(stackOffset(newState.stack)).toEqual(0);
    });

    test("pop on single-entry stack sets next stack address to 0", () => {
      const state = stateBuilder(emptyState)
        .withStackEntry({ value: 0x1234567890abcdef, size: 8 })
        .build();

      const newState = execute(state, "pop %rax");

      expect(nextStackAddress(newState.stack)).toEqual(0);
    });
  });

  describe("maintains stack offset with multiple entries", () => {
    test("pop with two-entry stack updates stack offset to 8", () => {
      const state = stateBuilder(emptyState)
        .withStackEntry({ value: 0x1234567890abcdef, size: 8 })
        .withStackEntry({ value: 0x325463face321c1f, size: 8 })
        .build();

      const newState = execute(state, "pop %rax");

      expect(stackOffset(newState.stack)).toEqual(8);
    });
  });

  describe("pop stores the popped value in the register", () => {
    const state = stateBuilder(emptyState)
      .withStackEntry({ value: 0x1234567890abcdef, size: 8 })
      .build();

    const newState = execute(state, "pop %rax");

    expect(readRegister(newState, "rax")).toEqual(0x1234567890abcdef);
  });
});
