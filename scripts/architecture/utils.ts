import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import chalk, { type ChalkInstance } from 'chalk';

import {
    COMPONENT_FILE_SUFFIXES,
    COMPONENT_ROOT_MARKERS,
    IGNORED_COMPONENT_FILE_SUFFIXES,
} from './conventions.js';
import type { ArchitectureViolation } from './types.js';

export function isIgnoredComponentFile(filePath: string): boolean {
    return IGNORED_COMPONENT_FILE_SUFFIXES.some((suffix: string): boolean => filePath.endsWith(suffix));
}

export function isComponentFile(filePath: string): boolean {
    return COMPONENT_FILE_SUFFIXES.some((suffix: string): boolean => filePath.endsWith(suffix))
        && !isIgnoredComponentFile(filePath);
}

export function findComponentFiles(projectRoot: string, componentRoots: readonly string[]): string[] {
    const files: string[] = [];

    for (const componentRoot of componentRoots) {
        const absoluteRoot: string = resolve(projectRoot, componentRoot);

        if (!existsSync(absoluteRoot)) {
            continue;
        }

        collectFiles(absoluteRoot, files);
    }

    return files
        .filter((filePath: string): boolean => isComponentFile(filePath) && isInsideComponentDirectory(filePath))
        .sort();
}

export function toRelativePath(projectRoot: string, filePath: string): string {
    return relative(projectRoot, filePath).split('\\').join('/');
}

export function createViolation(
    filePath: string,
    line: number,
    message: string,
    suggestion: string,
): ArchitectureViolation {
    return {
        filePath,
        line,
        message,
        suggestion,
    };
}

export function formatViolations(
    violations: readonly ArchitectureViolation[],
    color: ChalkInstance = chalk,
): string {
    if (violations.length === 0) {
        return '';
    }

    const lines: string[] = [
        '',
        color.red.bold('Architecture violations'),
        color.gray('─'.repeat(64)),
    ];

    violations.forEach((violation: ArchitectureViolation, index: number): void => {
        lines.push('');
        lines.push(`${color.yellow(violation.filePath)}${color.gray(`:${violation.line}`)}`);
        lines.push(`  ${color.red.bold('✖')} ${color.red(violation.message)}`);
        lines.push(`    ${color.cyan('↳')} ${color.gray(violation.suggestion)}`);

        if (index < violations.length - 1) {
            lines.push(color.gray('·'.repeat(64)));
        }
    });

    lines.push('');
    lines.push(color.gray('─'.repeat(64)));
    lines.push(color.red.bold(`✖ Found ${violations.length} architecture violation${violations.length === 1 ? '' : 's'}.`));
    return lines.join('\n');
}

function isInsideComponentDirectory(filePath: string): boolean {
    const pathSegments: string[] = filePath.split(/[\\/]/u);
    return COMPONENT_ROOT_MARKERS.some((marker: string): boolean => pathSegments.includes(marker));
}

function collectFiles(directory: string, files: string[]): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const entryPath: string = join(directory, entry.name);

        if (entry.isDirectory()) {
            collectFiles(entryPath, files);
        } else {
            files.push(entryPath);
        }
    }
}
