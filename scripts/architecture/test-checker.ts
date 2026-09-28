import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runCheck } from './check-components.js';
import type { CheckOptions } from './types.js';

const testRoot: string = mkdtempSync(join(tmpdir(), 'component-architecture-checker-'));
const validFile: string = join(testRoot, 'src/components/user-card/user-card.tsx');
const validIndexFile: string = join(testRoot, 'src/components/user-card/index.ts');
const invalidFile: string = join(testRoot, 'src/components/profile-card/profile-card.tsx');
const invalidIndexFile: string = join(testRoot, 'src/components/profile-card/index.ts');

mkdirForFile(validFile);
mkdirForFile(validIndexFile);
mkdirForFile(invalidFile);
mkdirForFile(invalidIndexFile);
writeFileSync(validFile, `import type { IUserCardProps } from './user-card.types';\n\nexport function UserCard({ name }: IUserCardProps): JSX.Element {\n    return <div>{name}</div>;\n}\n`);
writeFileSync(validIndexFile, `export { UserCard } from './user-card';\n`);
writeFileSync(invalidFile, `interface IProfileCardProps {\n    name: string;\n}\n\nfunction formatName(name: string): string {\n    return name.trim();\n}\n\nexport function Profile({ name }: IProfileCardProps): JSX.Element {\n    return <div>{formatName(name)}</div>;\n}\n`);
writeFileSync(invalidIndexFile, `export { ProfileCard } from './profile-card';\n`);

const options: CheckOptions = {
    projectRoot: testRoot,
    componentRoots: ['src/components'],
};
const violations = runCheck(options);

assert.equal(violations.length, 3);
assert.equal(violations[0]?.message, 'Interfaces are not allowed in component files.');
assert.equal(violations[1]?.message, 'Additional top-level functions are not allowed in component files.');
assert.equal(violations[2]?.message, 'Expected component "ProfileCard" but found "Profile".');
console.log('✓ Checker test passed.');

function mkdirForFile(filePath: string): void {
    const directory: string = filePath.slice(0, filePath.lastIndexOf('/'));
    mkdirSync(directory, { recursive: true });
}
