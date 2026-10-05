import { DestroyRef, inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { LocalStorageService } from '@core/services/local-storage.service';

/**
 * Ключ localStorage: игрок открывал правила.
 */
const RULES_OPENED_KEY = 'lh_onboarding_rules_opened';

/**
 * Ключ localStorage: игрок переходил в Discord.
 */
const DISCORD_OPENED_KEY = 'lh_onboarding_discord_opened';

/**
 * Ключ localStorage: игрок скрыл путь новичка в профиле.
 */
const HIDDEN_KEY = 'lh_onboarding_hidden';

/**
 * Ссылки-приглашения в Discord.
 */
const DISCORD_LINK_SELECTOR = 'a[href*="discord.gg/"], a[href*="discord.com/invite/"]';

/**
 * Шаги пути новичка, которые нельзя узнать у API: открыл ли игрок правила и заходил ли в Discord.
 *
 * Отмечаются сами: при переходе на `/rules` и при клике на любую ссылку-приглашение в Discord на сайте.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
    /**
     * Обёртка над localStorage.
     */
    private readonly storage = inject(LocalStorageService);

    /**
     * Роутер.
     */
    private readonly router = inject(Router);

    /**
     * Документ.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Ссылка на жизненный цикл.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Работаем в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Игрок открывал правила.
     */
    public readonly rulesOpened = signal(this.read(RULES_OPENED_KEY));

    /**
     * Игрок переходил в Discord.
     */
    public readonly discordOpened = signal(this.read(DISCORD_OPENED_KEY));

    /**
     * Игрок скрыл путь новичка в профиле.
     */
    public readonly hidden = signal(this.read(HIDDEN_KEY));

    /**
     * Отслеживание уже запущено.
     */
    private started = false;

    /**
     * Запускает отслеживание переходов и кликов. Вызывается один раз из корневого layout.
     */
    public start(): void {
        if (!this.isBrowser || this.started) {
            return;
        }

        this.started = true;

        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((event) => {
                if (event.urlAfterRedirects.split(/[?#]/)[0] === '/rules') {
                    this.set(RULES_OPENED_KEY, this.rulesOpened);
                }
            });

        const onClick = (event: Event): void => {
            const target = event.target as Element | null;
            if (target?.closest?.(DISCORD_LINK_SELECTOR)) {
                this.set(DISCORD_OPENED_KEY, this.discordOpened);
            }
        };

        this.document.addEventListener('click', onClick, true);
        this.destroyRef.onDestroy(() => this.document.removeEventListener('click', onClick, true));
    }

    /**
     * Скрывает путь новичка в профиле.
     */
    public hide(): void {
        this.set(HIDDEN_KEY, this.hidden);
    }

    /**
     * Читает флаг из localStorage.
     *
     * @param key Ключ.
     */
    private read(key: string): boolean {
        return this.isBrowser && this.storage.getItem<boolean>(key) === true;
    }

    /**
     * Ставит флаг и запоминает его.
     *
     * @param key Ключ.
     * @param state Сигнал флага.
     */
    private set(key: string, state: WritableSignal<boolean>): void {
        if (state()) {
            return;
        }

        state.set(true);
        this.storage.setItem(key, true);
    }
}
