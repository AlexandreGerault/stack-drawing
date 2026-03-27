import { Fragment, useMemo, useState } from "react";
import { stateBuilder } from "~/__tests__/state.builder";
import { att_lex } from "~/core/lexer";
import { initialState, type State } from "~/core/stack";

function selectRegisters(state: State): { register: string; value: number }[] {
  return Object.keys(state.registers).map((key) => ({
    register: key,
    value: state.registers[key],
  }));
}

function selectStackEntries(state: State): { value: number; offset: number }[] {
  return state.stack.reduce(
    (acc, entry) => {
      const offset =
        acc.length > 0 ? acc[acc.length - 1].offset + entry.size : 0;

      return [...acc, { value: entry.value, offset }];
    },
    [] as { value: number; offset: number }[],
  );
}
export function StackPreview() {
  const [code, setCode] = useState("");

  const tokens = useMemo(
    () => att_lex(code).map((token, index) => ({ ...token, id: index })),
    [code],
  );

  const state: State = stateBuilder(initialState())
    .withStackEntry({ value: 0xff, size: 8 })
    .withStackEntry({ value: 0xef, size: 8 })
    .withStackEntry({ value: 0xaf, size: 8 })
    .build();

  const startAddress = 0xffff;

  const stack = selectStackEntries(state);

  return (
    <div>
      <textarea onChange={(e) => setCode(e.target.value)} />
      <pre>{code}</pre>
      <div>
        <dl>
          {selectRegisters(state).map((entry) => (
            <Fragment key={entry.register}>
              <dt>{entry.value}</dt>
              <dd>{entry.register}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
      <ul>
        {tokens.map((token) => (
          <li key={token.id}>
            {token.type}
            {"value" in token ? ` ${token?.value}` : null}
          </li>
        ))}
      </ul>
      <table>
        <caption>Stack</caption>
        <thead>
          <tr>
            <th>Address</th>
            <th>Value</th>
          </tr>
        </thead>
        {stack.map((entry) => (
          <tr>
            <td>
              0x{(startAddress - entry.offset).toString(16).toUpperCase()}
            </td>
            <td>0x{entry.value.toString(16).toUpperCase()}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
