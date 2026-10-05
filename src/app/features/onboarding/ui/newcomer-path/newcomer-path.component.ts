import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { SettlementService } from '@entities/settlement';
import { UserService } from '@entities/user';
import { VerificationService } from '@features/verification';
import { OnboardingService } from '../../api/onboarding.service';
import { OnboardingStep } from '../../model/onboarding-step';
import { OnboardingStepKey } from '../../model/onboarding-step-key';

/**
 * Приглашение в Discord сервера.
 */
const DISCORD_INVITE = 'https://discord.com/invite/FZb7SGrSFy';

/**
 * Ответы проверки по нику, для которых есть подписи.
 */
const KNOWN_CHECK_RESULTS = ['pending', 'approved', 'verified', 'rejected', 'error'];

/**
 * Детали анкеты, которые нужны пути новичка.
 */
interface ApplicationDetails {
    /**
     * Статус анкеты.
     */
    status: string;

    /**
     * Причина отказа.
     */
    rejection_reason?: string;
}

/**
 * Путь новичка: аккаунт → правила → анкета → поселение → Discord, с отметками о готовности.
 *
 * На странице «Начать игру» данные загружает сам; в профиле получает их от родителя,
 * чтобы не повторять запросы, и прячется, когда всё сделано или игрок его скрыл.
 */
@Component({
    selector: 'app-newcomer-path',
    standalone: true,
    imports: [RouterLink, TuiIcon, TranslatePipe],
    templateUrl: './newcomer-path.component.html',
    styleUrl: './newcomer-path.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewcomerPathComponent {
    /**
     * Где показан путь: на странице «Начать игру» или в профиле.
     */
    public readonly variant = input<'page' | 'profile'>('page');

    /**
     * Детали анкеты от родителя. `undefined` — загрузить самому, `null` — анкеты нет.
     */
    public readonly details = input<ApplicationDetails | null | undefined>(undefined);

    /**
     * Название поселения игрока от родителя. `undefined` — загрузить самому, `null` — не в поселении.
     */
    public readonly settlementName = input<string | null | undefined>(undefined);

    /**
     * Игрок нажал «Заполнить анкету» в профиле.
     */
    public readonly fillApplication = output<void>();

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис верификации.
     */
    private readonly verificationService = inject(VerificationService);

    /**
     * Сервис поселений.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Шаги, которые отмечаются на устройстве.
     */
    protected readonly onboarding = inject(OnboardingService);

    /**
     * Ссылка на жизненный цикл.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Приглашение в Discord.
     */
    protected readonly discordInvite = DISCORD_INVITE;

    /**
     * Игрок вошёл на сайт.
     */
    protected readonly isAuth = toSignal(this.userService.authState$, { initialValue: false });

    /**
     * Загруженные самим компонентом детали анкеты.
     */
    private readonly loadedDetails = signal<ApplicationDetails | null>(null);

    /**
     * Загруженное самим компонентом название поселения.
     */
    private readonly loadedSettlement = signal<string | null>(null);

    /**
     * Ник для проверки статуса анкеты без входа.
     */
    protected readonly nickname = signal('');

    /**
     * Результат проверки по нику: `null` — не проверяли.
     */
    protected readonly nicknameStatus = signal<string | null>(null);

    /**
     * Идёт проверка по нику.
     */
    protected readonly checking = signal(false);

    /**
     * Детали анкеты: от родителя или загруженные.
     */
    protected readonly applicationDetails = computed(() => {
        const given = this.details();
        return given === undefined ? this.loadedDetails() : given;
    });

    /**
     * Поселение игрока: от родителя или загруженное.
     */
    protected readonly settlement = computed(() => {
        const given = this.settlementName();
        return given === undefined ? this.loadedSettlement() : given;
    });

    /**
     * Игрок прошёл верификацию (роль игрока или админа, либо анкета одобрена).
     */
    protected readonly verified = computed(() => {
        if (!this.isAuth()) {
            return false;
        }

        const status = this.applicationDetails()?.status;
        const roles = this.userService.roles;
        return roles.includes('player') || roles.includes('admin') || status === 'approved' || status === 'verified';
    });

    /**
     * Шаги с состояниями.
     */
    protected readonly steps = computed<OnboardingStep[]>(() => {
        const status = this.applicationDetails()?.status ?? '';
        const raw: Array<[OnboardingStepKey, OnboardingStep['state']]> = [
            ['account', this.isAuth() ? 'done' : 'todo'],
            ['rules', this.onboarding.rulesOpened() ? 'done' : 'todo'],
            [
                'application',
                this.verified()
                    ? 'done'
                    : status === 'pending'
                      ? 'waiting'
                      : status === 'rejected'
                        ? 'rejected'
                        : 'todo',
            ],
            ['settlement', this.settlement() ? 'done' : 'todo'],
            ['discord', this.onboarding.discordOpened() ? 'done' : 'todo'],
        ];

        let currentMarked = false;
        return raw.map(([key, state]) => {
            if (state === 'todo' && !currentMarked) {
                currentMarked = true;
                return { key, state: 'current' };
            }

            if (state === 'rejected') {
                currentMarked = true;
            }

            return { key, state };
        });
    });

    /**
     * Сколько шагов сделано.
     */
    protected readonly doneCount = computed(() => this.steps().filter((step) => step.state === 'done').length);

    /**
     * Всё сделано.
     */
    protected readonly complete = computed(() => this.doneCount() === this.steps().length);

    /**
     * Показывать ли путь (в профиле прячется, когда всё сделано или скрыт игроком).
     */
    protected readonly visible = computed(
        () => this.variant() === 'page' || (!this.complete() && !this.onboarding.hidden())
    );

    constructor() {
        effect(() => {
            if (!this.isAuth()) {
                return;
            }

            if (this.details() === undefined) {
                this.verificationService
                    .getDetails()
                    .pipe(
                        catchError(() => of(null)),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe((details) => this.loadedDetails.set(details));
            }
        });

        effect(() => {
            if (!this.verified() || this.settlementName() !== undefined || !this.userService.userId) {
                return;
            }

            this.settlementService
                .getSettlementInfo(this.userService.userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
                .pipe(
                    catchError(() => of(null)),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe((settlement) => this.loadedSettlement.set(settlement?.name ?? null));
        });
    }

    /**
     * Вход на сайт.
     */
    protected signIn(): void {
        this.userService.signIn();
    }

    /**
     * Обрабатывает ввод ника.
     *
     * @param event Событие ввода.
     */
    protected onNicknameInput(event: Event): void {
        this.nickname.set((event.target as HTMLInputElement).value);
        this.nicknameStatus.set(null);
    }

    /**
     * Проверяет статус анкеты по нику.
     *
     * @param event Отправка формы.
     */
    protected checkNickname(event: Event): void {
        event.preventDefault();
        const nickname = this.nickname().trim();

        if (!nickname || this.checking()) {
            return;
        }

        this.checking.set(true);
        this.verificationService
            .getStatusByNickname(nickname)
            .pipe(
                catchError(() => of('error')),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((status) => {
                this.checking.set(false);
                this.nicknameStatus.set(
                    !status ? 'none' : KNOWN_CHECK_RESULTS.includes(status) ? status : 'unknown'
                );
            });
    }
}
