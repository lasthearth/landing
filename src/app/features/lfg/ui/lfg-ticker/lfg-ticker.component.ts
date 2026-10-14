import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LfgApiService, LfgPost } from '@entities/lfg';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

/**
 * Тихая строка «Ищут компанию» в ленте главной.
 *
 * Показывает одно объявление — ближайший выход или свежий поиск напарника —
 * и сколько ещё открыто. Без открытых объявлений (или если API молчит)
 * не выводится вовсе: это подсказка, а не блок, который должен быть всегда.
 *
 * Грузится только в браузере: главная предсобирается при сборке, и запрос
 * на сервере запёк бы в неё объявления на момент выкладки.
 */
@Component({
    standalone: true,
    selector: 'app-lfg-ticker',
    imports: [RouterLink, TuiIcon, TranslatePipe],
    templateUrl: './lfg-ticker.component.html',
    styleUrl: './lfg-ticker.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LfgTickerComponent {
    private readonly api = inject(LfgApiService);
    private readonly i18n = inject(I18nService);

    /**
     * Открытые объявления обоих видов; `[]` — нет или ошибка.
     */
    private readonly posts = toSignal(
        isPlatformBrowser(inject(PLATFORM_ID)) ? this.load() : of<LfgPost[]>([]),
        { initialValue: [] as LfgPost[] }
    );

    /**
     * Загружает объявления обоих видов и оставляет открытые.
     *
     * @returns Observable со списком; при ошибке — пустой.
     */
    private load(): Observable<LfgPost[]> {
        return forkJoin([this.api.list('POST_KIND_SESSION'), this.api.list('POST_KIND_TEAMMATE')]).pipe(
            map(([sessions, teammates]) => [...sessions, ...teammates].filter((post) => this.isOpen(post))),
            catchError(() => of<LfgPost[]>([]))
        );
    }

    /**
     * Объявление в строке: ближайший выход, иначе самый свежий поиск напарника.
     */
    protected readonly featured = computed<LfgPost | null>(() => {
        const posts = this.posts();
        const now = Date.now();

        const sessions = posts
            .filter((post) => post.kind === 'POST_KIND_SESSION' && post.startsAt && post.startsAt.getTime() > now)
            .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime());

        if (sessions.length) {
            return sessions[0];
        }

        return [...posts].sort((a, b) => b.bumpedAt.getTime() - a.bumpedAt.getTime())[0] ?? null;
    });

    /**
     * Сколько ещё открытых объявлений, кроме показанного.
     */
    protected readonly more = computed(() => Math.max(0, this.posts().length - 1));

    /**
     * Подпись времени: «сегодня в 20:00», «завтра в 18:30», «16 окт., 19:00»;
     * для поиска напарника — «ищет напарника».
     */
    protected readonly when = computed(() => {
        const post = this.featured();

        if (!post) {
            return '';
        }

        if (post.kind !== 'POST_KIND_SESSION' || !post.startsAt) {
            return this.i18n.translate('home.lfg.teammate');
        }

        const locale = this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU';
        const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(post.startsAt);
        const day = this.dayOffset(post.startsAt);

        if (day === 0) {
            return this.i18n.translate('home.lfg.today', { time });
        }

        if (day === 1) {
            return this.i18n.translate('home.lfg.tomorrow', { time });
        }

        const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(post.startsAt);
        return `${date}, ${time}`;
    });

    /**
     * Объявление ещё ждёт откликов: не закрыто и не истекло.
     *
     * @param post Объявление.
     * @returns `true`, если показывать.
     */
    private isOpen(post: LfgPost): boolean {
        return !post.closed && post.expiresAt.getTime() > Date.now();
    }

    /**
     * Через сколько календарных дней дата: 0 — сегодня, 1 — завтра.
     *
     * @param date Дата.
     * @returns Разница в днях по местному времени.
     */
    private dayOffset(date: Date): number {
        const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
        return Math.round((start(date) - start(new Date())) / 86_400_000);
    }
}
