import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const boundaries = [
	{ sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
	{ sourceTag: 'scope:web', onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'] },
	{ sourceTag: 'scope:server', onlyDependOnLibsWithTags: ['scope:server', 'scope:shared'] },
	{ sourceTag: 'type:feature', onlyDependOnLibsWithTags: ['type:data-access', 'type:ui', 'type:util'] },
	{ sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:ui', 'type:util'] },
	{ sourceTag: 'type:data-access', onlyDependOnLibsWithTags: ['type:data-access', 'type:util'] },
	{ sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:util'] },
];

/** Code quality limits: keep functions small, flat and readable. */
const qualityRules = {
	complexity: ['error', 8],
	'max-depth': ['error', 3],
	'max-params': ['error', 4],
	'max-nested-callbacks': ['error', 3],
	'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
	'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
	'max-statements': ['error', 15],
	'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
	'no-else-return': 'error',
	'no-nested-ternary': 'error',
	'no-param-reassign': 'error',
	'no-implicit-coercion': 'error',
	'object-shorthand': 'error',
	'prefer-template': 'error',
	'arrow-body-style': ['error', 'as-needed'],
	curly: ['error', 'all'],
	eqeqeq: ['error', 'always'],
	'@typescript-eslint/consistent-type-imports': 'error',
	'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
	'@typescript-eslint/array-type': ['error', { default: 'array' }],
	'@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
};

export default [
	...nx.configs['flat/base'],
	...nx.configs['flat/typescript'],
	...nx.configs['flat/javascript'],
	...tseslint.configs.strict,
	...tseslint.configs.stylistic,
	{ ignores: ['**/dist', '**/out-tsc', '**/.angular', '**/.nx'] },
	{
		files: ['**/*.ts'],
		rules: {
			...qualityRules,
			'@nx/enforce-module-boundaries': [
				'error',
				{
					enforceBuildableLibDependency: true,
					allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
					depConstraints: boundaries,
				},
			],
		},
	},
	{
		files: ['**/*.spec.ts', '**/*.test.ts'],
		rules: { 'max-lines-per-function': 'off', 'max-nested-callbacks': 'off', 'max-statements': 'off' },
	},
	prettier,
];
