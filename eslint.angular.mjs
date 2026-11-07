import nx from '@nx/eslint-plugin';
import angular from 'angular-eslint';
import baseConfig from './eslint.config.mjs';

/** Shared ESLint config for every Angular project (apps/web and libs/web/*). */
export default [
	...baseConfig,
	...nx.configs['flat/angular'],
	...nx.configs['flat/angular-template'],
	{
		files: ['**/*.ts'],
		rules: {
			'@angular-eslint/directive-selector': [
				'error',
				{ type: 'attribute', prefix: 'bj', style: 'camelCase' },
			],
			'@angular-eslint/component-selector': [
				'error',
				{ type: 'element', prefix: ['bj', 'blackjack'], style: 'kebab-case' },
			],
			'@angular-eslint/prefer-signals': 'error',
			'@angular-eslint/use-lifecycle-interface': 'error',
			'@angular-eslint/no-output-on-prefix': 'error',
			'@angular-eslint/component-max-inline-declarations': ['error', { template: 0, styles: 0 }],
		},
	},
	{
		files: ['**/*.html'],
		rules: {
			'@angular-eslint/template/prefer-control-flow': 'error',
			'@angular-eslint/template/prefer-self-closing-tags': 'error',
			'@angular-eslint/template/no-negated-async': 'error',
			'@angular-eslint/template/eqeqeq': 'error',
			'@angular-eslint/template/button-has-type': 'error',
			'@angular-eslint/template/cyclomatic-complexity': ['error', { maxComplexity: 8 }],
		},
	},
	...angular.configs.templateAccessibility.map((config) => ({ ...config, files: ['**/*.html'] })),
];
