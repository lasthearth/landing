import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, tap } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext, TuiIcon, TuiLoader } from '@taiga-ui/core';

import { AdminNicknameApiService } from '@entities/user';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { catchAdminActionError } from '../../lib/catch-admin-action-error.function';
import { IConfirmNicknameChangeData } from '../../model/confirm-nickname-change-data.model';

/**
 * Диалог подтверждения принудительной смены ника игрока.
 *
 * Подтверждение выполняет `PUT /admin/users/{user_id}/nickname`
 * (скоуп `players:nickname:write`): игрок получит уведомление с причиной,
 * а кулдаун 6 месяцев начнётся заново. При успехе закрывается с `true`,
 * чтобы карточка игрока перечитала данные; ошибку показывает текстом сервера,
 * на 403 — «Нет прав».
 */
@Component({
    standalone: true,
    selector: 'app-confirm-nickname-change',
    imports: [TuiIcon, TuiLoader, TranslatePipe],
    templateUrl: './confirm-nickname-change.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmNicknameChangeComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<boolean, IConfirmNicknameChangeData> =
        inject<TuiDialogContext<boolean, IConfirmNicknameChangeData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис административного управления ником.
     */
    private readonly adminNicknameApi = inject(AdminNicknameApiService);

    /**
     * Сервис уведомлений об ошибках и успехе.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Признак выполнения запроса смены ника.
     */
    protected readonly isSaving = signal(false);

    /**
     * Меняет ник игрока и закрывает диалог при успехе.
     */
    protected confirmChange(): void {
        const { userId, newNickname, reason } = this.context.data;

        this.isSaving.set(true);
        this.adminNicknameApi
            .changeNickname$({
                user_id: userId,
                new_nickname: newNickname,
                ...(reason ? { reason } : {}),
            })
            .pipe(
                tap((response) =>
                    this.requestStatus.showSuccess(
                        this.i18n.translate('admin.nickname.changeSuccess', {
                            oldNickname: response.old_nickname,
                            newNickname: response.new_nickname,
                        })
                    )
                ),
                catchAdminActionError(
                    this.requestStatus,
                    this.i18n.translate('admin.nickname.noPermission'),
                    this.i18n.translate('admin.nickname.error')
                ),
                finalize(() => this.isSaving.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.context.$implicit.next(true);
                    this.context.$implicit.complete();
                },
            });
    }
}
