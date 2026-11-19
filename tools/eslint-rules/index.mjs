/**
 * Локальный плагин правил проекта.
 *
 * Здесь живёт только то, для чего нет готового правила: проверки, которые
 * знают про Angular и про этот репозиторий. Подключается в `eslint.config.mjs`
 * как `lh`. Тесты: `node --test tools/eslint-rules/`.
 */
import noCommentRestatesCode from './rules/no-comment-restates-code.mjs';
import noEffectSignalWrite from './rules/no-effect-signal-write.mjs';
import noMethodCallWithArgs from './rules/no-method-call-with-args.mjs';
import noSpecWithoutAssert from './rules/no-spec-without-assert.mjs';

export default {
    meta: { name: 'lh', version: '1.0.0' },
    rules: {
        'no-comment-restates-code': noCommentRestatesCode,
        'no-effect-signal-write': noEffectSignalWrite,
        'no-spec-without-assert': noSpecWithoutAssert,
        'no-method-call-with-args': noMethodCallWithArgs,
    },
};
