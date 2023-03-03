module.exports = {
    root: true,
    env: {
        commonjs: true,
        node: true,
    },
    extends: [
        '@hydrooj/eslint-config',
    ],
    rules: {
    },
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts'],
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
            },
        },
    },
};
