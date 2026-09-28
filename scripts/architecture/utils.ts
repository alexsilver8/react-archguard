import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import chalk from 'chalk';

import {
    COMPONENT_FILE_SUFFIXES,
    COMPONENT_ROOT_MARKERS,
    IGNORED_COMPONENT_FILE_SUFFIXES,
} from './conventions.js';
import type { ArchitectureViolation, CheckOptions } from './types.js';

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

export function formatViolations(violations: readonly ArchitectureViolation[]): string {
    if (violations.length === 0) {
        return '';
    }

    const lines: string[] = [
        '',
        chalk.red.bold('Architecture violations'),
        chalk.gray('─'.repeat(64)),
    ];

    violations.forEach((violation: ArchitectureViolation, index: number): void => {
        lines.push('');
        lines.push(`${chalk.yellow(violation.filePath)}${chalk.gray(`:${violation.line}`)}`);
        lines.push(`  ${chalk.red.bold('✖')} ${chalk.red(violation.message)}`);
        lines.push(`    ${chalk.cyan('↳')} ${chalk.gray(violation.suggestion)}`);

        if (index < violations.length - 1) {
            lines.push(chalk.gray('·'.repeat(64)));
        }
    });

    lines.push('');
    lines.push(chalk.gray('─'.repeat(64)));
    lines.push(chalk.red.bold(`✖ Found ${violations.length} architecture violation${violations.length === 1 ? '' : 's'}.`));
    return lines.join('\n');
}

export function parseCheckOptions(args: readonly string[], cwd: string): CheckOptions {
    const rootIndex: number = args.indexOf('--root');
    const requestedRoot: string | undefined = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
    const projectRoot: string = resolve(cwd);

    return {
        projectRoot,
        componentRoots: requestedRoot === undefined
            ? ['src/components', 'src/features']
            : [requestedRoot],
    };
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
