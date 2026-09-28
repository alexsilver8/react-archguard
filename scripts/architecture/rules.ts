import {
    ClassDeclaration,
    EnumDeclaration,
    FunctionDeclaration,
    InterfaceDeclaration,
    Node,
    SourceFile,
    SyntaxKind,
    TypeAliasDeclaration,
    VariableStatement,
} from 'ts-morph';

import { COMPONENT_FILE_RULES } from './conventions.js';
import { createViolation } from './utils.js';
import type { ArchitectureViolation, ComponentCheckContext } from './types.js';

export function checkComponentFile(context: ComponentCheckContext): ArchitectureViolation[] {
    const { sourceFile, relativeFilePath } = context;
    const violations: ArchitectureViolation[] = [];
    const baseName: string = getBaseName(sourceFile);
    const expectedComponentName: string = toPascalCase(baseName);
    const componentFunctions: FunctionDeclaration[] = sourceFile.getFunctions();
    const exportedComponents: FunctionDeclaration[] = componentFunctions.filter(
        (declaration: FunctionDeclaration): boolean => isNamedExport(declaration),
    );

    checkFileName(baseName, relativeFilePath, sourceFile, violations);
    checkDeclarations(sourceFile, relativeFilePath, violations);
    checkIndexExport(
        baseName,
        expectedComponentName,
        relativeFilePath,
        context.indexFile,
        violations,
    );
    checkComponentFunction(
        sourceFile,
        relativeFilePath,
        expectedComponentName,
        componentFunctions,
        exportedComponents,
        violations,
    );

    return violations;
}

function checkIndexExport(
    baseName: string,
    expectedComponentName: string,
    relativeFilePath: string,
    indexFile: SourceFile | undefined,
    violations: ArchitectureViolation[],
): void {
    if (indexFile === undefined) {
        violations.push(createViolation(
            relativeFilePath,
            1,
            'Every component folder must contain an index.ts file.',
            `Create index.ts with: export { ${expectedComponentName} } from './${baseName}';`,
        ));
        return;
    }

    const hasExpectedExport: boolean = indexFile.getExportDeclarations().some(
        (declaration): boolean => declaration.getModuleSpecifierValue() === `./${baseName}`
            && declaration.getNamedExports().some(
                (namedExport): boolean => namedExport.getName() === expectedComponentName,
            ),
    );

    if (!hasExpectedExport) {
        violations.push(createViolation(
            relativeFilePath,
            1,
            `index.ts must re-export ${expectedComponentName} from './${baseName}'.`,
            `Add: export { ${expectedComponentName} } from './${baseName}';`,
        ));
    }
}

function checkFileName(
    baseName: string,
    relativeFilePath: string,
    sourceFile: SourceFile,
    violations: ArchitectureViolation[],
): void {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(baseName)) {
        violations.push(createViolation(
            relativeFilePath,
            1,
            `Component filenames must use kebab-case; found "${baseName}.tsx".`,
            'Rename the file to kebab-case.',
        ));
    }

    const folderName: string = sourceFile.getDirectoryPath().split('/').pop() ?? '';
    if (folderName !== baseName) {
        violations.push(createViolation(
            relativeFilePath,
            1,
            `Component folder must match the file name; expected "${baseName}/".`,
            `Move this file into a "${baseName}" folder.`,
        ));
    }
}

function checkDeclarations(
    sourceFile: SourceFile,
    relativeFilePath: string,
    violations: ArchitectureViolation[],
): void {
    for (const statement of sourceFile.getStatements()) {
        if (Node.isImportDeclaration(statement)) {
            continue;
        }

        if (Node.isFunctionDeclaration(statement)) {
            if (!isNamedExport(statement)) {
                violations.push(createViolation(
                    relativeFilePath,
                    statement.getStartLineNumber(),
                    'Additional top-level functions are not allowed in component files.',
                    `Move ${statement.getName() ?? 'this helper'} to ${COMPONENT_FILE_RULES.utilsFile(getBaseName(sourceFile))}.`,
                ));
            }
            continue;
        }

        if (Node.isInterfaceDeclaration(statement)) {
            addTypeViolation(statement, relativeFilePath, sourceFile, violations, 'interface');
            continue;
        }

        if (Node.isTypeAliasDeclaration(statement)) {
            addTypeViolation(statement, relativeFilePath, sourceFile, violations, 'type alias');
            continue;
        }

        if (Node.isEnumDeclaration(statement)) {
            violations.push(createViolation(
                relativeFilePath,
                statement.getStartLineNumber(),
                'Enums are not allowed in component files.',
                `Move ${statement.getName()} to ${getBaseName(sourceFile)}.constants.ts.`,
            ));
            continue;
        }

        if (Node.isVariableStatement(statement)) {
            violations.push(createViolation(
                relativeFilePath,
                statement.getStartLineNumber(),
                'Top-level variables and constants are not allowed in component files.',
                `Move these declarations to ${getBaseName(sourceFile)}.constants.ts or ${getBaseName(sourceFile)}.utils.ts.`,
            ));
            continue;
        }

        if (Node.isClassDeclaration(statement)) {
            addNamedDeclarationViolation(statement, relativeFilePath, violations, 'Classes');
            continue;
        }

        if (Node.isExportDeclaration(statement) || Node.isExportAssignment(statement)) {
            violations.push(createViolation(
                relativeFilePath,
                statement.getStartLineNumber(),
                'Re-exports and default exports are not allowed in component files.',
                'Export only the component function with a named export.',
            ));
            continue;
        }

        if (statement.getKind() !== SyntaxKind.JSDoc) {
            addNamedDeclarationViolation(statement, relativeFilePath, violations, 'Unrelated top-level declarations');
        }
    }
}

function checkComponentFunction(
    sourceFile: SourceFile,
    relativeFilePath: string,
    expectedComponentName: string,
    componentFunctions: readonly FunctionDeclaration[],
    exportedComponents: readonly FunctionDeclaration[],
    violations: ArchitectureViolation[],
): void {
    if (exportedComponents.length !== 1) {
        violations.push(createViolation(
            relativeFilePath,
            1,
            'Component files must contain exactly one named exported component function.',
            `Export only ${expectedComponentName} from this file.`,
        ));
    }

    const component: FunctionDeclaration | undefined = exportedComponents[0];
    if (component === undefined) {
        return;
    }

    const componentName: string | undefined = component.getName();
    if (componentName !== expectedComponentName) {
        violations.push(createViolation(
            relativeFilePath,
            component.getStartLineNumber(),
            `Expected component "${expectedComponentName}" but found "${componentName ?? 'unnamed'}".`,
            `Rename the component to ${expectedComponentName}.`,
        ));
    }

    if (component.getReturnTypeNode() === undefined) {
        violations.push(createViolation(
            relativeFilePath,
            component.getStartLineNumber(),
            'The component function must have an explicit return type.',
            'Add an explicit JSX.Element return type.',
        ));
    }

    if (componentFunctions.length > 1) {
        const additionalFunctions: FunctionDeclaration[] = componentFunctions.filter(
            (candidate: FunctionDeclaration): boolean => candidate !== component,
        );

        for (const additionalFunction of additionalFunctions) {
            if (isNamedExport(additionalFunction)) {
                violations.push(createViolation(
                    relativeFilePath,
                    additionalFunction.getStartLineNumber(),
                    'Component files cannot export unrelated functions.',
                    `Move ${additionalFunction.getName() ?? 'this function'} to ${getBaseName(sourceFile)}.utils.ts.`,
                ));
            }
        }
    }
}

function addTypeViolation(
    declaration: InterfaceDeclaration | TypeAliasDeclaration,
    relativeFilePath: string,
    sourceFile: SourceFile,
    violations: ArchitectureViolation[],
    declarationKind: string,
): void {
    const name: string = declaration.getName();
    violations.push(createViolation(
        relativeFilePath,
        declaration.getStartLineNumber(),
        `${capitalize(declarationKind)}s are not allowed in component files.`,
        `Move ${name} to ${COMPONENT_FILE_RULES.typesFile(getBaseName(sourceFile))}.`,
    ));
}

function addNamedDeclarationViolation(
    declaration: Node,
    relativeFilePath: string,
    violations: ArchitectureViolation[],
    kind: string,
): void {
    violations.push(createViolation(
        relativeFilePath,
        declaration.getStartLineNumber(),
        `${kind} are not allowed in component files.`,
        'Keep only imports and the single named exported component function here.',
    ));
}

function getBaseName(sourceFile: SourceFile): string {
    return sourceFile.getBaseNameWithoutExtension();
}

function isNamedExport(declaration: FunctionDeclaration): boolean {
    return declaration.isExported() && !declaration.isDefaultExport();
}

function toPascalCase(value: string): string {
    return value
        .split('-')
        .map((part: string): string => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
        .join('');
}

function capitalize(value: string): string {
    return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}
