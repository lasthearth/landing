/**
 * Правило `lh/no-effect-signal-write`.
 *
 * `effect` нужен, чтобы синхронизировать сигнал с внешним миром: DOM, хранилище,
 * сторонняя библиотека. Запись сигнала внутри `effect` создаёт второй источник
 * истины и лишний цикл: эффект читает сигнал, который сам же и меняет.
 * Результат считается в `computed`, а источник обновляется там, где меняется
 * причина.
 *
 * Правило сообщает о вызове `.set()`/`.update()` внутри первого аргумента
 * `effect`, если вызов идёт синхронно, то есть в том же проходе эффекта:
 * - тело колбэка `untracked(...)` считается: `untracked` зовёт его сразу;
 * - тело колбэка `subscribe`, `setTimeout`, обработчика DOM не считается:
 *   запись приходит позже и цикла не образует;
 * - приёмник записи должен быть полем или переменной. `new HttpContext().set()`
 *   под правило не попадает: это не сигнал, а заголовок запроса.
 *
 * @type {import('eslint').Rule.RuleModule}
 */

/** Имена методов сигналов, которые меняют значение. */
const WRITE_METHODS = new Set(['set', 'update']);

/** Имена, под которыми вызывают `effect`. */
const EFFECT_NAME = 'effect';

/** Обёртка, которая зовёт колбэк сразу и не регистрирует зависимость. */
const UNTRACKED_NAME = 'untracked';

/** Типы узлов-функций. */
const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

/**
 * Проверяет, что вызов — это `effect(...)`.
 *
 * @param {import('estree').Node} node Узел `CallExpression`.
 * @returns {boolean} true, если вызывают `effect`.
 */
function isEffectCall(node) {
    const { callee } = node;

    if (callee.type === 'Identifier') {
        return callee.name === EFFECT_NAME;
    }

    return (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        callee.property.name === EFFECT_NAME
    );
}

/**
 * Проверяет, что вызов — это `untracked(...)`.
 *
 * @param {import('estree').Node} node Узел `CallExpression`.
 * @returns {boolean} true, если вызывают `untracked`.
 */
function isUntrackedCall(node) {
    const { callee } = node;

    return (
        (callee.type === 'Identifier' && callee.name === UNTRACKED_NAME) ||
        (callee.type === 'MemberExpression' &&
            !callee.computed &&
            callee.property.type === 'Identifier' &&
            callee.property.name === UNTRACKED_NAME)
    );
}

/**
 * Проверяет, что приёмник записи похож на сигнал, а не на свежий объект.
 *
 * @param {import('estree').MemberExpression} callee Узел в позиции вызываемого.
 * @returns {boolean} true, если запись идёт в поле или переменную.
 */
function isSignalTarget(callee) {
    let object = callee.object;

    while (object.type === 'MemberExpression' || object.type === 'TSNonNullExpression') {
        object = object.type === 'MemberExpression' ? object.object : object.expression;
    }

    return object.type === 'ThisExpression' || object.type === 'Identifier';
}

/**
 * Проверяет, что вызов — запись в сигнал.
 *
 * @param {import('estree').Node} node Узел `CallExpression`.
 * @returns {boolean} true, если это `.set()` или `.update()` над сигналом.
 */
function isSignalWrite(node) {
    const { callee } = node;

    return (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        WRITE_METHODS.has(callee.property.name) &&
        isSignalTarget(callee)
    );
}

/**
 * Перечисляет дочерние узлы AST.
 *
 * @param {import('estree').Node} node Родительский узел.
 * @returns {import('estree').Node[]} Дочерние узлы.
 */
function childNodes(node) {
    const children = [];

    for (const key of Object.keys(node)) {
        if (key === 'parent') {
            continue;
        }

        const value = node[key];

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item && typeof item === 'object' && typeof item.type === 'string') {
                    children.push(item);
                }
            }

            continue;
        }

        if (value && typeof value === 'object' && typeof value.type === 'string') {
            children.push(value);
        }
    }

    return children;
}

/**
 * Собирает записи в сигналы, которые идут в том же проходе, что и эффект.
 *
 * @param {import('estree').Node | null} root Корень обхода.
 * @param {(node: import('estree').Node) => void} onWrite Обработчик записи.
 * @returns {void}
 */
function collectSyncWrites(root, onWrite) {
    if (!root || typeof root !== 'object') {
        return;
    }

    if (root.type === 'CallExpression' && isSignalWrite(root)) {
        onWrite(root);
    }

    const untracked = root.type === 'CallExpression' && isUntrackedCall(root);

    for (const child of childNodes(root)) {
        if (!FUNCTION_TYPES.has(child.type)) {
            collectSyncWrites(child, onWrite);
            continue;
        }

        if (untracked && Array.isArray(root.arguments) && root.arguments.includes(child) && child.body) {
            collectSyncWrites(child.body, onWrite);
        }
    }
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: '`effect` не должен писать в сигнал: это второй источник истины и лишний цикл.',
        },
        schema: [],
        messages: {
            signalWrite: 'effect пишет в сигнал: два источника истины. Считайте computed или обновите источник.',
        },
    },

    create(context) {
        return {
            CallExpression(node) {
                if (!isEffectCall(node)) {
                    return;
                }

                const callback = node.arguments[0];

                if (!callback || !FUNCTION_TYPES.has(callback.type) || !callback.body) {
                    return;
                }

                collectSyncWrites(callback.body, (write) => {
                    context.report({ node: write, messageId: 'signalWrite' });
                });
            },
        };
    },
};
