/**
 * Правило `lh/no-comment-restates-code`.
 *
 * Комментарий, который пересказывает строку кода под собой, не сообщает ничего
 * нового: имя `ruleSection` и так читается в коде. Полезных исходов два —
 * объяснить причину или удалить комментарий.
 *
 * Как считается пересказ:
 * 1. Берём комментарий `//`, но не `eslint-disable`/`eslint-enable`/`@ts-`
 *    и не JSDoc: у JSDoc другая задача — контракт публичного элемента.
 * 2. Берём следующую непустую строку кода, перешагивая другие комментарии.
 * 3. Обе строки превращаем в набор слов: нижний регистр, разбиение по не-буквам,
 *    отбрасываем слова короче 4 букв и стоп-слова.
 * 4. В строке кода учитываем и целое имя, и его части: `userNames` даёт
 *    `usernames`, `user`, `names`. Литералы в кавычках выбрасываем с обеих
 *    сторон: пример или путь в кавычках — это ссылка, а не пересказ.
 * 5. Пересказ — это `minSharedWords` общих слов, если они покрывают не меньше
 *    половины слов комментария. Второе условие отсекает длинное объяснение,
 *    где случайно совпали два имени: `// event.code не зависит от раскладки`.
 *
 * @type {import('eslint').Rule.RuleModule}
 */

/** Стоп-слова: служебные слова русского и английского языков. */
const STOP_WORDS = new Set([
    'и',
    'в',
    'на',
    'не',
    'с',
    'по',
    'это',
    'как',
    'для',
    'из',
    'то',
    'же',
    'что',
    'к',
    'у',
    'о',
    'от',
    'до',
    'если',
    'или',
    'а',
    'но',
    'уже',
    'ещё',
    'где',
    'когда',
    'этот',
    'эта',
    'эти',
    'the',
    'a',
    'an',
    'of',
    'to',
    'in',
    'is',
    'for',
    'and',
    'or',
    'if',
    'we',
    'it',
    'this',
    'that',
    'be',
    'as',
    'on',
    'at',
]);

/** Строковые литералы: в комментарии — пример, в коде — данные. */
const QUOTED = /'[^']*'|"[^"]*"|`[^`]*`/g;

/** Строки, которые сами являются комментарием, а не кодом. */
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;

/** Минимальная длина слова, которую учитывает правило. */
const MIN_WORD_LENGTH = 4;

/** Какая доля слов комментария должна совпасть со строкой кода. */
const MIN_SHARE = 0.5;

/**
 * Разбивает текст на слова: нижний регистр, разделитель — любой не-буква.
 *
 * @param {string} text Исходный текст.
 * @returns {string[]} Слова без пустых элементов.
 */
function splitWords(text) {
    return text
        .toLowerCase()
        .split(/[^\p{L}]+/u)
        .filter(Boolean);
}

/**
 * Превращает текст в набор значимых слов.
 *
 * @param {string} text Исходный текст.
 * @returns {string[]} Слова длиной от 4 букв без стоп-слов.
 */
function wordBag(text) {
    return splitWords(text).filter((word) => word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word));
}

/**
 * Разделяет идентификаторы `camelCase` и `snake_case` на части.
 *
 * @param {string} text Строка кода.
 * @returns {string[]} Части идентификаторов в нижнем регистре.
 */
function splitIdentifiers(text) {
    return text
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/[^\p{L}\s]+/gu, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

/**
 * Превращает строку кода в набор слов: части идентификаторов и целые имена.
 *
 * Целое имя нужно, потому что комментарий называет идентификатор как он написан:
 * `// Пересчитываем userNames` — это одно слово `usernames`, а в коде
 * `const userNames` части те же, но раздельно.
 *
 * @param {string} text Строка кода без строковых литералов.
 * @returns {string[]} Слова для сравнения с комментарием.
 */
function codeBag(text) {
    const words = [];

    for (const identifier of text.match(/[\p{L}\p{N}_$]+/gu) ?? []) {
        words.push(...splitIdentifiers(identifier), identifier.toLowerCase());
    }

    return words.filter((word) => word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word));
}

/**
 * Убирает строковые литералы: они не участвуют в сравнении.
 *
 * @param {string} text Исходный текст.
 * @returns {string} Текст без содержимого кавычек.
 */
function dropQuoted(text) {
    return text.replace(QUOTED, ' ');
}

/**
 * Ищет первую строку кода после комментария.
 *
 * @param {string[]} lines Строки файла.
 * @param {number} fromLine Номер строки после комментария, с единицы.
 * @returns {string | null} Строка кода или null, если кода дальше нет.
 */
function nextCodeLine(lines, fromLine) {
    for (let index = fromLine; index < lines.length; index += 1) {
        const line = lines[index];

        if (line.trim() === '' || COMMENT_LINE.test(line)) {
            continue;
        }

        return line;
    }

    return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Комментарий не должен пересказывать строку кода под собой: объясняйте причину.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    minSharedWords: {
                        type: 'integer',
                        minimum: 1,
                        description: 'Сколько общих слов считать пересказом.',
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            restates: 'Комментарий пересказывает код. Объясните причину или удалите его.',
        },
    },

    create(context) {
        const options = context.options[0] ?? {};
        const minSharedWords = options.minSharedWords ?? 2;
        const lines = context.sourceCode.getText().split('\n');

        return {
            Program() {
                for (const comment of context.sourceCode.getAllComments()) {
                    // JSDoc и блочные комментарии описывают контракт, а не строку кода.
                    if (comment.type !== 'Line') {
                        continue;
                    }

                    const text = comment.value.trim();

                    if (text === '' || /^(eslint-(disable|enable)|@ts-)/.test(text)) {
                        continue;
                    }

                    const codeLine = nextCodeLine(lines, comment.loc.end.line);

                    if (!codeLine) {
                        continue;
                    }

                    const commentWords = wordBag(dropQuoted(text));

                    if (commentWords.length === 0) {
                        continue;
                    }

                    const codeWords = new Set(codeBag(dropQuoted(codeLine)));
                    const shared = commentWords.filter((word) => codeWords.has(word));

                    if (shared.length < minSharedWords || shared.length / commentWords.length < MIN_SHARE) {
                        continue;
                    }

                    context.report({ node: comment, messageId: 'restates' });
                }
            },
        };
    },
};
