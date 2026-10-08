import { argsOf, revertsOf, slotName } from "./lab-graph.ts";
import {
  assetSlot,
  isBoolSlot,
  type Scenario,
  type ScNode,
  scenarioOrder,
  sharePair,
} from "./lab-scenario.ts";
import { fnName, type PlayModel, paramsOf, parseUsdc } from "./playground.ts";

/**
 * Scenario → Foundry test (.t.sol): actors via makeAddr, funds via the mock token's mint,
 * vm.prank per call, vm.expectRevert for expected reverts, assertEq / assertGe for asserts.
 * Written for test/scenarios/ of a project laid out like this repo's foundry/ (src/mocks/Mocks.sol).
 */

// ponytail: interface → mock by name; unknown interfaces deploy as address(0), add an entry when a project brings more mocks
const MOCKS: Record<string, string> = {
  IOracle: "MockOracle",
  IStrategy: "MockStrategy",
  IUniswapV2Router02: "MockUniswapRouter",
  IERC20: "MockUSDC",
};
const RESERVED = new Set(
  "after alias apply auto byte case copyof default define final implements in inline let macro match mutable null of override partial promise reference relocatable sealed sizeof static supports switch typedef typeof unchecked var usdc vm".split(
    " ",
  ),
);
const ident = (s: string) => {
  const x = s.replace(/\W+/g, "_").replace(/^(\d)/, "_$1") || "x";
  return RESERVED.has(x) ? `${x}_` : x;
};
const pascal = (s: string) =>
  s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");

/** 5000000000n → "5_000e6", 1234n → "1234". */
export function solAmount(raw: bigint): string {
  if (raw === 0n) return "0";
  if (raw % 10n ** 6n) return raw.toString();
  return `${(raw / 10n ** 6n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "_")}e6`;
}

/** Default value of a solidity type, for an unwired argument. */
function zero(type: string): string {
  if (/^u?int/.test(type)) return "0";
  if (type === "bool") return "false";
  if (type === "address") return "address(0)";
  if (type.endsWith("[]")) return `new ${type}(0)`;
  if (type === "string" || type === "bytes") return '""';
  return `${type}(address(0))`;
}

export type FoundryTest = { file: string; contract: string; source: string };
/** `file` = the contract's path in its Foundry project, e.g. src/LuoraVault.sol */
export type LabModel = PlayModel & { file: string };

export function foundryTest(m: LabModel, sc: Scenario): FoundryTest {
  const contract = `Scenario${pascal(sc.name)}Test`;
  const self = /vault/i.test(m.contract)
    ? "vault"
    : ident(m.contract[0].toLowerCase() + m.contract.slice(1));
  const node = (id: string) => sc.nodes.find((n) => n.id === id);
  const into = (id: string, port: string) =>
    sc.wires.find((w) => w.to.node === id && w.to.port === port)?.from;
  const actors = sc.nodes.filter(
    (n): n is Extract<ScNode, { kind: "actor" }> => n.kind === "actor",
  );
  const actorVar = new Map(actors.map((a) => [a.id, ident(a.label)]));
  const byRole = (role: string) => actors.find((a) => a.role === role);
  const asset = assetSlot(m);
  const pair = sharePair(m);
  const snapVar = (id: string) => `snap_${id.replace(/\W+/g, "_")}`;

  // ---- deployment: constructor args mapped to mocks / actors ----
  const interfaces = new Set(
    m.lines.flatMap((l) => /^\s*interface\s+(\w+)/.exec(l)?.[1] ?? []),
  );
  const ctor = m.pieces.find(
    (p) => p.sys === "logic" && p.name === "constructor",
  );
  const ctorDecl = ctor
    ? m.lines.slice(m.lineOf(ctor), m.lineOf(ctor) + (ctor.n ?? 1)).join(" ")
    : "";
  const mocks = new Set<string>(asset ? ["MockUSDC"] : []);
  const used = new Set<string>();
  const pre: string[] = [];
  let tokenSeen = false;
  const ctorArgs = paramsOf(ctorDecl).map((p) => {
    const name = p.name.replace(/^_+/, "");
    if (/ERC20/.test(p.type) && !tokenSeen && asset) {
      tokenSeen = true;
      used.add(p.type);
      return `${p.type}(address(usdc))`;
    }
    if (p.type === "address") {
      const a = byRole(name);
      return a ? (actorVar.get(a.id) as string) : `makeAddr("${name}")`;
    }
    const mock = MOCKS[p.type] ?? (/ERC20/.test(p.type) ? "MockUSDC" : null);
    if (interfaces.has(p.type) || mock) used.add(p.type);
    if (!mock) return zero(p.type);
    mocks.add(mock);
    pre.push(`address ${ident(name)}_ = address(new ${mock}());`);
    return `${p.type}(${ident(name)}_)`;
  });
  const owner = byRole("owner");

  // ---- values flowing along wires ----
  const valueAt = (id: string, port: string, type: string): string => {
    const from = into(id, port);
    const n = from && node(from.node);
    if (!n) return zero(type);
    if (n.kind === "actor") {
      const v = actorVar.get(n.id) as string;
      return type === "address"
        ? v
        : interfaces.has(type)
          ? `${type}(${v})`
          : v;
    }
    if (n.kind === "const") return solAmount(parseUsdc(n.value) ?? 0n);
    if (n.kind === "snapshot") return snapVar(n.id);
    return zero(type);
  };
  const argList = (callNode: string, fn: string) =>
    argsOf(m, fn).map((a, i) => {
      const v = valueAt(callNode, `a${i}`, a.type);
      if (interfaces.has(a.type)) used.add(a.type);
      return v;
    });
  const expectFor = (reason: string) =>
    reason.startsWith("panic")
      ? "vm.expectRevert();"
      : reason.endsWith("()")
        ? `vm.expectRevert(${m.contract}.${reason.slice(0, -2)}.selector);`
        : `vm.expectRevert(bytes("${reason}"));`;

  // ---- the test body, in execution order ----
  const body: string[] = [];
  const say = (s: string) => body.push(`        ${s}`);
  for (const id of scenarioOrder(sc)) {
    const n = node(id);
    if (!n) continue;
    if (n.kind === "call") {
      const fn = fnName(m.byId[n.fn] ?? ({ name: n.fn } as never));
      const caller = into(id, "caller");
      say(`// ${fn}`);
      if (caller && actorVar.has(caller.node))
        say(`vm.prank(${actorVar.get(caller.node)});`);
      const expect = sc.nodes.find(
        (e) =>
          e.kind === "expect" &&
          sc.wires.some((w) => w.to.node === e.id && w.from.node === id),
      );
      if (expect?.kind === "expect") {
        const port = into(expect.id, "call")?.port ?? "";
        say(expectFor(expect.reason || port.replace(/^r:/, "")));
      }
      say(`${self}.${fn}(${argList(id, n.fn).join(", ")});`);
    }
    if (n.kind === "snapshot") {
      const wired = into(id, "slot");
      const of = wired?.port.startsWith("w:") ? wired.port.slice(2) : n.of;
      const who = into(id, "who");
      const whoVar = who && actorVar.get(who.node);
      if (of === "balance") {
        say(
          `uint256 ${snapVar(id)} = usdc.balanceOf(${whoVar ?? `address(${self})`});`,
        );
      } else if (m.byId[of]) {
        const p = m.byId[of];
        const t = isBoolSlot(m, of) ? "bool" : "uint256";
        say(
          `${t} ${snapVar(id)} = ${self}.${slotName(p)}(${p.mapping ? (whoVar ?? "address(0)") : ""});`,
        );
      }
    }
    if (n.kind === "assert") {
      const c = n.check;
      if (c.type === "cmp") {
        const fnFor = {
          "==": "assertEq",
          ">=": "assertGe",
          "<=": "assertLe",
          ">": "assertGt",
          "<": "assertLt",
        }[c.op];
        say(
          `${fnFor}(${valueAt(id, "a", "uint256")}, ${valueAt(id, "b", "uint256")}, "a ${c.op} b");`,
        );
      }
      if ((c.type === "sum" || c.type === "solvent") && pair) {
        if (c.type === "solvent")
          say(
            `assertGe(usdc.balanceOf(address(${self})), ${self}.${pair.total}(), "${self} holds at least ${pair.total}");`,
          );
        else {
          const holders = [
            ...actors.map((a) => actorVar.get(a.id) as string),
            ...(owner ? [] : [`${self}.owner()`]),
          ];
          const terms =
            holders.map((h) => `${self}.${pair.map}(${h})`).join(" + ") || "0";
          say(
            `assertEq(${self}.${pair.total}(), ${terms}, "${pair.total} == sum of ${pair.map}");`,
          );
        }
      }
      if (c.type === "only" || c.type === "paused") {
        const fn = fnName(m.byId[c.fn] ?? ({ name: c.fn } as never));
        const rs = revertsOf(m, c.fn);
        const r =
          c.type === "only"
            ? rs.find((x) => /msg\.sender\s*==|==\s*msg\.sender/.test(x.cond))
            : rs.find((x) => /^!\s*\w+$/.test(x.cond));
        const flag = r && /^!\s*(\w+)$/.exec(r.cond)?.[1];
        if (c.type === "paused" && flag)
          say(`assertTrue(${self}.${flag}(), "${flag} here");`);
        say(
          `vm.prank(makeAddr("${c.type === "only" ? `not_${m.byId[c.fn]?.caller ?? "role"}` : "anyone"}"));`,
        );
        say(r ? expectFor(r.reason) : "vm.expectRevert();");
        say(
          `${self}.${fn}(${argsOf(m, c.fn)
            .map((a) => zero(a.type))
            .join(
              ", ",
            )}); // ${c.type === "only" ? `only ${m.byId[c.fn]?.caller}` : `blocked while paused`}`,
        );
        for (const a of argsOf(m, c.fn))
          if (interfaces.has(a.type)) used.add(a.type);
      }
    }
  }

  const imports = [
    m.contract,
    ...[...used].filter((t) => interfaces.has(t)).sort(),
  ];
  const src = [
    "// SPDX-License-Identifier: MIT",
    "pragma solidity ^0.8.20;",
    "",
    `// Generated by Luora Lab from the scenario "${sc.name}".`,
    "// It tests INTENDED behaviour: a failing assertion is a finding (see the Lab for the fix).",
    `// Run: node luora-scenario.mjs ${contract.replace(/Test$/, "")}.t.sol`,
    'import {Test} from "forge-std/Test.sol";',
    `import {${imports.join(", ")}} from "../../${m.file}";`,
    ...(mocks.size
      ? [
          `import {${[...mocks].sort().join(", ")}} from "../../src/mocks/Mocks.sol";`,
        ]
      : []),
    "",
    `contract ${contract} is Test {`,
    `    ${m.contract} ${self};`,
    ...(asset ? ["    MockUSDC usdc;"] : []),
    ...actors.map(
      (a) => `    address ${actorVar.get(a.id)} = makeAddr("${a.label}");`,
    ),
    "",
    "    function setUp() public {",
    ...(asset ? ["        usdc = new MockUSDC();"] : []),
    ...pre.map((l) => `        ${l}`),
    ...(owner ? [`        vm.prank(${actorVar.get(owner.id)});`] : []),
    `        ${self} = new ${m.contract}(${ctorArgs.join(", ")});`,
    ...(asset
      ? actors.flatMap((a) => {
          const v = actorVar.get(a.id);
          const raw = parseUsdc(a.balance) ?? 0n;
          return [
            ...(raw ? [`        usdc.mint(${v}, ${solAmount(raw)});`] : []),
            `        vm.prank(${v});`,
            `        usdc.approve(address(${self}), type(uint256).max);`,
          ];
        })
      : []),
    "    }",
    "",
    "    function test_scenario() public {",
    ...body,
    "    }",
    "}",
    "",
  ].join("\n");
  return {
    file: `${contract.replace(/Test$/, "")}.t.sol`,
    contract,
    source: src,
  };
}
