import { describe, expect, test } from "vitest";
import { att_lex, TokenTypes } from "~/core/lexer";

describe("Feature: Tokenize instructions from AT&T syntax", () => {
  const lexer = att_lex;

  test.for([
    "pushb",
    "pushw",
    "pushl",
    "pushq",
    "popb",
    "popw",
    "popl",
    "popq",
    "movb",
    "movw",
    "movl",
    "movq",
    "subb",
    "subw",
    "subl",
    "subq",
    "call",
    "ret",
    "leave",
  ])("Example: Tokenize simple instructions %s", (instruction) => {
    const tokens = lexer(instruction);

    expect(tokens).toHaveLength(1);
    expect(tokens).toContainEqual({
      type: TokenTypes.Identifier,
      value: instruction,
    });
  });

  test.for([
    ["%rsp", "rsp"],
    ["%rbp", "rbp"],
    ["%rip", "rip"],
  ])("Example: Tokenize registers", ([token, value]) => {
    const tokens = lexer(token); //?

    expect(tokens).toHaveLength(1);
    expect(tokens).toContainEqual({ type: TokenTypes.Register, value });
  });

  test.for([
    ["pushq %rbp", "pushq", "rbp"],
    ["popq %rax", "popq", "rax"],
  ])(
    "Example: tokenize instruction with a register %s %s",
    ([instruction, instructionCode, registerValue]) => {
      const tokens = lexer(instruction); //?

      expect(tokens).toHaveLength(2);
      expect(tokens).toContainEqual({
        type: TokenTypes.Identifier,
        value: instructionCode,
      });
      expect(tokens).toContainEqual({
        type: TokenTypes.Register,
        value: registerValue,
      });
    },
  );

  test.for([["$1", 1] as const, ["$12", 12] as const])(
    "Example: tokenize a constant value %s",
    ([instruction, value]) => {
      const tokens = lexer(instruction);

      expect(tokens).toHaveLength(1);
      expect(tokens).toContainEqual({ type: TokenTypes.Constant, value });
    },
  );

  test("Example: tokenize line comment", () => {
    const tokens = lexer("#size	main, .-main");

    expect(tokens).toHaveLength(1);
  });

  test("Example: tokenize a comma", () => {
    const tokens = lexer("movq	%rsp, %rbp");

    expect(tokens).toContainEqual({ type: TokenTypes.Comma });
  });

  test("Example: tokenize a colon", () => {
    const tokens = lexer("main:");

    expect(tokens).toHaveLength(2);
    expect(tokens).toContainEqual({ type: TokenTypes.Colon });
  });

  test("Example: tokenize left parenthesis", () => {
    const tokens = lexer("(");

    expect(tokens).toContainEqual({ type: TokenTypes.LeftParenthesis });
  });

  test("Example: tokenize right parenthesis", () => {
    const tokens = lexer(")");

    expect(tokens).toContainEqual({ type: TokenTypes.RightParenthesis });
  });

  test("Example: tokenize new lines", () => {
    const tokens = lexer("pushq	%rbp\nmovq	%rsp, %rbp");

    expect(tokens).toContainEqual({ type: TokenTypes.NewLine });
  });

  test("Example: tokenize dot", () => {
    const tokens = lexer(".size	main, .-main");

    expect(tokens).toContainEqual({ type: TokenTypes.Dot });
  });

  test("Example: tokenize minus operator", () => {
    const tokens = lexer("movl	$1, -4(%rbp)");

    expect(tokens).toContainEqual({ type: TokenTypes.Operator });
  });
});
