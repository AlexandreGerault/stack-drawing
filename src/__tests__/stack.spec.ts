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

/**
 * Test typology for call instruction:
 * - direct calls
 * - indirect calls
 *
 * Direct call example: Call a procedure to a given address (relative)
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

      expect(newState.registers.rip).toEqual(0x5);
    });

    test("Example: call *%eax increments the instruction pointer by 2", () => {
      const newState = execute(emptyState, "call *%eax");

      expect(newState.registers.rip).toEqual(0x2);
    });
  });

  describe("pushes return address to stack", () => {
    /**
     * Empty state => IP = 0
     */
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

      expect(newState.registers.rsp).toEqual(MEMORY_ADDRESS_SIZE);
    });
  });
});

describe("Instruction: ret", () => {
  describe("sets instruction pointer", () => {
    test("Example: ret increments the instruction pointer by 1", () => {
      const newState = execute(emptyState, "ret");

      expect(newState.registers.rip).toEqual(0x1);
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

      expect(newState.registers.rsp).toEqual(0);
    });
  });
});

describe("Instruction: pushb (byte push)", () => {
  describe("stores value on stack", () => {
    test("pushb %eax stores stack entry with size 1", () => {
      const newState = execute(emptyState, "pushb %eax");

      expect(newState.stack).toContainEqual(
        stackEntry({
          value: 0x0,
          size: 1,
        }),
      );
    });
  });

  describe("updates stack pointer", () => {
    test("pushb %eax updates SP to 0x04", () => {
      const newState = execute(emptyState, "pushb %eax");

      expect(newState.registers.rsp).toEqual(0x01);
    });
  });

  describe("tracks stack offset", () => {
    test("pushb followed by pushw sets stack offset to 0x3", () => {
      const stateA = execute(emptyState, "pushb %eax");
      const stateB = execute(stateA, "pushw %eax");

      expect(stackOffset(stateB.stack)).toEqual(0x3);
    });
  });
});

describe("Instruction: pushw (word push)", () => {
  describe("stores value on stack", () => {
    test("pushw %aex stores stack entry with size 2", () => {
      const newState = execute(emptyState, "pushw %aex");

      expect(newState.stack).toContainEqual(
        stackEntry({
          value: 0x0,
          size: 2,
        }),
      );
    });
  });

  describe("updates stack pointer", () => {
    test("pushw %aex updates SP to 0x04", () => {
      const newState = execute(emptyState, "pushw %aex");

      expect(newState.registers.rsp).toEqual(0x02);
    });
  });

  describe("tracks stack offset", () => {
    test("pushb then pushw then pushl sets stack offset to 0x7", () => {
      const stateA = execute(emptyState, "pushb %ebp");
      const stateB = execute(stateA, "pushw %ebp");
      const stateC = execute(stateB, "pushl %ebp");

      expect(stackOffset(stateC.stack)).toEqual(0x7);
    });
  });
});

describe("Instruction: pushl (long push)", () => {
  describe("stores value on stack", () => {
    test("pushl %ebp stores stack entry with size 4", () => {
      const newState = execute(emptyState, "pushl %ebp");

      expect(newState.stack).toContainEqual(
        stackEntry({
          value: 0x0,
          size: 4,
        }),
      );
    });
  });

  describe("updates stack pointer", () => {
    test("pushl %ebp updates SP to 0x04", () => {
      const newState = execute(emptyState, "pushl %ebp");

      expect(newState.registers.rsp).toEqual(0x04);
    });
  });
});

describe("Instruction: pushq (quad push)", () => {
  describe("stores value on stack", () => {
    test("pushq %ebp stores stack entry with size 8", () => {
      const newState = execute(emptyState, "pushq %ebp");

      expect(newState.stack).toContainEqual(
        stackEntry({
          value: 0x0,
          size: 8,
        }),
      );
    });
  });

  describe("updates stack pointer", () => {
    test("pushq %ebp updates SP to 0x04", () => {
      const newState = execute(emptyState, "pushq %ebp");

      expect(newState.registers.rsp).toEqual(0x08);
    });
  });

  describe("tracks stack offset", () => {
    test("pushb then pushw then pushl then pushq sets stack offset to 0xf", () => {
      const stateA = execute(emptyState, "pushb %ebp");
      const stateB = execute(stateA, "pushw %ebp");
      const stateC = execute(stateB, "pushl %ebp");
      const stateD = execute(stateC, "pushq %ebp");

      expect(stackOffset(stateD.stack)).toEqual(0xf);
    });
  });
});

describe("Instruction: popb (byte pop)", () => {
  describe("removes entry from stack", () => {
    test("popb removes single byte entry from stack", () => {
      const entry = stackEntry({ size: 1 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popb");

      expect(newState.stack).not.toContainEqual(entry);
    });

    test("popb removes top entry while keeping bottom entries", () => {
      const toKeep = stackEntry({ size: 1 });
      const toPop = stackEntry({ size: 2 });
      const state = initialState({ stack: [toKeep, toPop] });

      const newState = execute(state, "popw");

      expect(newState.stack).not.toContainEqual(toPop);
      expect(newState.stack).toContainEqual(toKeep);
    });
  });

  describe("resets stack offset", () => {
    test("popb on single-entry stack sets stack offset to 0", () => {
      const entry = stackEntry({ size: 1 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popb");

      expect(stackOffset(newState.stack)).toEqual(0);
    });

    test("popb on single-entry stack sets next stack address to 0", () => {
      const entry = stackEntry({ size: 1 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popb");

      expect(nextStackAddress(newState.stack)).toEqual(0);
    });
  });

  describe("maintains stack offset with multiple entries", () => {
    test("popw with two-entry stack updates stack offset to 1", () => {
      const toKeep = stackEntry({ size: 1 });
      const toPop = stackEntry({ size: 2 });
      const state = initialState({ stack: [toKeep, toPop] });

      const newState = execute(state, "popw");

      expect(stackOffset(newState.stack)).toEqual(1);
    });

    test("popw with two-entry stack updates next address to 2", () => {
      const toKeep = stackEntry({ size: 1 });
      const toPop = stackEntry({ size: 2 });
      const state = initialState({ stack: [toKeep, toPop] });

      const newState = execute(state, "popw");

      expect(nextStackAddress(newState.stack)).toEqual(2);
    });
  });
});

describe("Instruction: popw (word pop)", () => {
  describe("removes entry from stack", () => {
    test("popw removes single word entry from stack", () => {
      const entry = stackEntry({ size: 2 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popw");

      expect(newState.stack).not.toContainEqual(entry);
    });
  });

  describe("resets stack offset", () => {
    test("popw on single-entry stack sets stack offset to 0", () => {
      const entry = stackEntry({ size: 2 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popw");

      expect(stackOffset(newState.stack)).toEqual(0);
    });

    test("popw on single-entry stack sets next stack address to 0", () => {
      const entry = stackEntry({ size: 2 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popw");

      expect(nextStackAddress(newState.stack)).toEqual(0);
    });
  });
});

describe("Instruction: popl (long pop)", () => {
  describe("removes entry from stack", () => {
    test("popl removes single long entry from stack", () => {
      const entry = stackEntry({ size: 4 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popl %ebp");

      expect(newState.stack).not.toContainEqual(entry);
    });
  });

  describe("resets stack offset", () => {
    test("popl on single-entry stack sets stack offset to 0", () => {
      const entry = stackEntry({ size: 4 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popl %ebp");

      expect(stackOffset(newState.stack)).toEqual(0);
    });

    test("popl on single-entry stack updates SP to 0x0", () => {
      const state = initialState({ stack: [stackEntry({ size: 4 })] });

      const newState = execute(state, "popl %ebp");

      expect(newState.registers.rsp).toEqual(0x0);
    });
  });

  describe("maintains stack offset with multiple entries", () => {
    test("popl on eight-entry stack sets stack offset to 7", () => {
      const state = initialState({
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

      const newState = execute(state, "popb");

      expect(stackOffset(newState.stack)).toEqual(7);
    });

    test("popl on eight-entry stack sets next address to 8", () => {
      const state = initialState({
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

      const newState = execute(state, "popb");

      expect(nextStackAddress(newState.stack)).toEqual(8);
    });
  });
});

describe("Instruction: popq (quad pop)", () => {
  describe("removes entry from stack", () => {
    test("popq removes single quad entry from stack", () => {
      const entry = stackEntry({ size: 8 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popq %ebp");

      expect(newState.stack).not.toContainEqual(entry);
    });
  });

  describe("resets stack offset", () => {
    test("popq on single-entry stack sets stack offset to 0", () => {
      const entry = stackEntry({ size: 8 });
      const state = initialState({ stack: [entry] });

      const newState = execute(state, "popq %ebp");

      expect(stackOffset(newState.stack)).toEqual(0);
    });

    test("popq on single-entry stack updates SP to 0", () => {
      const state = initialState({ stack: [stackEntry({ size: 8 })] });

      const newState = execute(state, "popq %ebp");

      expect(newState.registers.rsp).toEqual(0);
    });
  });
});
