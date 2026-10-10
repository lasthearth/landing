import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { environment } from '@core/config/environments/environment';
import { TranslatePipe } from '@core/i18n';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { SettlementService } from '@entities/settlement';
import { UserService } from '@entities/user';
import { OnboardingService } from '@features/onboarding';

/**
 * «Как начать играть»: три шага — купить игру нужной версии, добавить сервер
 * (адрес и пароль копируются одной кнопкой), первые шаги на сервере — и
 * подсказки, если что-то не получилось.
 *
 * Третий шаг заодно показывает прогресс новичка (правила, поселение, Discord):
 * раньше это была отдельная карточка «Ваш путь на сервер», дублировавшая шаги.
 */
@Component({
    standalone: true,
    selector: 'app-how-play',
    templateUrl: './how-play.component.html',
    styleUrl: './how-play.component.less',
    imports: [RouterLink, TuiIcon, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent {
    /**
     * Отметки пройденных шагов новичка (хранятся на устройстве).
     */
    private readonly onboarding = inject(OnboardingService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис поселений.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Ссылка-приглашение на Discord-сервер проекта.
     */
    protected readonly discordInviteUrl: string = environment.discordInviteUrl;

    /**
     * Окружение: версия игры, адрес и пароль сервера.
     */
    protected readonly environment = environment;

    /**
     * Какое поле только что скопировали (`null` — никакое).
     */
    protected readonly copied = signal<'ip' | 'password' | null>(null);

    /**
     * Игрок открывал правила.
     */
    protected readonly rulesDone = this.onboarding.rulesOpened.asReadonly();

    /**
     * Игрок переходил в Discord.
     */
    protected readonly discordDone = this.onboarding.discordOpened.asReadonly();

    /**
     * Название поселения игрока (`null` — не состоит или ещё не загружено).
     */
    protected readonly settlementName = toSignal(
        this.userService.authState$.pipe(
            switchMap((isAuth) =>
                isAuth && this.userService.userId
                    ? this.settlementService
                          .getSettlementInfo(this.userService.userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
                          .pipe(
                              map((settlement) => settlement?.name ?? null),
                              catchError(() => of(null))
                          )
                    : of(null)
            )
        ),
        { initialValue: null }
    );

    /**
     * Сколько из трёх первых шагов (правила, поселение, Discord) пройдено.
     */
    protected readonly doneCount = computed(
        () => Number(this.rulesDone()) + Number(!!this.settlementName()) + Number(this.discordDone())
    );

    /**
     * Копирует значение в буфер обмена и на 2 секунды помечает поле как скопированное.
     * Копирование адреса отмечает шаг «Вход на сервер» в пути новичка.
     *
     * @param field Поле.
     * @param value Строка для копирования.
     */
    protected copy(field: 'ip' | 'password', value: string): void {
        navigator.clipboard.writeText(value).then(() => {
            this.copied.set(field);
            setTimeout(() => this.copied.set(null), 2000);
        });

        if (field === 'ip') {
            this.onboarding.markConnected();
        }
    }
}
