import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    signal,
} from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { environment } from '@core/config/environments/environment';
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
const DISCORD_INVITE = environment.discordInviteUrl;

/**
 * Где купить игру.
 */
const OFFICIAL_STORE = 'https://www.vintagestory.at/store/category/1-game-account-game-servers/';

/**
 * Бесплатная версия для знакомства с игрой.
 */
const FREE_VERSION = 'https://fplay.su/vs/';

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
 * Путь новичка: игра → аккаунт → правила → анкета → вход на сервер, а по желанию — поселение и Discord.
 *
 * Шаги отмечаются сами (вход на сайт, статус анкеты, открытые правила, скопированный адрес)
 * или кнопкой («Игра уже установлена»). Текущий шаг раскрыт, остальные можно раскрыть кликом.
 *
 * Живёт на гостевой странице «Начать игру» и сам загружает анкету и поселение.
 * В профиле его нет: вошедшему игроку прогресс показывает вкладка «Как начать играть».
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
     * Магазин игры.
     */
    protected readonly officialStore = OFFICIAL_STORE;

    /**
     * Бесплатная версия.
     */
    protected readonly freeVersion = FREE_VERSION;

    /**
     * Версия игры на сервере.
     */
    protected readonly gameVersion = environment.gameVersion;

    /**
     * Адрес сервера.
     */
    protected readonly serverIp = environment.gameServerIp;

    /**
     * Пароль сервера (показывается только одобренным игрокам, как в профиле).
     */
    protected readonly serverPassword = environment.gameServerPassword;

    /**
     * Что скопировано последним (для подписи «Скопировано»).
     */
    protected readonly copied = signal<'ip' | 'password' | null>(null);

    /**
     * Шаг, раскрытый игроком: `null` — раскрыт текущий, `'none'` — игрок всё свернул.
     */
    private readonly opened = signal<OnboardingStepKey | 'none' | null>(null);

    /**
     * Игрок вошёл на сайт.
     */
    protected readonly isAuth = toSignal(this.userService.authState$, { initialValue: false });

    /**
     * Детали анкеты (`null` — анкеты нет или ещё не загружена).
     */
    protected readonly applicationDetails = signal<ApplicationDetails | null>(null);

    /**
     * Название поселения игрока (`null` — не в поселении или ещё не загружено).
     */
    protected readonly settlement = signal<string | null>(null);

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
        const verified = this.verified();
        const raw: Array<[OnboardingStepKey, OnboardingStep['state'], boolean]> = [
            ['install', this.onboarding.installed() || verified ? 'done' : 'todo', false],
            ['account', this.isAuth() ? 'done' : 'todo', false],
            ['rules', this.onboarding.rulesOpened() ? 'done' : 'todo', false],
            [
                'application',
                verified ? 'done' : status === 'pending' ? 'waiting' : status === 'rejected' ? 'rejected' : 'todo',
                false,
            ],
            ['connect', verified && this.onboarding.connected() ? 'done' : 'todo', false],
            ['settlement', this.settlement() ? 'done' : 'todo', true],
            ['discord', this.onboarding.discordOpened() ? 'done' : 'todo', true],
        ];

        let currentMarked = false;
        return raw.map(([key, state, optional]) => {
            if (state === 'todo' && !currentMarked) {
                currentMarked = true;
                return { key, state: 'current', optional };
            }

            if (state === 'rejected' || state === 'waiting') {
                currentMarked = true;
            }

            return { key, state, optional };
        });
    });

    /**
     * Раскрытый шаг: выбранный игроком или первый, требующий действия.
     */
    protected readonly expanded = computed<OnboardingStepKey | null>(() => {
        const chosen = this.opened();

        if (chosen) {
            return chosen === 'none' ? null : chosen;
        }

        const active = this.steps().find((step) => ['current', 'waiting', 'rejected'].includes(step.state));
        return active?.key ?? null;
    });

    /**
     * Сколько шагов сделано.
     */
    protected readonly doneCount = computed(() => this.steps().filter((step) => step.state === 'done').length);

    /**
     * Обязательные шаги пройдены: можно играть.
     */
    protected readonly complete = computed(() => this.steps().every((step) => step.optional || step.state === 'done'));

    constructor() {
        effect(() => {
            if (!this.isAuth()) {
                return;
            }

            this.verificationService
                .getDetails()
                .pipe(
                    catchError(() => of(null)),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe((details) => this.applicationDetails.set(details));
        });

        effect(() => {
            if (!this.verified() || !this.userService.userId) {
                return;
            }

            this.settlementService
                .getSettlementInfo(this.userService.userId, new HttpContext().set(SKIP_ERROR_ALERT, true))
                .pipe(
                    catchError(() => of(null)),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe((settlement) => this.settlement.set(settlement?.name ?? null));
        });
    }

    /**
     * Раскрывает шаг или сворачивает уже раскрытый.
     *
     * @param key Шаг.
     */
    protected toggle(key: OnboardingStepKey): void {
        this.opened.set(this.expanded() === key ? 'none' : key);
    }

    /**
     * Копирует адрес или пароль сервера; адрес заодно отмечает шаг «Вход на сервер».
     *
     * @param what Что копировать.
     */
    protected async copy(what: 'ip' | 'password'): Promise<void> {
        const value = what === 'ip' ? this.serverIp : this.serverPassword;

        try {
            await navigator.clipboard.writeText(value);
            this.copied.set(what);
            setTimeout(() => this.copied.update((current) => (current === what ? null : current)), 2000);
        } catch {
            this.copied.set(null);
        }

        if (what === 'ip') {
            this.onboarding.markConnected();
        }
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
                this.nicknameStatus.set(!status ? 'none' : KNOWN_CHECK_RESULTS.includes(status) ? status : 'unknown');
            });
    }
}
