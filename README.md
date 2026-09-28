# React Architecture Guard

A strict TypeScript and `ts-morph` CLI for enforcing React component-file conventions in local and public repositories.

## Run it

Install dependencies and check the valid fixture:

```sh
npm install
npm run check
```

Build the CLI and run it directly:

```sh
npm run build
node ./dist/scripts/architecture/check-components.js
```

When published, the command is available as `react-architecture-guard`.

The checker scans `src/components/**/*.tsx` and feature-local `src/features/**/components/**/*.tsx` files by default. Use `--root` for another component tree:

```sh
npm run check -- --root src/features/agents/components
```

Files ending in `.test.tsx`, `.spec.tsx`, or `.stories.tsx` are ignored.

## Exercise failures

The intentionally invalid fixtures demonstrate the expected non-zero failure:

```sh
npm run check:invalid
```

The test command also checks the checker programmatically:

```sh
npm test
npx tsc --noEmit
```

Component files may contain imports and exactly one named exported function whose PascalCase name matches the kebab-case filename. Types, constants, helpers, additional components, and re-exports belong in neighboring files.

## What it enforces

- Component files use kebab-case filenames, such as `user-card.tsx`.
- Each component folder contains an `index.ts` that explicitly re-exports the component.
- The component name matches the filename in PascalCase, such as `UserCard`.
- The component file contains exactly one named exported component function.
- The component function has an explicit return type.
- Default exports and unrelated exports are rejected.
- Interfaces and type aliases belong in `<component>.types.ts`.
- Constants and enums belong in `<component>.constants.ts`.
- Helper functions belong in `<component>.utils.ts`.
- Additional components, classes, schemas, variables, and unrelated top-level declarations are rejected.
- Component files should live in a matching folder, such as `user-card/user-card.tsx`.
- Test, spec, and Storybook files are ignored: `*.test.tsx`, `*.spec.tsx`, and `*.stories.tsx`.

For example, `user-card/index.ts` must explicitly contain:

```ts
export { UserCard } from './user-card';
```

The command exits with a non-zero status when violations are found and prints each violation with its file, line number, explanation, and suggested destination.
