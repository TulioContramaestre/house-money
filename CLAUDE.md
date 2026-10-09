@AGENTS.md

# House Money

A statically exported practice casino, rebuilt from an earlier single-file app. The tests are now the behaviour spec: the unit tests pin down rules, payouts, copy and timings, and the Playwright suite pins down flows and layout. Change copy or behaviour only on purpose, and update the tests and the README's differences list with it.

## Architecture

Dependencies point one way:

```
app/  →  components/ + games/*/ui + games/GameStage  →  session/  →  games/*/{types,rules,engine,layout}.ts + lib/
```

`eslint.config.mjs` enforces this. Don't loosen those rules to make an import work; move the code instead.

- **`lib/` and the game `types`/`rules`/`engine`/`layout` files are pure TypeScript.** They have no React, Next or DOM. Browser APIs come in only through `lib/security` (crypto, built-ins) and `lib/timing` (timers, `matchMedia`).
- **`lib/security`, `lib/random`, `lib/cards` and `lib/ledger` use only the built-ins captured in `lib/security/trusted.ts`**, plain operators and index access. They don't use `Math.*` (lint enforces this) or `Array.prototype` methods. Use `itemAt` for checked indexing.
- **Components never calculate rules or money.** They render a view object and dispatch typed actions. If a component needs a value, add it to the engine's view.
- **UI layers may import types, not runtime code**, from `**/engine`, `**/rules`, `@/lib/ledger/*`, `@/lib/random/*` or `@/lib/cards/shoe`. Shared `components/` may not import anything game-specific.
- **`app/` files are thin:** routing, guards and composition only. Default exports appear only where Next requires them.
- **Component folders** follow `Name/Name.tsx`, `Name/Name.module.css` (omitted if there are no styles) and `Name/index.ts`. Use named exports. Keep a component under about 150 lines; split it when it grows. Add `"use client"` only where a component calls hooks.

### State

- `session/session.ts` holds a module-level singleton: the ledger (private to the module, never exported or passed around), the engines, the status (`idle | opening | open | closed`), the active game, the selected chip and the receipt.
- React reads frozen snapshots through `useSyncExternalStore` (`session/hooks.ts`). Every hook's server snapshot is the idle state, because every page is prerendered.
- **Engines** extend `games/engineBase.ts`.
  - The base class caches a frozen view until something changes. Engines call `say()` or `changed()` to publish.
  - The ledger notifies synchronously and React reads the view inside that notification, so every state change must end with `say()` or `changed()`. A ledger call alone leaves a stale view cached.
  - Async sequences (dealing, the dealer's turn, spinning, tumbling) live in the engine and wait on `deps.pause`.
  - Money goes through `deps.ledger` (`reserve`, `release`, `settle`); the chip comes from `deps.getChip()` and randomness from `deps.rng`.
- **Guards** in `session/guards.ts` decide where each route sends you.
  - `GameStage` always renders the session's *active* game. `useActivateGame` syncs the URL into the session, and `router.replace`s back to the locked game if the active one can't be left.
  - Tabs call `session.requestSwitch(id)` and then `router.push` only on `"switched"`.
- **Roulette spin protocol:** `WheelStrip` sets `--i = spinTarget ?? stripIndex` and adds the `spinning` class in the same render. `onTransitionEnd` dispatches `spinSettled`, and the engine also gives up waiting after 4200 ms. Don't add effects or measure DOM here.
- **Effects are kept to the load-bearing ones:** guard redirects, `useActivateGame`, `useLeaveWarning` and `useDomGuard`'s `takeRecords`. Prefer event handlers and derived values. The log's scroll keeping uses `getSnapshotBeforeUpdate` in a small class component. The deal animation uses `useFreshAfter`, which updates state during render, with no side effects.

### Tamper resistance

Keep every protection when changing code:
- Validate in engines and the ledger, never only in the UI.
- Expose nothing on `window`.
- Use no `localStorage`, `sessionStorage`, IndexedDB or cookies (lint enforces this).
- Build the receipt from the ledger only.
- Keep `useDomGuard` on the header stats and the log. It remounts its subtree (a key bump) when anything other than React edits it, so put its `key` on the guarded subtree and `ref={watch}` on that subtree's root element.

Global prototypes are deliberately not frozen, because freezing them breaks React and Next. The README's Limits section explains what that leaves open.

## Adding a game

1. **Create `src/games/<id>/types.ts`.** Define `<Name>View extends BaseView` (add `RebetView` if the game has a repeat-bet button) and a discriminated-union `<Name>Action`.
2. **Create `rules.ts`, the pure rules.** Export the display name (for example `BACCARAT_NAME`) and every constant and payout helper. Add `rules.test.ts`.
3. **Create `engine.ts`** with `class <Name>Engine extends EngineBase<View, Action>`.
   - Give it `readonly id = "<id>"` (a literal) and `readonly name`.
   - The constructor calls `super(deps.ledger, "<opening message>")`.
   - Implement `dispatch` (an exhaustive `switch` ending in `exhaustive(action)`, ignoring actions while busy), `isBusy`, `canLeave`, `lockMessage`, `leave` (release unplayed chips, then `say()` so the view republishes) and `buildView` (which must include `message`, `busy` and `canLeave`).
   - Add `engine.test.ts` using `engineHarness` with `scriptedRng` or `stackedShoe` from `src/test/`.
4. **Create `ui/` with a `Table`, an `Actions` and a `Rules` component.** `Table` and `Actions` take `GameUiProps<View, Action>` (`{ view, dispatch }`). Build them from `components/ui`, `components/table`, `components/cards` and `components/dice`. `Rules` takes no props and returns the rules copy as `<h3>` sections with `<ul>` lists; `GameStage` shows it in the rules dialog. Add a `ui/ui.test.tsx` using `renderLive` from `src/test/liveGame.tsx`, and pin the rules copy there.
5. **Register it in two places:**
   - an entry `{ id, name, createEngine }` in `GAMES` in `src/games/registry.ts`;
   - a line `<id>: connect("<id>", <Name>Table, <Name>Actions, <Name>Rules)` in `src/games/registry.ui.tsx` (the `satisfies Record<GameId, GameUi>` check fails until you do).
6. **That's all the wiring.** The tab, the `/play/<id>` static route, the rules button, chip handling, the log, the receipt's by-game lines and cash-out all follow from the registry.
7. **Add `e2e/<id>.spec.ts`:** at least 10 rounds, calling `expectLedgerAddsUp` after each. Add the tab name to `openGame` in `e2e/helpers.ts`.

## Conventions

- **Money is always an integer.** Stakes are multiples of 1,000, checked with `isStake`. Payouts use integer arithmetic (`bet * 3 / 2`, `bet * 19 / 20`) and round only where the existing rules do.
- **Actions** are discriminated unions handled by exhaustive `switch`es.
- **Strict TypeScript** with `noUncheckedIndexedAccess`. Don't use `any` or `@ts-ignore`, and don't use a non-null `!` without a comment explaining why it's safe.
- **Naming:** components in `PascalCase`, hooks as `useX`, pure modules in `camelCase.ts`, CSS module classes in `camelCase`.
- **Styling:** CSS Modules only, with design tokens from `src/styles/tokens.css`. Keep the existing specificity relationships; a module class often needs a parent selector to beat a shared component's class. Put `:hover` rules inside `@media (hover: hover)`, in place, so source order (and which rule wins) doesn't change.
- **Comments are rare** and explain why, not what. Leave no dead code and no unowned TODOs.
- **Next 16 specifics:** route `params` is a Promise. `PageProps<"/route">` and `LayoutProps<"/route">` are global types generated by `next typegen`. Dynamic routes need `generateStaticParams` and `dynamicParams = false`. The config may not use rewrites, redirects, headers, middleware or server actions (static export).

## Testing

- **`npm test`** (Vitest) covers unit and component tests in `src/**/*.test.{ts,tsx}`.
  - Component tests opt into jsdom with a `// @vitest-environment jsdom` first line.
  - CSS module class names are left unhashed in tests, so tests can assert on `"fresh"`, `"locked"` and so on.
  - Tests that drive the shared session mock `@/session/session` with a getter; see `casino.test.tsx`.
  - Anything that opens or closes a session runs WebCrypto, so wait for the outcome (`waitFor`) rather than a single `flush()`.
- **`npm run test:e2e`** (Playwright) runs against the built `out/`.
  - Reduced motion is the default, so rounds are fast. `motion.spec.ts` turns it off to test the real animations.
  - Outcomes are random, so specs play until the state they need, using the helpers in `e2e/helpers.ts` (`blackjackRound`, `handInPlay`, `playRound`).
  - Use `exact` role names when a name is a substring of another, such as `5,000 chip` and `25,000 chip`.
