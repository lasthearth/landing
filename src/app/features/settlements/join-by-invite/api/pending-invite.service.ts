import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LocalStorageService } from '@core/services/local-storage.service';
import { UserService } from '@entities/user';
import { filter, take } from 'rxjs';
import { PendingInvite } from '../model/pending-invite';

/**
 * Ключ localStorage с отложенным приглашением.
 */
const STORAGE_KEY = 'lh_pending_invite';

/**
 * Сколько хранить отложенное приглашение (дольше ссылка всё равно не живёт).
 */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Отложенное приглашение в поселение.
 *
 * Гость открыл `/join/<код>` и пошёл входить — после входа OIDC возвращает его
 * на главную, а этот сервис один раз возвращает его на страницу приглашения.
 * Игрок без проверенной анкеты видит приглашение плашкой в профиле, пока
 * анкету не одобрят.
 */
@Injectable({ providedIn: 'root' })
export class PendingInviteService {
    private readonly storage = inject(LocalStorageService);
    private readonly router = inject(Router);
    private readonly userService = inject(UserService);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Текущее отложенное приглашение.
     */
    public readonly invite = signal<PendingInvite | null>(this.load());

    public constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) {
            return;
        }

        this.userService.authSettled$
            .pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.returnToInvite());
    }

    /**
     * Запоминает приглашение.
     *
     * @param code Код ссылки.
     * @param settlementName Название поселения.
     * @param redirectOnSignIn Вернуть ли на страницу приглашения после входа.
     */
    public save(code: string, settlementName: string, redirectOnSignIn: boolean): void {
        const invite: PendingInvite = { code, settlementName, savedAt: Date.now(), redirectOnSignIn };
        this.invite.set(invite);
        this.storage.setItem(STORAGE_KEY, invite);
    }

    /**
     * Забывает приглашение (принято, отклонено или не действует).
     */
    public clear(): void {
        this.invite.set(null);
        this.storage.removeItem(STORAGE_KEY);
    }

    /**
     * После входа один раз возвращает игрока на страницу приглашения.
     */
    private returnToInvite(): void {
        const invite = this.invite();
        if (!invite?.redirectOnSignIn) {
            return;
        }

        this.save(invite.code, invite.settlementName, false);
        if (!this.router.url.startsWith('/join/')) {
            void this.router.navigate(['/join', invite.code]);
        }
    }

    /**
     * Читает приглашение, отбрасывая устаревшее и повреждённое.
     *
     * @returns Приглашение или `null`.
     */
    private load(): PendingInvite | null {
        const stored = this.storage.getItem<PendingInvite>(STORAGE_KEY);
        if (!stored || typeof stored.code !== 'string' || typeof stored.savedAt !== 'number') {
            return null;
        }
        if (Date.now() - stored.savedAt > TTL_MS) {
            this.storage.removeItem(STORAGE_KEY);
            return null;
        }
        return stored;
    }
}
