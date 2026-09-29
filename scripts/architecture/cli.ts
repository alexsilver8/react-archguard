#!/usr/bin/env node

import boxen from 'boxen';
import chalk, { Chalk, type ChalkInstance } from 'chalk';
import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runCheck } from './check-components.js';
import { findComponentFiles, formatViolations } from './utils.js';
import type { ArchitectureViolation, CheckOptions } from './types.js';

const CLI_NAME: string = 'react-archguard';
const DEFAULT_COMPONENT_ROOTS: readonly string[] = ['src/components', 'src/features'];

interface CliOptions {
    readonly root?: string;
    readonly json?: boolean;
    readonly color: boolean;
    readonly quiet?: boolean;
}

interface CheckReport {
    readonly ok: boolean;
    readonly projectRoot: string;
    readonly componentRoots: readonly string[];
    readonly filesScanned: number;
    readonly violations: readonly ArchitectureViolation[];
}

export function createProgram(): Command {
    const program: Command = new Command();

    program
        .name(CLI_NAME)
        .description('Enforce strict architecture conventions for React component files.')
        .version(readPackageVersion(), '-v, --version')
        .option('-r, --root <path>', 'component tree to scan')
        .option('--json', 'print a machine-readable report')
        .option('--no-color', 'disable styled terminal output')
        .option('-q, --quiet', 'only print output when violations are found')
        .showHelpAfterError()
        .action((): void => {
            const exitCode: number = runCli(program.opts<CliOptions>());
            process.exitCode = exitCode;
        });

    return program;
}

export function runCli(options: CliOptions, cwd: string = process.cwd()): number {
    const projectRoot: string = resolve(cwd);
    const componentRoots: readonly string[] = options.root === undefined
        ? DEFAULT_COMPONENT_ROOTS
        : [options.root];
    const checkOptions: CheckOptions = { projectRoot, componentRoots };
    const componentFiles: string[] = findComponentFiles(projectRoot, componentRoots);
    const violations: ArchitectureViolation[] = runCheck(checkOptions);
    const report: CheckReport = {
        ok: violations.length === 0,
        projectRoot,
        componentRoots,
        filesScanned: componentFiles.length,
        violations,
    };

    if (options.json === true) {
        console.log(JSON.stringify(report, null, 4));
    } else if (violations.length > 0) {
        const color: ChalkInstance = createColor(options.color);
        console.error(renderHeader(color));
        console.error(formatViolations(violations, color));
        console.error(renderFailureSummary(report, color));
    } else if (options.quiet !== true) {
        const color: ChalkInstance = createColor(options.color);
        console.log(renderHeader(color));
        console.log(renderSuccessSummary(report, color));
    }

    return report.ok ? 0 : 1;
}

function renderHeader(color: ChalkInstance): string {
    return boxen(
        `${color.hex('#8BE9FD').bold(CLI_NAME)} ${color.gray('· React architecture checks')}`,
        {
            borderStyle: 'round',
            margin: { bottom: 1, top: 1 },
            padding: { left: 1, right: 1 },
            ...(color.level > 0 ? { borderColor: 'cyan' } : {}),
        },
    );
}

function renderSuccessSummary(report: CheckReport, color: ChalkInstance): string {
    const fileLabel: string = report.filesScanned === 1 ? 'component file' : 'component files';
    const rootLabel: string = report.componentRoots.join(', ');

    return boxen(
        [
            `${color.green('✓')} ${color.bold('Architecture looks good')}`,
            '',
            color.gray(`Scanned ${report.filesScanned} ${fileLabel}`),
            color.gray(`Roots: ${rootLabel}`),
        ].join('\n'),
        {
            borderStyle: 'round',
            padding: 1,
            ...(color.level > 0 ? { borderColor: 'green' } : {}),
        },
    );
}

function renderFailureSummary(report: CheckReport, color: ChalkInstance): string {
    const violationLabel: string = report.violations.length === 1 ? 'violation' : 'violations';

    return boxen(
        [
            `${color.red('✖')} ${color.bold(`${report.violations.length} ${violationLabel} found`)}`,
            '',
            color.gray(`Scanned ${report.filesScanned} component file${report.filesScanned === 1 ? '' : 's'}.`),
            color.gray('Fix the issues above and run react-archguard again.'),
        ].join('\n'),
        {
            borderStyle: 'round',
            padding: 1,
            ...(color.level > 0 ? { borderColor: 'red' } : {}),
        },
    );
}

function createColor(colorEnabled: boolean): ChalkInstance {
    return colorEnabled ? chalk : new Chalk({ level: 0 });
}

function readPackageVersion(): string {
    const packageJsonUrl: URL | undefined = [
        new URL('../../package.json', import.meta.url),
        new URL('../../../package.json', import.meta.url),
    ].find((candidate: URL): boolean => existsSync(candidate));

    if (packageJsonUrl === undefined) {
        return '0.0.0';
    }

    const packageJson: { version?: unknown } = JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as {
        version?: unknown;
    };

    return typeof packageJson.version === 'string' ? packageJson.version : '0.0.0';
}

createProgram().parse();
