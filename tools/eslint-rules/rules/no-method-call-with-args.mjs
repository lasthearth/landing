/**
 * Правило `lh/no-method-call-with-args`.
 *
 * Angular вызывает выражение в шаблоне на каждом цикле обнаружения изменений.
 * `{{ statusText(displayStatus(purchase)) }}` в списке из ста строк — это двести
 * вызовов на каждый цикл. Результат надо считать в `computed` и читать как
 * сигнал: `{{ statusText() }}`.
 *
 * Что правило не трогает:
 * - вызов без аргументов, это чтение сигнала или геттера;
 * - вызов внутри `BoundEvent`: `(click)="save(item)"` срабатывает один раз;
 * - вызов внутри `@let`: значение считается один раз на рендер блока;
 * - приёмник не `PropertyRead`;
 * - имена из `allowList`.
 *
 * @type {import('eslint').Rule.RuleModule}
 */

/** Тип приёмника вызова, который правило считает методом компонента. */
const RECEIVER_TYPE = 'PropertyRead';

/**
 * Достаёт аргументы вызова.
 *
 * Парсер шаблонов кладёт их в `args`; поле `arguments` оставлено для
 * совместимости с другими версиями парсера.
 *
 * @param {object} node Узел `Call`.
 * @returns {unknown[]} Аргументы вызова.
 */
function callArguments(node) {
    if (Array.isArray(node.args)) {
        return node.args;
    }

    return Array.isArray(node.arguments) ? node.arguments : [];
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Метод с аргументами в шаблоне вызывается на каждом цикле обнаружения изменений.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allowList: {
                        type: 'array',
                        items: { type: 'string' },
                        uniqueItems: true,
                        description: 'Имена методов, вызов которых в шаблоне допустим.',
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            methodCall:
                'Метод с аргументами в шаблоне: вызов на каждом цикле обнаружения изменений. Считайте в computed.',
        },
    },

    create(context) {
        const options = context.options[0] ?? {};
        const allowList = options.allowList ?? [];

        // Глубина вложенности внутри обработчика события и внутри `@let`:
        // там вызов происходит один раз, а не на каждом цикле.
        let eventDepth = 0;
        let letDepth = 0;

        return {
            BoundEvent() {
                eventDepth += 1;
            },

            'BoundEvent:exit'() {
                eventDepth -= 1;
            },

            LetDeclaration() {
                letDepth += 1;
            },

            'LetDeclaration:exit'() {
                letDepth -= 1;
            },

            Call(node) {
                if (eventDepth > 0 || letDepth > 0) {
                    return;
                }

                if (callArguments(node).length === 0) {
                    return;
                }

                const receiver = node.receiver;

                if (!receiver || receiver.type !== RECEIVER_TYPE) {
                    return;
                }

                if (typeof receiver.name === 'string' && allowList.includes(receiver.name)) {
                    return;
                }

                context.report({ node, messageId: 'methodCall' });
            },
        };
    },
};
