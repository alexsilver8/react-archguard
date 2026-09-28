# react-archguard

`react-archguard` is a fast TypeScript and `ts-morph` CLI for enforcing strict React component-file conventions.

Requires Node.js 20 or newer.

## Install once, use anywhere

Install it globally:

```sh
npm install --global react-archguard
```

Then run it from any React repository:

```sh
react-archguard
```

You can also run it without a global install:

```sh
npx react-archguard
```

`react-guard` and `react-architecture-guard` remain available as compatibility aliases.

## Usage

By default, the CLI scans `src/components` and `src/features` for `*.tsx` component files:

```sh
react-archguard
```

Scan a specific component tree:

```sh
react-archguard --root src/features/agents/components
```

Useful options:

```text
-r, --root <path>  component tree to scan
    --json         print a machine-readable report
    --no-color     disable styled terminal output
-q, --quiet       only print output when violations are found
-v, --version     output the installed version
-h, --help        display help for the command
```

The command exits with status `0` when the scan passes and status `1` when violations are found, so it works in CI, pre-commit hooks, and editor tasks. Use `--json` when another tool needs the result as structured data.

## Releases and updates

For the first release, publish the package once from your machine:

```sh
npm login
npm publish --access public
```

After that first publish, configure npm Trusted Publishing for this repository and the `Publish npm package` workflow. Select GitHub Actions and use:

```text
Organization or user: alexsilver8
Repository: react-archguard
Workflow filename: publish.yml
```

Then create a release locally:

```sh
npm test
npm version patch
git push origin main --follow-tags
```

Use `minor` for backwards-compatible features or `major` for breaking changes. The tag starts the GitHub Actions workflow, which verifies and publishes the package. Users can update with:

```sh
npm install --global react-archguard@latest
```

The package uses npm's OIDC-based trusted publishing, so the workflow does not need a long-lived npm token.

## Development

Install dependencies and run the checker locally:

```sh
npm install
npm run check
```

Build the distributable CLI:

```sh
npm run build
node ./dist/scripts/architecture/cli.js
```

Run the automated checks:

```sh
npm test
npx tsc --noEmit
```

The intentionally invalid fixtures demonstrate the expected non-zero failure:

```sh
npm run check:invalid
```

## What it enforces

- Component filenames use kebab-case, such as `user-card.tsx`.
- Each component folder contains an `index.ts` that explicitly re-exports the component.
- The component name matches the filename in PascalCase, such as `UserCard`.
- The component file contains exactly one named exported component function.
- The component function has an explicit return type.
- Default exports and unrelated exports are rejected.
- Interfaces and type aliases belong in `<component>.types.ts`.
- Constants and enums belong in `<component>.constants.ts`.
- Helper functions belong in `<component>.utils.ts`.
- Additional components, classes, schemas, variables, and unrelated top-level declarations are rejected.
- Component files live in a matching folder, such as `user-card/user-card.tsx`.
- Test, spec, and Storybook files are ignored: `*.test.tsx`, `*.spec.tsx`, and `*.stories.tsx`.

For example, `user-card/index.ts` must explicitly contain:

```ts
export { UserCard } from './user-card';
```
