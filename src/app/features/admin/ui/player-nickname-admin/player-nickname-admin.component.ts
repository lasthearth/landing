import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiLoader } from '@taiga-ui/core';

import {
    AdminNicknameApiService,
    getNicknameCooldownEnd,
    IPlayer,
    NICKNAME_ADMIN_LIMITS,
    UserService,
} from '@entities/user';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { formatFullDate } from '@shared/lib/relative-time';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { getAdminActionErrorMessage } from '../../lib/admin-action-error.function';
import { ConfirmNicknameChangeComponent } from '../confirm-nickname-change/confirm-nickname-change.component';

/**
 * Блок «Никнейм» в карточке игрока в админке.
 *
 * Показывает текущий и предыдущий ник, дату последней смены и дату, с которой
 * смена разрешена (последняя смена + 6 месяцев). Две административные
 * операции, каждая gated своим скоупом из access-токена:
 * - «Изменить ник» (`players:nickname:write`) — принудительная смена с
 *   подтверждением; игрок получает уведомление, кулдаун стартует заново;
 * - «Разрешить смену раньше срока» (`players:nickname:grant`) — снимает
 *   кулдаун, ник не меняет; кнопка видна только при активном кулдауне.
 */
@Component({
    standalone: true,
    selector: 'app-player-nickname-admin',
    imports: [ReactiveFormsModule, TuiLoader, TranslatePipe, LHInputComponent],
    templateUrl: './player-nickname-admin.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerNicknameAdminComponent {
    /**
     * Сервис административного управления ником.
     */
    private readonly adminNicknameApi = inject(AdminNicknameApiService);

    /**
     * Сервис пользователя: скоупы текущего администратора.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис уведомлений об ошибках и успехе.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис диалогов Taiga UI.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Данные игрока из `GET /users/{user_id}`.
     */
    public readonly player = input.required<IPlayer>();

    /**
     * Данные игрока изменились — родитель перечитывает карточку.
     */
    public readonly changed = output<void>();

    /**
     * Есть ли скоуп `players:nickname:write` (принудительная смена ника).
     */
    protected readonly canWrite = this.userService.hasScope('players:nickname:write');

    /**
     * Есть ли скоуп `players:nickname:grant` (досрочное разрешение смены).
     */
    protected readonly canGrant = this.userService.hasScope('players:nickname:grant');

    /**
     * Ограничения полей ника и причины.
     */
    protected readonly limits = NICKNAME_ADMIN_LIMITS;

    /**
     * Поле нового ника: маска `[A-Za-z0-9_-]{1,15}`.
     */
    protected readonly nicknameControl = new FormControl('', {
        nonNullable: true,
        validators: [
            Validators.required,
            Validators.maxLength(NICKNAME_ADMIN_LIMITS.nicknameMaxLength),
            Validators.pattern(NICKNAME_ADMIN_LIMITS.pattern),
        ],
    });

    /**
     * Поле причины: необязательное, до 500 символов.
     */
    protected readonly reasonControl = new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(NICKNAME_ADMIN_LIMITS.reasonMaxLength)],
    });

    /**
     * Текущая длина нового ника для счётчика «N/15».
     */
    protected readonly nicknameLength = signal(0);

    /**
     * Признак выполнения запроса досрочного разрешения смены.
     */
    protected readonly isGranting = signal(false);

    /**
     * Дата окончания кулдауна: последняя смена + 6 месяцев либо `null`.
     */
    protected readonly cooldownEnd = computed(() => getNicknameCooldownEnd(this.player().last_nickname_changed_at));

    /**
     * Активен ли кулдаун: дата окончания ещё не наступила.
     */
    protected readonly isCooldownActive = computed(() => {
        const end = this.cooldownEnd();

        return end !== null && end.getTime() > Date.now();
    });

    /**
     * Показывать ли кнопку «Разрешить смену раньше срока».
     */
    protected readonly showGrant = computed(() => this.canGrant && this.isCooldownActive());

    /**
     * Текст строки «Последняя смена».
     */
    protected readonly lastChangeText = computed(() =>
        this.formatDateText(this.player().last_nickname_changed_at, 'admin.nickname.neverChanged')
    );

    /**
     * Текст строки «Смена разрешена с».
     */
    protected readonly nextChangeText = computed(() => {
        const end = this.cooldownEnd();

        return end ? formatFullDate(end, this.i18n.language()) : this.i18n.translate('admin.nickname.available');
    });

    constructor() {
        // Маска ника: недопустимые символы вырезаются сразу при вводе,
        // длина обрезается до 15 — до сервера невалидный ник не доходит.
        this.nicknameControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
            const sanitized = this.sanitizeNickname(value);

            this.nicknameLength.set(sanitized.length);

            if (sanitized !== value) {
                this.nicknameControl.setValue(sanitized, { emitEvent: false });
            }
        });
    }

    /**
     * Открывает диалог подтверждения принудительной смены ника.
     *
     * Сам запрос выполняет диалог. Диалог возвращает `true`, только если смена
     * прошла: тогда поля сбрасываются, а карточка перечитывается.
     */
    protected openChangeDialog(): void {
        if (this.nicknameControl.invalid) {
            return;
        }

        const reason = this.reasonControl.value.trim();

        this.dialogs
            .open<boolean>(
                new PolymorpheusComponent(ConfirmNicknameChangeComponent),
                {
                    size: 'auto',
                    closeable: false,
                    data: {
                        userId: this.player().user_id,
                        newNickname: this.nicknameControl.value,
                        reason: reason.length > 0 ? reason : undefined,
                    },
                }
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((isChanged) => {
                if (!isChanged) {
                    return;
                }

                this.nicknameControl.reset('');
                this.reasonControl.reset('');
                this.nicknameLength.set(0);
                this.changed.emit();
            });
    }

    /**
     * Разрешает игроку сменить ник досрочно (`nickname:grant`).
     *
     * Ник не меняется: сервер снимает кулдаун, игрок меняет ник сам
     * в профиле. При успехе карточка перечитывается.
     */
    protected grantEarlyChange(): void {
        const reason = this.reasonControl.value.trim();

        this.isGranting.set(true);
        this.adminNicknameApi
            .grantNicknameChange$({
                user_id: this.player().user_id,
                ...(reason.length > 0 ? { reason } : {}),
            })
            .pipe(
                tap(() => {
                    this.requestStatus.showSuccess(this.i18n.translate('admin.nickname.grantSuccess'));
                    this.reasonControl.reset('');
                    this.changed.emit();
                }),
                catchError((error: unknown) => {
                    this.requestStatus.showError(this.buildErrorMessage(error));

                    return EMPTY;
                }),
                finalize(() => this.isGranting.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    /**
     * Собирает текст ошибки операции: «Нет прав» на 403, иначе текст сервера.
     *
     * @param error Ошибка запроса.
     * @returns Строка для уведомления.
     */
    private buildErrorMessage(error: unknown): string {
        return getAdminActionErrorMessage(
            error,
            this.i18n.translate('admin.nickname.noPermission'),
            this.i18n.translate('admin.nickname.error')
        );
    }

    /**
     * Форматирует дату либо возвращает текст-заглушку.
     *
     * @param iso Дата в формате ISO 8601 либо `undefined`.
     * @param emptyKey Ключ перевода для пустого значения.
     * @returns Отформатированная дата или переведённая заглушка.
     */
    private formatDateText(iso: string | undefined, emptyKey: string): string {
        const date = iso ? new Date(iso) : null;

        return date && !isNaN(date.getTime())
            ? formatFullDate(date, this.i18n.language())
            : this.i18n.translate(emptyKey);
    }

    /**
     * Применяет маску ника: только `A-Za-z0-9_-`, не длиннее 15 символов.
     *
     * @param raw Введённое значение.
     * @returns Значение, приведённое к маске.
     */
    private sanitizeNickname(raw: string): string {
        return raw
            .replace(/[^A-Za-z0-9_-]/g, '')
            .slice(0, NICKNAME_ADMIN_LIMITS.nicknameMaxLength);
    }
}
