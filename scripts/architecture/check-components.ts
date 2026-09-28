#!/usr/bin/env node

import { Project, SourceFile } from 'ts-morph';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { checkComponentFile } from './rules.js';
import {
    findComponentFiles,
    formatViolations,
    parseCheckOptions,
    toRelativePath,
} from './utils.js';
import type { ArchitectureViolation, CheckOptions } from './types.js';

export function runCheck(options: CheckOptions): ArchitectureViolation[] {
    const project: Project = new Project({
        skipAddingFilesFromTsConfig: true,
    });
    const componentFiles: string[] = findComponentFiles(options.projectRoot, options.componentRoots);
    const violations: ArchitectureViolation[] = [];

    for (const filePath of componentFiles) {
        const sourceFile: SourceFile = project.addSourceFileAtPath(filePath);
        const indexFilePath: string = join(dirname(filePath), 'index.ts');
        const indexFile: SourceFile | undefined = existsSync(indexFilePath)
            ? project.addSourceFileAtPath(indexFilePath)
            : undefined;
        violations.push(...checkComponentFile({
            indexFile,
            sourceFile,
            relativeFilePath: toRelativePath(options.projectRoot, filePath),
        }));
    }

    return violations;
}

function main(): void {
    const options: CheckOptions = parseCheckOptions(process.argv.slice(2), process.cwd());
    const componentFiles: string[] = findComponentFiles(options.projectRoot, options.componentRoots);
    const violations: ArchitectureViolation[] = runCheck(options);

    if (violations.length > 0) {
        console.error(formatViolations(violations));
        process.exitCode = 1;
        return;
    }

    console.log(`✓ ${componentFiles.length} component file${componentFiles.length === 1 ? '' : 's'} passed architecture checks.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
