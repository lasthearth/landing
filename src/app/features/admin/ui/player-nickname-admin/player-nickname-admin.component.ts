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
import { finalize, tap } from 'rxjs';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService, TuiLoader } from '@taiga-ui/core';

import {
    AdminNicknameApiService,
    getNicknameCooldownEnd,
    IPlayer,
    NICKNAME_ADMIN_LIMITS,
    NICKNAME_ADMIN_SCOPES,
    sanitizeNickname,
    UserService,
} from '@entities/user';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { formatFullDate, parseDateInput } from '@shared/lib/relative-time';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { catchAdminActionError } from '../../lib/catch-admin-action-error.function';
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
     * Есть ли скоуп принудительной смены ника.
     *
     * `computed`, а не снимок в конструкторе: `UserService.scopes` обновляется
     * при silent renew токена, и гейт кнопок должен пережить обновление.
     */
    protected readonly canWrite = computed(() => this.userService.hasScope(NICKNAME_ADMIN_SCOPES.write));

    /**
     * Есть ли скоуп досрочного разрешения смены.
     */
    protected readonly canGrant = computed(() => this.userService.hasScope(NICKNAME_ADMIN_SCOPES.grant));

    /**
     * Максимальная длина ника для счётчика «N/15».
     */
    protected readonly nicknameMaxLength = NICKNAME_ADMIN_LIMITS.nicknameMaxLength;

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
     * Признак выполнения запроса досрочного разрешения смены.
     */
    protected readonly isGranting = signal(false);

    /**
     * Дата окончания кулдауна: последняя смена + 6 месяцев либо `null`.
     */
    protected readonly cooldownEnd = computed(() => getNicknameCooldownEnd(this.player().last_nickname_changed_at));

    /**
     * Активен ли кулдаун: дата окончания ещё не наступила.
     *
     * `Date.now()` не реактивен: значение пересчитывается только при смене
     * `player()`. Для окна в 6 месяцев этого достаточно — истечение кулдауна
     * без действия админа на открытой карточке не ожидается.
     */
    protected readonly isCooldownActive = computed(() => {
        const end = this.cooldownEnd();

        return end !== null && end.getTime() > Date.now();
    });

    /**
     * Показывать ли кнопку «Разрешить смену раньше срока».
     */
    protected readonly showGrant = computed(() => this.canGrant() && this.isCooldownActive());

    /**
     * Текст строки «Последняя смена».
     */
    protected readonly lastChangeText = computed(() =>
        this.formatDateText(
            parseDateInput(this.player().last_nickname_changed_at),
            'admin.nickname.neverChanged'
        )
    );

    /**
     * Текст строки «Смена разрешена с».
     */
    protected readonly nextChangeText = computed(() =>
        this.formatDateText(this.cooldownEnd(), 'admin.nickname.available')
    );

    constructor() {
        // Маска ника: недопустимые символы вырезаются сразу при вводе,
        // длина обрезается до 15 — до сервера невалидный ник не доходит.
        this.nicknameControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
            const sanitized = sanitizeNickname(value);

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
                catchAdminActionError(
                    this.requestStatus,
                    this.i18n.translate('admin.nickname.noPermission'),
                    this.i18n.translate('admin.nickname.error')
                ),
                finalize(() => this.isGranting.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    /**
     * Форматирует дату либо возвращает текст-заглушку.
     *
     * @param date Дата либо `null`.
     * @param emptyKey Ключ перевода для пустого значения.
     * @returns Отформатированная дата или переведённая заглушка.
     */
    private formatDateText(date: Date | null, emptyKey: string): string {
        return date ? formatFullDate(date, this.i18n.language()) : this.i18n.translate(emptyKey);
    }
}
