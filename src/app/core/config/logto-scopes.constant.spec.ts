import { describe, expect, it } from 'vitest';

import { MAIL_SCOPES } from '@entities/mail';
import { NICKNAME_ADMIN_SCOPES } from '@entities/user';

import { LOGTO_SCOPES } from './logto-scopes.constant';

/**
 * Право, которое фича проверяет в интерфейсе, обязано быть запрошено у Logto.
 * Иначе Logto не положит его в access token, `hasScope` вернёт false, и экран
 * навсегда покажет «нет прав», хотя роль выдана. Именно это случилось с
 * `mail:compose` и `mail:read` после мерджа админки почты.
 */
describe('logto scopes', () => {
    it('запрашивает все права, которые проверяют фичи', () => {
        const featureScopes = [...Object.values(MAIL_SCOPES), ...Object.values(NICKNAME_ADMIN_SCOPES)];
        const missing = featureScopes.filter((scope) => !LOGTO_SCOPES.includes(scope));

        expect(missing).toEqual([]);
    });

    it('не запрашивает одно право дважды', () => {
        const duplicates = LOGTO_SCOPES.filter((scope, index) => LOGTO_SCOPES.indexOf(scope) !== index);

        expect(duplicates).toEqual([]);
    });
});