import { DOCUMENT, effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { DestroyRef } from '@angular/core';
import { filter } from 'rxjs';
import { ConsentService } from '@core/services/consent.service';
import { AnalyticsGoal } from '@core/types/analytics-goal';

/**
 * Номер счётчика Яндекс.Метрики.
 *
 * Владелец выдаст номер в задаче 010. Пока 0 — сервис не подключает Метрику
 * и не отправляет цели (метод {@link AnalyticsService.goal} при этом безопасен).
 */
const METRIKA_ID = 0;

/**
 * Идентификатор проекта Microsoft Clarity (тот же, что стоял в src/index.html).
 */
const CLARITY_ID = 'u3k2hyqs0a';

/**
 * Адрес скрипта Яндекс.Метрики.
 */
const METRIKA_SCRIPT_URL = 'https://mc.yandex.ru/metrika/tag.js';

/**
 * Адрес скрипта Clarity: полный путь собирается из него и CLARITY_ID.
 */
const CLARITY_SCRIPT_URL = 'https://www.clarity.ms/tag/';

/**
 * Селектор ссылок на Discord.
 *
 * Клик по любой такой ссылке сайта считается целью discord_click: ссылок
 * семь (шапка, подвал, главная, заставка, FAQ, «Начать игру», магазин),
 * и общий слушатель избавляет от обработчика в каждом шаблоне. Тот же селектор
 * использует OnboardingService.
 */
const DISCORD_LINK_SELECTOR = 'a[href*="discord.gg/"], a[href*="discord.com/invite/"]';

/**
 * Функция Метрики.
 */
type Ym = (id: number, method: string, ...args: unknown[]) => void;

/**
 * Заглушка Метрики: копит вызовы в очереди a до загрузки tag.js.
 */
type YmStub = Ym & { a?: unknown[]; l?: number };

/**
 * Функция Clarity.
 */
type Clarity = (...args: unknown[]) => void;

/**
 * Заглушка Clarity: копит вызовы в очереди q до загрузки скрипта.
 */
type ClarityStub = Clarity & { q?: unknown[] };

/**
 * Подключает Яндекс.Метрику и Clarity после согласия на cookies и отправляет цели.
 *
 * Скрипты сторонних сервисов не попадают на страницу ни при пререндере,
 * ни до решения пользователя — только по сигналу {@link ConsentService.analytics}.
 * Цели, отправленные раньше, чем загрузился счётчик (или при не выданном номере
 * счётчика), просто никуда не уходят.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    /**
     * Документ: в него добавляются скрипты счётчиков и слушатель кликов.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Роутер: Метрика при defer: true не видит смену адреса в SPA.
     */
    private readonly router = inject(Router);

    /**
     * Решение пользователя об аналитических cookies.
     */
    private readonly consent = inject(ConsentService);

    /**
     * Ссылка уничтожения на сервис: снимает слушатель кликов.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Согласие получено и счётчики подключены (повторно не грузим).
     */
    private started = false;

    /**
     * Подписывается на согласие и на смену адреса, слушает клики по Discord.
     */
    public constructor() {
        if (!this.isBrowser) {
            return;
        }

        effect(() => {
            if (this.consent.analytics() === true && !this.started) {
                this.started = true;
                this.loadMetrika();
                this.loadClarity();
            }
        });

        // SPA: Метрика при defer: true сама не засчитывает смену URL.
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((event) => {
                this.ym()?.(METRIKA_ID, 'hit', event.urlAfterRedirects, { title: this.document.title });
            });

        const onClick = (event: Event): void => {
            if ((event.target as Element | null)?.closest?.(DISCORD_LINK_SELECTOR)) {
                this.goal('discord_click');
            }
        };

        this.document.addEventListener('click', onClick, true);
        this.destroyRef.onDestroy(() => this.document.removeEventListener('click', onClick, true));
    }

    /**
     * Отправляет достижение цели.
     *
     * @param goal Идентификатор цели (совпадает с настроенным в Метрике).
     * @param params Дополнительные параметры визита.
     */
    public goal(goal: AnalyticsGoal, params?: Record<string, string | number>): void {
        this.ym()?.(METRIKA_ID, 'reachGoal', goal, params);
    }

    /**
     * Функция Метрики, если счётчик загружен.
     *
     * @returns Функция ym или undefined, пока счётчика нет.
     */
    private ym(): Ym | undefined {
        return this.started ? (window as unknown as { ym?: Ym }).ym : undefined;
    }

    /**
     * Вставляет счётчик Метрики (официальный сниппет, без элемента noscript).
     *
     * При METRIKA_ID === 0 не делает ничего: номер счётчика ещё не выдан.
     */
    private loadMetrika(): void {
        if (METRIKA_ID === 0) {
            return;
        }

        const w = window as unknown as { ym?: YmStub };

        if (!w.ym) {
            const stub = ((...args: unknown[]) => {
                (stub.a ??= []).push(args);
            }) as YmStub;

            stub.l = Date.now();
            w.ym = stub;
        }

        this.appendScript(METRIKA_SCRIPT_URL);
        w.ym(METRIKA_ID, 'init', {
            defer: true,
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            // Запись сессий уже делает Clarity: две записи не заказываем.
            webvisor: false,
        });

        // Согласие могли дать уже на открытой странице: первый хит отправляем
        // вручную, дальше его присылает подписка на NavigationEnd.
        if (this.router.navigated) {
            w.ym(METRIKA_ID, 'hit', this.router.url, { title: this.document.title });
        }
    }

    /**
     * Вставляет Clarity.
     */
    private loadClarity(): void {
        const w = window as unknown as { clarity?: ClarityStub };

        if (!w.clarity) {
            const stub = ((...args: unknown[]) => {
                (stub.q ??= []).push(args);
            }) as ClarityStub;

            w.clarity = stub;
        }

        this.appendScript(CLARITY_SCRIPT_URL + CLARITY_ID);
    }

    /**
     * Добавляет async-скрипт в head.
     *
     * @param src Адрес скрипта.
     */
    private appendScript(src: string): void {
        const script = this.document.createElement('script');
        script.async = true;
        script.src = src;
        this.document.head.appendChild(script);
    }
}
