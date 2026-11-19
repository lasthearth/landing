/**
 * Правило `lh/no-spec-without-assert`.
 *
 * Тест, в котором нет проверки, проходит всегда: он не падает ни при какой
 * поломке кода. Такой тест создаёт видимость покрытия и мешает найти настоящий
 * сбой. AGENTS.md, раздел «Proof»: слово «готово» несёт вывод проверки.
 *
 * Правило смотрит на `it`/`test`/`fit`/`specify` (в том числе `.each`,
 * `.only`, `.skip`) и требует вызов проверки в теле колбэка: `expect`,
 * `assert`, `assertThat`, `assertEqual`, `assertThrows` или любая функция
 * с именем на `expect`. Хелпер вида `expectError` тоже считается проверкой.
 * `describe` и хуки не проверяются: у `describe` проверки нет по устройству.
 *
 * @type {import('eslint').Rule.RuleModule}
 */

/** Имена функций объявления теста. */
const TEST_NAMES = new Set(['it', 'test', 'fit', 'specify']);

/** Члены, которые уточняют объявление теста, но не меняют его смысл. */
const TEST_MEMBERS = new Set(['each', 'only', 'skip', 'fails', 'concurrent', 'sequential', 'todo']);

/** Корни имён, которыми выражают проверку. */
const ASSERT_ROOTS = new Set(['expect', 'assert', 'assertThat', 'assertEqual', 'assertThrows']);

/**
 * Достаёт имя вызываемой функции из `callee`, снимая цепочки `a.b` и `f()`.
 *
 * @param {import('estree').Node} callee Узел в позиции вызываемого.
 * @returns {string | null} Имя корня или null, если имя не статическое.
 */
function rootName(callee) {
    let node = callee;

    while (node) {
        if (node.type === 'Identifier') {
            return node.name;
        }

        if (node.type === 'MemberExpression' && !node.computed) {
            node = node.object;
            continue;
        }

        if (node.type === 'CallExpression') {
            node = node.callee;
            continue;
        }

        if (node.type === 'TSNonNullExpression') {
            node = node.expression;
            continue;
        }

        return null;
    }

    return null;
}

/**
 * Возвращает базовое имя теста: `it`, `test`, `fit`, `specify` или null.
 *
 * @param {import('estree').Node} callee Узел в позиции вызываемого.
 * @returns {string | null} Базовое имя теста.
 */
function testName(callee) {
    let node = callee;

    // `it.each([...])('имя', ...)`: вызов возвращает функцию теста.
    while (node && node.type === 'CallExpression') {
        node = node.callee;
    }

    if (!node) {
        return null;
    }

    if (node.type === 'Identifier') {
        return TEST_NAMES.has(node.name) ? node.name : null;
    }

    if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
        const object = node.object;

        if (TEST_MEMBERS.has(node.property.name) && object.type === 'Identifier' && TEST_NAMES.has(object.name)) {
            return object.name;
        }
    }

    return null;
}

/**
 * Проверяет, что вызов в теле теста — проверка.
 *
 * @param {import('estree').Node} node Узел `CallExpression`.
 * @returns {boolean} true, если это проверка.
 */
function isAssertion(node) {
    const name = rootName(node.callee);

    return name !== null && (ASSERT_ROOTS.has(name) || name.startsWith('expect'));
}

/**
 * Ищет проверку в поддереве.
 *
 * @param {import('estree').Node | null} root Корень обхода.
 * @returns {boolean} true, если проверка найдена.
 */
function hasAssertion(root) {
    if (!root || typeof root !== 'object') {
        return false;
    }

    if (root.type === 'CallExpression' && isAssertion(root)) {
        return true;
    }

    for (const key of Object.keys(root)) {
        if (key === 'parent') {
            continue;
        }

        const value = root[key];

        if (Array.isArray(value)) {
            if (value.some((item) => hasAssertion(item))) {
                return true;
            }

            continue;
        }

        if (value && typeof value === 'object' && typeof value.type === 'string' && hasAssertion(value)) {
            return true;
        }
    }

    return false;
}

/**
 * Выбирает узел для сообщения: имя теста, если оно строкой, иначе сам вызов.
 *
 * @param {import('estree').Node} call Узел вызова теста.
 * @returns {import('estree').Node} Узел для `context.report`.
 */
function reportTarget(call) {
    const [first] = call.arguments;

    if (first && (first.type === 'Literal' || first.type === 'TemplateLiteral')) {
        return first;
    }

    return call;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Тест без проверки проходит всегда: добавьте expect или удалите тест.',
        },
        schema: [],
        messages: {
            noAssert: 'Тест без проверки ничего не доказывает: добавьте expect или удалите его.',
        },
    },

    create(context) {
        return {
            CallExpression(node) {
                if (testName(node.callee) === null) {
                    return;
                }

                const callbacks = node.arguments.filter(
                    (argument) => argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression'
                );

                // Тест без колбэка — объявление без тела, проверять нечего.
                if (callbacks.length === 0) {
                    return;
                }

                if (callbacks.some((callback) => hasAssertion(callback.body))) {
                    return;
                }

                context.report({ node: reportTarget(node), messageId: 'noAssert' });
            },
        };
    },
};
