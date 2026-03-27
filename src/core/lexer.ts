export const TokenTypes = {
  Register: "register",
  Identifier: "identifier",
  Constant: "constant",
  Comment: "comment",
  Comma: "comma",
  Colon: "colon",
  LeftParenthesis: "lparen",
  RightParenthesis: "rparen",
  NewLine: "newline",
  Dot: "dot",
  Operator: "operator",
} as const;

type Token =
  | { type: typeof TokenTypes.Register; value: string }
  | { type: typeof TokenTypes.Identifier; value: string }
  | { type: typeof TokenTypes.Constant; value: number }
  | { type: typeof TokenTypes.Comment; value: string }
  | { type: typeof TokenTypes.Comma }
  | { type: typeof TokenTypes.Colon }
  | { type: typeof TokenTypes.LeftParenthesis }
  | { type: typeof TokenTypes.RightParenthesis }
  | { type: typeof TokenTypes.NewLine }
  | { type: typeof TokenTypes.Dot }
  | { type: typeof TokenTypes.Operator };

function register(value: string) {
  let cursor = 0;

  while (/[a-z%]/.test(value.slice(1)[cursor]) && cursor < value.length) {
    cursor += 1;
  }

  return {
    type: TokenTypes.Register,
    value: value.slice(1, cursor + 1),
  } as const;
}

function identifier(value: string) {
  let cursor = 0;

  while (cursor < value.length && /[a-zA-Z]/.test(value[cursor])) {
    cursor += 1;
  }

  return {
    type: TokenTypes.Identifier,
    value: value.slice(0, cursor),
  } as const;
}

function constant(value: string) {
  let cursor = 1;

  while (cursor < value.length && /[0-9]/.test(value[cursor])) {
    cursor += 1;
  }

  return {
    type: TokenTypes.Constant,
    value: parseInt(value.slice(1, cursor), 10),
  } as const;
}

function comment(value: string) {
  let cursor = 1;

  while (cursor < value.length && value[cursor] != "\n") {
    cursor += 1;
  }

  return { type: TokenTypes.Comment, value: value.slice(0, cursor) } as const;
}

export function att_lex(code: string) {
  let cursor = 0;
  const tokens: Token[] = [];

  let evaluated = code.slice(cursor, code.length - cursor);

  while (cursor < code.length && evaluated != "") {
    if (evaluated.startsWith("%")) {
      const reg = register(evaluated);
      tokens.push(reg);
      cursor += reg.value.length + 1;
    } else if (evaluated.startsWith("$")) {
      const c = constant(evaluated);
      tokens.push(c);
      cursor += 1 + c.value.toString(10).length;
    } else if (evaluated.startsWith("#")) {
      const comm = comment(evaluated);
      tokens.push(comm);
      cursor += 1 + comm.value.length;
    } else if (/[a-zA-Z]/.test(code[cursor])) {
      const inst = identifier(evaluated);
      tokens.push(inst);
      cursor += inst.value.length;
    } else if (evaluated[0] === ",") {
      tokens.push({ type: TokenTypes.Comma });
      cursor += 1;
    } else if (evaluated[0] === "-") {
      tokens.push({ type: TokenTypes.Operator });
      cursor += 1;
    } else if (evaluated[0] === ".") {
      tokens.push({ type: TokenTypes.Dot });
      cursor += 1;
    } else if (evaluated[0] === ")") {
      tokens.push({ type: TokenTypes.RightParenthesis });
      cursor += 1;
    } else if (evaluated[0] === "(") {
      tokens.push({ type: TokenTypes.LeftParenthesis });
      cursor += 1;
    } else if (evaluated[0] === ":") {
      tokens.push({ type: TokenTypes.Colon });
      cursor += 1;
    } else if (evaluated[0] === "\n") {
      tokens.push({ type: TokenTypes.NewLine });
      cursor += 1;
    } else {
      cursor += 1;
    }

    if (code[cursor] == " " || code[cursor] == "\t") {
      cursor += 1;
    }

    evaluated = code.slice(cursor, code.length);
  }

  return tokens;
}
