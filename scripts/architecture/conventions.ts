export const COMPONENT_FILE_SUFFIXES: readonly string[] = [
    '.tsx',
];

export const IGNORED_COMPONENT_FILE_SUFFIXES: readonly string[] = [
    '.test.tsx',
    '.spec.tsx',
    '.stories.tsx',
];

export const COMPONENT_ROOT_MARKERS: readonly string[] = [
    'components',
];

export const COMPONENT_FILE_RULES = {
    typesFile: (baseName: string): string => `${baseName}.types.ts`,
    utilsFile: (baseName: string): string => `${baseName}.utils.ts`,
};
