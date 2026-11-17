// @ts-check
/**
 * Проверка кода ESLint: TypeScript и Angular-шаблоны.
 *
 * Запуск: `npm run lint` или `npx eslint .`.
 * Правила из AGENTS.md («Жёсткие правила», п. 11) держатся здесь:
 * `any` и `console.log` не проходят проверку.
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import templateParser from '@angular-eslint/template-parser';

export default tseslint.config(
    {
        // `.dsh/wiki-stage` — рабочая копия исходников вики для проверки рендера,
        // а не второй набор кода: правила к ней не применяем.
        ignores: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**', '*.d.ts', '.dsh/**'],
    },
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
        plugins: {
            // Наборы правил плагина описаны в формате eslintrc, поэтому плагин
            // и его правила подключаем руками.
            '@angular-eslint': angular,
        },
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        rules: {
            ...angular.configs.recommended.rules,
            // AGENTS.md, п. 11: `any` и `console.log` не используем.
            '@typescript-eslint/no-explicit-any': 'error',
            'no-console': ['error', { allow: ['warn', 'error'] }],
            // Правила Angular-кода проекта.
            '@angular-eslint/prefer-on-push-component-change-detection': 'error',
            '@angular-eslint/use-lifecycle-interface': 'error',
            '@angular-eslint/component-selector': [
                'error',
                // `app-` — общее правило проекта; `lh-` — префикс библиотеки
                // собственных контролов (lh-input, lh-hint).
                { type: 'element', prefix: ['app', 'lh'], style: 'kebab-case' },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                { type: 'attribute', prefix: 'app', style: 'camelCase' },
            ],
            // Пустой catch теряет сигнал об ошибке (AGENTS.md, «Error handling»).
            'no-empty': ['error', { allowEmptyCatch: false }],
            // Подчёркивание — знак намеренно неиспользуемого имени.
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
            ],
        },
    },
    {
        files: ['**/*.html'],
        languageOptions: {
            parser: templateParser,
        },
        plugins: {
            '@angular-eslint/template': angularTemplate,
        },
        rules: {
            ...angularTemplate.configs.recommended.rules,
            // Доступность: у картинки есть alt.
            '@angular-eslint/template/alt-text': 'error',
            // `*ngIf`/`*ngFor` заменяем встроенным управляющим синтаксисом.
            '@angular-eslint/template/prefer-control-flow': 'error',
        },
    },
    {
        // Компонент намеренно расширяет нативный <time> атрибутным селектором:
        // семантика элемента сохраняется, лишний тег в разметку не добавляется.
        files: ['src/app/shared/ui/relative-time/relative-time.component.ts'],
        rules: {
            '@angular-eslint/component-selector': 'off',
        },
    },
    {
        // Серверный вход и скрипты пишут в stdout намеренно: это их вывод.
        files: ['src/server.ts', 'scripts/**/*.mjs'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['**/*.spec.ts'],
        rules: {
            // Спецификациям нужны широкие типы фикстур и тестовые компоненты.
            '@typescript-eslint/no-explicit-any': 'off',
            '@angular-eslint/prefer-on-push-component-change-detection': 'off',
            '@angular-eslint/component-selector': 'off',
        },
    },
);