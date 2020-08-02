module.exports = {
    root: true,
    env: {
        commonjs: true,
        node: true,
    },
    extends: [
        'airbnb-base',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    rules: {
        indent: ['warn', 4],
        'no-plusplus': 'off',
        'no-console': 'off',
        'no-extend-native': 'off',
        'no-underscore-dangle': 'off',
        'no-restricted-syntax': 'off',
        'max-classes-per-file': 'off',
        'guard-for-in': 'off',
        'no-param-reassign': 'off',
        'global-require': 'off',
        'no-nested-ternary': 'off',
        'no-multi-assign': 'off',
        'no-return-await': 'off',
        'no-bitwise': 'off',
        'no-continue': 'off',
        'no-unused-vars': 'off',
        'import/extensions': 'off',
        'no-return-assign': 'off',
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
