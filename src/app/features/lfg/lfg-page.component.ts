import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import {
    LFG_ACTIVITIES,
    LFG_KINDS,
    LFG_PLAY_TIMES,
    LfgActivity,
    LfgApiService,
    LfgKind,
    LfgPlayTime,
    LfgPost,
} from '@entities/lfg';
import { IPlayer, UserService } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, EMPTY, filter, fromEvent, map, of, startWith, switchMap, timer } from 'rxjs';
import { LfgPostCardComponent, LfgViewer } from './ui/lfg-post-card/lfg-post-card.component';
import { LfgPostFormComponent } from './ui/lfg-post-form/lfg-post-form.component';
import { LfgTeammateCardComponent } from './ui/lfg-teammate-card/lfg-teammate-card.component';

/**
 * Как часто обновлять доску, пока вкладка открыта (мс).
 */
const REFRESH_MS = 60_000;

/**
 * Вкладка в адресе: `?tab=session` — походы, иначе поиск напарника.
 */
const TAB_PARAM = 'tab';

/**
 * Доска «Ищу компанию» с двумя вкладками: поиск постоянного напарника (главная,
 * открывается первой) и разовые походы «иду в шахту через 20 минут, нужен ещё
 * один». Фильтры по занятию, у напарников — ещё по времени игры.
 *
 * Ссылка `/lfg?tab=…#post-<id>` открывает вкладку, прокручивает к объявлению
 * и подсвечивает его.
 */
@Component({
    selector: 'app-lfg-page',
    templateUrl: './lfg-page.component.html',
    styleUrl: './lfg-page.component.less',
    imports: [
        PageHeaderComponent,
        TuiIcon,
        TranslatePipe,
        LfgPostCardComponent,
        LfgTeammateCardComponent,
        LfgPostFormComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LfgPageComponent {
    private readonly api = inject(LfgApiService);
    private readonly userService = inject(UserService);
    private readonly status = inject(RequestStatusService);
    private readonly confirm = inject(ConfirmDialogService);
    private readonly i18n = inject(I18nService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    protected readonly activities = LFG_ACTIVITIES;
    protected readonly kinds = LFG_KINDS;
    protected readonly playTimes = LFG_PLAY_TIMES;

    /**
     * Открытая вкладка.
     */
    protected readonly kind = signal<LfgKind>(
        this.route.snapshot.queryParamMap.get(TAB_PARAM) === 'session' ? 'POST_KIND_SESSION' : 'POST_KIND_TEAMMATE'
    );

    protected readonly teammate = computed(() => this.kind() === 'POST_KIND_TEAMMATE');

    /**
     * Объявления (`null` — ещё не загружены).
     */
    protected readonly posts = signal<LfgPost[] | null>(null);

    /**
     * Ошибка загрузки.
     */
    protected readonly error = signal(false);

    /**
     * Выбранное занятие (`null` — все).
     */
    protected readonly activity = signal<LfgActivity | null>(null);

    /**
     * Выбранное время игры у напарников (`null` — любое).
     */
    protected readonly playTime = signal<LfgPlayTime | null>(null);

    /**
     * Открыта ли форма нового объявления.
     */
    protected readonly creating = signal(false);

    /**
     * Объявление, по которому идёт запрос.
     */
    protected readonly busyId = signal<string | null>(null);

    /**
     * Объявление из ссылки.
     */
    protected readonly targetId = signal<string | null>(null);

    /**
     * Игроки по идентификатору.
     */
    protected readonly players = signal<Record<string, IPlayer>>({});

    /**
     * Вошёл ли пользователь.
     */
    private readonly authed = toSignal(this.userService.authState$, { initialValue: false });

    /**
     * Кто смотрит: гость, игрок без проверки или игрок.
     */
    protected readonly viewer = computed((): LfgViewer => {
        if (!this.authed()) {
            return { userId: null, verified: false };
        }
        const roles = this.userService.roles;
        return { userId: this.userService.userId, verified: roles.includes('player') || roles.includes('admin') };
    });

    /**
     * Объявления выбранного занятия.
     */
    protected readonly shown = computed(() => {
        const activity = this.activity();
        const time = this.teammate() ? this.playTime() : null;
        return (this.posts() ?? []).filter(
            (post) =>
                (!activity || post.activities.includes(activity)) &&
                // Кто не указал время, играет когда угодно — подходит под любой фильтр.
                (!time || post.playTimes.length === 0 || post.playTimes.includes(time))
        );
    });

    /**
     * Сколько объявлений у каждого занятия (для подписей фильтра).
     */
    protected readonly counts = computed(() => {
        const counts: Partial<Record<LfgActivity, number>> = {};
        for (const post of this.posts() ?? []) {
            for (const activity of post.activities) {
                counts[activity] = (counts[activity] ?? 0) + 1;
            }
        }
        return counts;
    });

    /**
     * Есть ли у игрока открытый поиск напарника (он может быть только один).
     */
    protected readonly hasOwnMatePost = computed(
        () => this.teammate() && !!this.posts()?.some((post) => post.authorId === this.viewer().userId)
    );

    public constructor() {
        if (!this.isBrowser) {
            return;
        }

        const fragment = this.route.snapshot.fragment;
        this.targetId.set(fragment?.startsWith('post-') ? fragment.slice('post-'.length) : null);

        // Доска живая: пока вкладка видна, обновляем её раз в минуту.
        fromEvent(document, 'visibilitychange')
            .pipe(
                startWith(null),
                map(() => document.visibilityState === 'visible'),
                switchMap((visible) => (visible ? timer(0, REFRESH_MS) : EMPTY)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.load());
    }

    /**
     * Переключает вкладку и запоминает её в адресе.
     *
     * @param kind Вид объявлений.
     */
    protected selectKind(kind: LfgKind): void {
        if (kind === this.kind()) {
            return;
        }
        this.kind.set(kind);
        this.posts.set(null);
        this.error.set(false);
        this.creating.set(false);
        this.activity.set(null);
        this.playTime.set(null);
        this.targetId.set(null);
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { [TAB_PARAM]: kind === 'POST_KIND_SESSION' ? 'session' : null },
            replaceUrl: true,
        });
        this.load();
    }

    /**
     * Загружает объявления открытой вкладки заново.
     */
    protected load(): void {
        const kind = this.kind();
        this.api
            .list(kind)
            .pipe(
                catchError(() => {
                    if (this.posts() === null) {
                        this.error.set(true);
                    }
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((posts) => {
                // Пока шёл запрос, вкладку могли сменить.
                if (!posts || kind !== this.kind()) {
                    return;
                }
                this.error.set(false);
                this.posts.set(posts);
                this.loadPlayers(posts);
                this.scrollToTarget();
            });
    }

    /**
     * Открывает форму или предлагает войти.
     */
    protected create(): void {
        if (!this.viewer().userId) {
            this.userService.signIn();
            return;
        }
        this.creating.set(true);
    }

    /**
     * Объявление опубликовано: показываем его первым и подсвечиваем.
     *
     * @param post Объявление.
     */
    protected onCreated(post: LfgPost): void {
        this.creating.set(false);
        this.status.showSuccess(this.i18n.translate('lfg.toast.created'));
        this.targetId.set(post.id);
        this.replace(post);
        this.load();
    }

    /**
     * Публикация не удалась.
     *
     * @param key Ключ перевода причины.
     */
    protected onFailed(key: string): void {
        this.status.showError(this.i18n.translate(key));
    }

    /**
     * Присоединяется к компании или выходит из неё.
     *
     * @param post Объявление.
     */
    protected respond(post: LfgPost): void {
        this.busyId.set(post.id);
        this.api.respond(post.id).subscribe({
            next: ({ joined, post: updated }) => {
                this.busyId.set(null);
                this.replace(updated);
                this.loadPlayers([updated]);
                const mate = updated.kind === 'POST_KIND_TEAMMATE';
                const key = joined
                    ? mate
                        ? 'lfg.toast.interested'
                        : 'lfg.toast.joined'
                    : mate
                      ? 'lfg.toast.uninterested'
                      : 'lfg.toast.left';
                this.status.showSuccess(this.i18n.translate(key));
            },
            error: (error: unknown) => {
                this.busyId.set(null);
                this.status.showError(this.i18n.translate(this.errorKey(error)));
                this.load();
            },
        });
    }

    /**
     * Закрывает своё объявление после подтверждения.
     *
     * @param post Объявление.
     */
    protected close(post: LfgPost): void {
        this.confirm
            .open({
                title: this.i18n.translate('lfg.card.closeTitle'),
                text: this.i18n.translate('lfg.card.closeText', { title: post.title }),
            })
            .pipe(
                filter(Boolean),
                switchMap(() => {
                    this.busyId.set(post.id);
                    return this.api.close(post.id);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.busyId.set(null);
                    this.posts.update((posts) => posts?.filter((item) => item.id !== post.id) ?? null);
                    this.status.showSuccess(this.i18n.translate('lfg.toast.closed'));
                },
                error: (error: unknown) => {
                    this.busyId.set(null);
                    this.status.showError(this.i18n.translate(this.errorKey(error)));
                },
            });
    }

    /**
     * Продлевает свой поиск напарника на 14 дней и поднимает его наверх.
     *
     * @param post Объявление.
     */
    protected renew(post: LfgPost): void {
        this.busyId.set(post.id);
        this.api.renew(post.id).subscribe({
            next: (updated) => {
                this.busyId.set(null);
                this.posts.update((posts) => posts && [updated, ...posts.filter((item) => item.id !== updated.id)]);
                this.status.showSuccess(this.i18n.translate('lfg.toast.renewed'));
            },
            error: (error: unknown) => {
                this.busyId.set(null);
                const tooSoon =
                    error instanceof HttpErrorResponse && String(error.error?.message ?? '').includes('renewed');
                this.status.showError(this.i18n.translate(tooSoon ? 'lfg.toast.renewTooSoon' : this.errorKey(error)));
            },
        });
    }

    /**
     * Вход для гостя.
     */
    protected signIn(): void {
        this.userService.signIn();
    }

    /**
     * Ставит обновлённое объявление на место (или первым, если его не было).
     *
     * @param post Объявление.
     */
    private replace(post: LfgPost): void {
        this.posts.update((posts) => {
            const list = posts ?? [];
            const index = list.findIndex((item) => item.id === post.id);
            if (index === -1) {
                return [post, ...list];
            }
            const next = [...list];
            next[index] = post;
            return next;
        });
    }

    /**
     * Догружает ники авторов и откликнувшихся, которых ещё нет.
     *
     * @param posts Объявления.
     */
    private loadPlayers(posts: LfgPost[]): void {
        const known = this.players();
        const ids = [...new Set(posts.flatMap((post) => [post.authorId, ...post.responders]))].filter(
            (id) => !known[id]
        );
        if (!ids.length) {
            return;
        }

        this.userService
            .getPlayersBatch$(ids)
            .pipe(
                catchError(() => of([] as IPlayer[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((players) =>
                this.players.update((current) => ({
                    ...current,
                    ...Object.fromEntries(players.filter(Boolean).map((player) => [player.user_id, player])),
                }))
            );
    }

    /**
     * Ключ перевода ошибки запроса.
     *
     * @param error Ошибка.
     * @returns Ключ перевода.
     */
    private errorKey(error: unknown): string {
        if (!(error instanceof HttpErrorResponse)) {
            return 'lfg.toast.error';
        }
        const message = String(error.error?.message ?? '');
        if (message.includes('slots')) {
            return 'lfg.toast.full';
        }
        return error.status === 412 || error.status === 400 || error.status === 404
            ? 'lfg.toast.gone'
            : 'lfg.toast.error';
    }

    /**
     * Прокручивает к объявлению из ссылки после отрисовки.
     */
    private scrollToTarget(): void {
        const target = this.targetId();
        if (!target) {
            return;
        }
        setTimeout(() =>
            document.getElementById(`post-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        );
    }
}
