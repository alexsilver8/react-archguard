import type { SourceFile } from 'ts-morph';

export interface ArchitectureViolation {
    readonly filePath: string;
    readonly line: number;
    readonly message: string;
    readonly suggestion: string;
}

export interface CheckOptions {
    readonly projectRoot: string;
    readonly componentRoots: readonly string[];
}

export interface ComponentCheckContext {
    readonly sourceFile: SourceFile;
    readonly relativeFilePath: string;
    readonly indexFile: SourceFile | undefined;
}
