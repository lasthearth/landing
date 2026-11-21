// @ts-check
/**
 * Проверка кода ESLint: TypeScript и Angular-шаблоны.
 *
 * Запуск: `npm run lint` (через `scripts/lint.mjs`: бейзлайн легаси-нарушений —
 * `scripts/lint-baseline.json`). Голый `npx eslint src` покажет сотни старых
 * нарушений и ничего не скажет о новых.
 *
 * Зачем столько правил: агент пишет «слоп» — код, который выглядит рабочим,
 * но держится на догадке: непроверенный каст, `!` вместо проверки, потерянный
 * `catch`, вызов метода в шаблоне, цвет мимо токена. Ревью такое пропускает,
 * линтер — нет. Каждое правило ниже измерено на этом репозитории, счётчик
 * легаси-нарушений лежит в `docs/SLOP.md`.
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import templateParser from '@angular-eslint/template-parser';
import lh from './tools/eslint-rules/index.mjs';

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
            // Локальные правила проекта: то, для чего нет готового правила.
            lh,
        },
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                // Правила с типами (`no-unnecessary-condition`, `no-unsafe-type-assertion`)
                // без проекта TypeScript не работают, а именно они ловят догадки.
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
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

            // Догадки вместо типов. `!` — обещание, что значения нет; каст
            // в чужой тип — обещание, что форма совпадает. Оба обещания
            // проверяются только в рантайме, то есть не проверяются.
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-unsafe-type-assertion': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            // Проверка, которая по типу всегда истинна или всегда ложна:
            // мёртвая ветка либо пропущенный `null` в типе.
            '@typescript-eslint/no-unnecessary-condition': 'error',
            '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
            // Promise без обработки ошибки: исключение уйдёт в никуда.
            '@typescript-eslint/no-floating-promises': 'error',
            // async-функция в месте, где ждут void (подписка, колбэк).
            '@typescript-eslint/no-misused-promises': 'error',
            // `||` на значении, где `0` и `''` законны, — тихая подмена значения.
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            // `a && a.b && a.b.c` — то же, что `a?.b?.c`, но длиннее и с дырой на `0`.
            '@typescript-eslint/prefer-optional-chain': 'error',
            // Мёртвый код: приватный член, который никто не читает; выражение без эффекта.
            '@typescript-eslint/no-unused-private-class-members': 'error',
            '@typescript-eslint/no-unused-expressions': 'error',
            // switch по union без обработки всех веток: добавленное значение
            // молча проваливается в default.
            '@typescript-eslint/switch-exhaustiveness-check': 'error',

            // Глобалы браузера ломают SSR: сборка рисует страницы на сервере,
            // где `document` нет. Берём `inject(DOCUMENT)`/`inject(WINDOW)`.
            'no-restricted-globals': [
                'error',
                { name: 'document', message: 'inject(DOCUMENT) из @angular/common.' },
                { name: 'window', message: 'inject(WINDOW) из @ng-web-apis/common.' },
            ],

            // Формы, которые регулярно пишет агент, а готового правила нет.
            'no-restricted-syntax': [
                'error',
                {
                    // Второй subscribe внутри первого: внешняя подписка течёт,
                    // отписка не доходит до вложенной.
                    selector: 'CallExpression[callee.property.name="subscribe"] CallExpression[callee.property.name="subscribe"]',
                    message: 'Вложенный subscribe: switchMap/mergeMap и одна отписка.',
                },
                {
                    // catch, который возвращает значение и ничего не сообщает:
                    // ошибка исчезает бесследно.
                    selector: 'CatchClause:has(> BlockStatement > ReturnStatement):not(:has(CallExpression))',
                    message: 'catch теряет сигнал: сообщите об ошибке или пробросьте её.',
                },
                {
                    // Локаль, зашитая строкой: маппинг живёт в одном месте.
                    selector: 'Literal[value=/^(ru-RU|en-GB|en-US)$/]',
                    message: 'Локаль берите из I18nService, а не литералом.',
                },
            ],

            // Комментарий, который пересказывает соседнюю строку кода.
            'lh/no-comment-restates-code': 'error',
            // `effect`, который пишет в сигнал: два источника истины и лишний цикл.
            'lh/no-effect-signal-write': 'error',
        },
    },
    {
        files: ['**/*.html'],
        languageOptions: {
            parser: templateParser,
        },
        plugins: {
            '@angular-eslint/template': angularTemplate,
            lh,
        },
        rules: {
            ...angularTemplate.configs.recommended.rules,
            // Доступность: у картинки есть alt.
            '@angular-eslint/template/alt-text': 'error',
            // `*ngIf`/`*ngFor` заменяем встроенным управляющим синтаксисом.
            '@angular-eslint/template/prefer-control-flow': 'error',

            // Клик по диву: мышью работает, клавиатурой и скринридером — нет.
            '@angular-eslint/template/click-events-have-key-events': 'error',
            '@angular-eslint/template/mouse-events-have-key-events': 'error',
            '@angular-eslint/template/interactive-supports-focus': 'error',
            '@angular-eslint/template/no-positive-tabindex': 'error',
            '@angular-eslint/template/label-has-associated-control': 'error',
            '@angular-eslint/template/role-has-required-aria': 'error',
            '@angular-eslint/template/valid-aria': 'error',
            '@angular-eslint/template/button-has-type': 'error',
            '@angular-eslint/template/no-distracting-elements': 'error',
            '@angular-eslint/template/table-scope': 'error',
            // `$any()` в шаблоне — тот же `any`, только незаметнее.
            '@angular-eslint/template/no-any': 'error',

            // Разметка не несёт решений, которые должны жить в классе.
            '@angular-eslint/template/no-inline-styles': 'error',
            '@angular-eslint/template/no-empty-control-flow': 'error',
            '@angular-eslint/template/use-track-by-function': 'error',
            '@angular-eslint/template/no-nested-tags': 'error',
            '@angular-eslint/template/prefer-at-else': 'error',
            '@angular-eslint/template/prefer-self-closing-tags': 'error',
            '@angular-eslint/template/prefer-static-string-properties': 'error',
            '@angular-eslint/template/no-interpolation-in-attributes': 'error',

            // Метод с аргументами в шаблоне: вызов на каждом цикле change detection.
            'lh/no-method-call-with-args': 'error',
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
            // В спеке допустимы `!` на результатах querySelector: тест падает
            // на следующей строке, если элемента нет.
            '@typescript-eslint/no-non-null-assertion': 'off',
            // Тест проверяет код, а не типы: лишняя проверка на null в тесте
            // читается как намерение.
            '@typescript-eslint/no-unnecessary-condition': 'off',
            // Мок-функции не обязаны возвращать Promise.
            '@typescript-eslint/no-misused-promises': 'off',
            // Тест без проверки ничего не доказывает (AGENTS.md, «Proof»).
            'lh/no-spec-without-assert': 'error',
        },
    },
);