/**
 * Тесты локальных правил проекта.
 *
 * Запуск: `node --test tools/eslint-rules/`.
 * Каждый блок RuleTester проверяет обе стороны: что правило ловит нарушение
 * и что оно молчит на похожем, но законном коде. Опорные случаи взяты
 * из настоящих файлов репозитория.
 */
import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import templateParser from '@angular-eslint/template-parser';
import lh from './index.mjs';

// Каждый случай RuleTester становится отдельным тестом `node --test`:
// по имени видно, какое именно поведение сломалось.
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** Проверяющая обвязка для TypeScript и JavaScript. */
const tsTester = new RuleTester({
    languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
    },
});

/** Проверяющая обвязка для Angular-шаблонов. */
const templateTester = new RuleTester({
    languageOptions: {
        parser: templateParser,
    },
});

const HTML = { filename: 'x.component.html' };

tsTester.run('no-comment-restates-code', lh.rules['no-comment-restates-code'], {
    valid: [
        {
            // JSDoc описывает контракт публичного элемента, а не строку кода.
            code: `
                /**
                 * Ищем родительские rule-section и собираем их идентификаторы.
                 */
                const ruleSection = currentElement.closest('app-rule-section');
            `,
        },
        {
            // Опорный случай: комментарий объясняет формат данных, а не строку кода.
            code: `
                function pick(condition) {
                    // Кортежная форма S3: ["content-length-range", min, max].
                    if (Array.isArray(condition) && condition[0] === CONTENT_LENGTH_RANGE) {
                        return null;
                    }
                }
            `,
        },
        {
            // Опорный случай: комментарий объясняет причину, а не пересказывает код.
            code: `
                function hotkey(event) {
                    // event.code не зависит от раскладки: Ctrl+B работает и на русской.
                    const code = event.code;
                }
            `,
        },
        {
            code: `
                // eslint-disable-next-line no-console
                console.log(value);
            `,
        },
        {
            // Два общих слова ниже порога: пересказом это не считается.
            options: [{ minSharedWords: 3 }],
            code: `
                function build(playerNames) {
                    // Собираем playerIds из playerNames
                    const playerIds = collect(playerNames);
                }
            `,
        },
    ],
    invalid: [
        {
            // Опорный случай из src/app/features/rules/services/scroll.service.ts:190.
            code: `
                function expand(currentElement) {
                    // Ищем родительские rule-section
                    const ruleSection = currentElement.closest('app-rule-section');
                }
            `,
            errors: [{ messageId: 'restates', line: 3 }],
        },
        {
            code: `
                function recount(rawNames) {
                    // Пересчитываем userNames по rawNames
                    const userNames = normalizeNames(rawNames);
                }
            `,
            errors: [{ messageId: 'restates', line: 3 }],
        },
        {
            code: `
                function collectIds(ruleSection) {
                    // Собираем sectionIds из ruleSection
                    const sectionIds = collectIds(ruleSection);
                }
            `,
            errors: [{ messageId: 'restates', line: 3 }],
        },
    ],
});

tsTester.run('no-effect-signal-write', lh.rules['no-effect-signal-write'], {
    valid: [
        {
            code: `
                effect(() => {
                    this.render();
                });
            `,
        },
        {
            // Запись вне effect — обычное обновление источника.
            code: `
                this.expanded.set(true);
            `,
        },
        {
            // Подписка пишет в сигнал позже: цикла в теле эффекта нет.
            code: `
                effect(() => {
                    this.service.get$().subscribe((value) => this.names.set(value));
                });
            `,
        },
        {
            // HttpContext.set — заголовок запроса, а не сигнал.
            code: `
                effect(() => {
                    this.service.get(new HttpContext().set(SKIP_ALERT, true));
                });
            `,
        },
        {
            code: `
                effect(() => {
                    setTimeout(() => this.draft.set(text), 150);
                });
            `,
        },
    ],
    invalid: [
        {
            // Опорный случай из src/app/features/diplomacy/ui/diplomacy-card/diplomacy-card.component.ts:93.
            code: `
                effect(() => {
                    if (this.initiallyExpanded()) {
                        this.expanded.set(true);
                    }
                });
            `,
            errors: [{ messageId: 'signalWrite', line: 4 }],
        },
        {
            // untracked зовёт колбэк сразу, поэтому запись идёт в теле эффекта.
            code: `
                effect(() => {
                    untracked(() => this.everyone.set(null));
                });
            `,
            errors: [{ messageId: 'signalWrite', line: 3 }],
        },
        {
            code: `
                effect(() => {
                    this.names.update((names) => ({ ...names, fresh: true }));
                });
            `,
            errors: [{ messageId: 'signalWrite', line: 3 }],
        },
    ],
});

tsTester.run('no-spec-without-assert', lh.rules['no-spec-without-assert'], {
    valid: [
        {
            code: `
                it('складывает числа', () => {
                    expect(1 + 1).toBe(2);
                });
            `,
        },
        {
            code: `
                specify('сравнивает', () => {
                    assert.equal(result, 2);
                });
            `,
        },
        {
            // Хелпер с именем на expect — тоже проверка.
            code: `
                it('бросает исключение', () => {
                    expectThrows(() => run());
                });
            `,
        },
        {
            // describe не проверяет по устройству.
            code: `
                describe('группа', () => {
                    const value = 1;
                });
            `,
        },
        {
            code: `
                beforeEach(() => {
                    setup();
                });
            `,
        },
        {
            // Объявление без тела проверять нечего.
            code: `
                it.todo('сделать позже');
            `,
        },
    ],
    invalid: [
        {
            code: `
                it('складывает числа', () => {
                    const sum = 1 + 2;
                });
            `,
            errors: [{ messageId: 'noAssert', line: 2 }],
        },
        {
            code: `
                test.each([1, 2])('обрабатывает %s', (value) => {
                    prepare(value);
                });
            `,
            errors: [{ messageId: 'noAssert', line: 2 }],
        },
        {
            // Имени строкой нет — сообщаем о самом вызове.
            code: `
                it(testName, () => {
                    prepare();
                });
            `,
            errors: [{ messageId: 'noAssert', line: 2 }],
        },
    ],
});

templateTester.run('no-method-call-with-args', lh.rules['no-method-call-with-args'], {
    valid: [
        {
            ...HTML,
            // Чтение сигнала и геттера: вызова с аргументами нет.
            code: '<p>{{ user().name }}</p>',
        },
        {
            ...HTML,
            code: '<button type="button" (click)="close()">x</button>',
        },
        {
            ...HTML,
            // Обработчик события срабатывает один раз, а не на каждом цикле.
            code: '<button type="button" (click)="save(item)">x</button>',
        },
        {
            ...HTML,
            // @let считает значение один раз на рендер блока.
            code: '@let name = format(user());<p>{{ name }}</p>',
        },
        {
            ...HTML,
            options: [{ allowList: ['translate'] }],
            code: '<p>{{ translate(label) }}</p>',
        },
    ],
    invalid: [
        {
            // Вложенные вызовы: оба идут на каждом цикле обнаружения изменений.
            ...HTML,
            code: '<p>{{ statusText(displayStatus(purchase)) }}</p>',
            errors: [
                { messageId: 'methodCall', line: 1 },
                { messageId: 'methodCall', line: 1 },
            ],
        },
        {
            // Опорный случай из src/app/features/admin/ui/settlement-admin-panel/settlement-admin-panel.component.html.
            ...HTML,
            code: '<span>{{ displayName(settlement) }}</span>',
            errors: [{ messageId: 'methodCall', line: 1 }],
        },
        {
            ...HTML,
            code: '<div [attr.title]="titleOf(item)"></div>',
            errors: [{ messageId: 'methodCall', line: 1 }],
        },
    ],
});
