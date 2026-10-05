import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, forkJoin, map, Observable, of, startWith, switchMap, tap } from 'rxjs';
import {
    getDiplomacyTone,
    getOwnerIds,
    getSettlementDisplayName,
    getSettlementTier,
    getSettlementTypeByKey,
    getSettlementTypeIcon,
    getSettlementTypeTone,
    isGuildSettlement,
    ISettlement,
    SettlementBadgeComponent,
    SettlementBadgeTone,
    SettlementDisplayNamePipe,
    SettlementService,
} from '@entities/settlement';
import { IPlayer, PlayerChipComponent, UserService } from '@entities/user';
import { SettlementTagComponent, SettlementTagStore } from '@entities/settlement-tag';
import { SeoService } from '@core/services/seo.service';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button';
import { ImageViewerComponent, ImageViewerItem } from '@shared/ui/image-viewer';
import { SettlementDetailSkeletonComponent } from '@shared/ui/skeletons';
import { JoinRequestButtonComponent, MyJoinRequestsStore } from '../join-request';
import { SettlementPageState } from './settlement-page-state';

/**
 * Адрес сайта для канонических ссылок.
 */
const SITE_URL = 'https://lasthearth.ru';

/**
 * Поселение наместника: закреплено и подписывается особым типом.
 */
const PINNED_SETTLEMENT_NAME = 'Поместье Эренхольд';

/**
 * Сколько других поселений показывать внизу.
 */
const OTHERS_COUNT = 3;

/**
 * Публичная страница поселения: `/settlements/:id`.
 *
 * Заменяет диалог «Подробнее»: у поселения появляется своя ссылка, которой
 * глава может поделиться при наборе жителей, и страница для поисковиков.
 * Координаты поселения намеренно не выводятся.
 */
@Component({
    standalone: true,
    selector: 'app-settlement-page',
    imports: [
        RouterLink,
        TuiIcon,
        TranslatePipe,
        SettlementBadgeComponent,
        SettlementDisplayNamePipe,
        SettlementTagComponent,
        PlayerChipComponent,
        ImageLoaderComponent,
        RelativeTimeComponent,
        ShareButtonComponent,
        ImageViewerComponent,
        SettlementDetailSkeletonComponent,
        JoinRequestButtonComponent,
    ],
    templateUrl: './settlement-page.component.html',
    styleUrl: './settlement-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly settlementService = inject(SettlementService);
    private readonly userService = inject(UserService);
    private readonly seo = inject(SeoService);
    private readonly i18n = inject(I18nService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Хранилище тегов (для бейджей тегов).
     */
    protected readonly tagStore = inject(SettlementTagStore);

    /**
     * Индекс открытого скриншота или null.
     */
    protected readonly viewerIndex = signal<number | null>(null);

    /**
     * Шкала уровня.
     */
    protected readonly tierScale = [1, 2, 3, 4, 5];

    /**
     * Состояние страницы.
     */
    protected readonly state = toSignal(
        this.route.paramMap.pipe(
            map((params) => params.get('id') ?? ''),
            tap(() => {
                this.viewerIndex.set(null);

                if (this.isBrowser) {
                    window.scrollTo({ top: 0 });
                }
            }),
            switchMap((id) => this.load(id).pipe(startWith<SettlementPageState>({ status: 'loading' }))),
            tap((state) => this.applySeo(state))
        ),
        { initialValue: { status: 'loading' } as SettlementPageState }
    );

    /**
     * Загруженное поселение или null.
     */
    protected readonly settlement = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.settlement : null;
    });

    /**
     * Жители с профилями.
     */
    private readonly players = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.players : [];
    });

    /**
     * Другие поселения.
     */
    protected readonly others = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.others : [];
    });

    /**
     * Главы поселения.
     */
    protected readonly leaders = computed(() => {
        const settlement = this.settlement();
        const owners = settlement ? getOwnerIds(settlement) : [];
        return this.players().filter((player) => owners.includes(player.user_id));
    });

    /**
     * Остальные жители.
     */
    protected readonly residents = computed(() => {
        const settlement = this.settlement();
        const owners = settlement ? getOwnerIds(settlement) : [];
        return this.players().filter((player) => !owners.includes(player.user_id));
    });

    /**
     * Сколько жителей сейчас в игре.
     */
    protected readonly onlineCount = computed(() => this.players().filter((player) => player.is_online).length);

    /**
     * Скриншоты поселения для просмотрщика.
     */
    protected readonly gallery = computed<ImageViewerItem[]>(() => {
        const settlement = this.settlement();

        if (!settlement) {
            return [];
        }

        return (settlement.attachments ?? [])
            .filter((attachment) => attachment.url)
            .map((attachment) => ({
                src: attachment.url,
                alt: attachment.desc || getSettlementDisplayName(settlement),
                caption: attachment.desc || getSettlementDisplayName(settlement),
            }));
    });

    /**
     * Уровень поселения (0 — без шкалы).
     */
    protected readonly tier = computed(() => {
        const settlement = this.settlement();
        return settlement && !this.isPinned(settlement) ? getSettlementTier(settlement) : 0;
    });

    /**
     * Подпись типа поселения.
     *
     * @param settlement Поселение.
     */
    protected typeLabel(settlement: ISettlement): string {
        if (this.isPinned(settlement)) {
            return 'Поместье наместника';
        }

        if (isGuildSettlement(settlement)) {
            return this.i18n.translate('settlements.types.guild');
        }

        return getSettlementTypeByKey(settlement.type);
    }

    /**
     * Тон бейджа типа.
     *
     * @param settlement Поселение.
     */
    protected typeTone(settlement: ISettlement): SettlementBadgeTone {
        return this.isPinned(settlement) ? 'gold' : getSettlementTypeTone(settlement);
    }

    /**
     * Иконка типа.
     *
     * @param settlement Поселение.
     */
    protected typeIcon(settlement: ISettlement): string {
        return this.isPinned(settlement) ? '@tui.castle' : getSettlementTypeIcon(settlement);
    }

    /**
     * Подпись дипломатического курса.
     *
     * @param settlement Поселение.
     */
    protected diplomacyLabel(settlement: ISettlement): string {
        if (isGuildSettlement(settlement) && settlement.diplomacy === 'Миролюбивый') {
            return this.i18n.translate('settlements.diplomacy.guild');
        }

        return settlement.diplomacy;
    }

    /**
     * Тон бейджа курса.
     *
     * @param settlement Поселение.
     */
    protected diplomacyTone(settlement: ISettlement): SettlementBadgeTone {
        return getDiplomacyTone(settlement.diplomacy);
    }

    /**
     * Переводит unix-секунды из API в миллисекунды.
     *
     * @param value Значение из API.
     */
    protected toMs(value: string | number | null | undefined): number | null {
        const seconds = Number(value);
        return value === null || value === undefined || value === '' || Number.isNaN(seconds) ? null : seconds * 1000;
    }

    /**
     * Обложка поселения.
     *
     * @param settlement Поселение.
     */
    protected cover(settlement: ISettlement): string {
        return settlement.attachments?.[0]?.url || '/landing-carousel/1.webp';
    }

    /**
     * Загружает поселение, профили жителей и список для блока «Другие поселения».
     *
     * @param id Идентификатор поселения.
     */
    private load(id: string): Observable<SettlementPageState> {
        return this.settlementService.getSettlementById(id, true).pipe(
            switchMap((settlement) =>
                forkJoin({
                    players: settlement.members.length
                        ? this.userService
                              .getPlayersBatch$(settlement.members.map((member) => member.user_id))
                              .pipe(catchError(() => of([] as IPlayer[])))
                        : of([] as IPlayer[]),
                    all: this.settlementService.getSettlements().pipe(catchError(() => of([] as ISettlement[]))),
                }).pipe(
                    map(
                        ({ players, all }): SettlementPageState => ({
                            status: 'ready',
                            settlement,
                            players,
                            others: (all ?? [])
                                .filter((item) => item.id !== settlement.id)
                                .sort((a, b) => b.members.length - a.members.length)
                                .slice(0, OTHERS_COUNT),
                        })
                    )
                )
            ),
            catchError(() => of<SettlementPageState>({ status: 'not-found' }))
        );
    }

    /**
     * SEO-теги страницы.
     *
     * @param state Состояние страницы.
     */
    private applySeo(state: SettlementPageState): void {
        if (state.status === 'not-found') {
            this.seo.setSeoTags({
                title: this.i18n.translate('settlements.page.notFoundTitle') + ' — Last Hearth',
                description: this.i18n.translate('settlements.page.notFoundText'),
                keywords: '',
                robots: 'noindex, follow',
            });
            return;
        }

        if (state.status !== 'ready') {
            return;
        }

        const { settlement } = state;
        const name = getSettlementDisplayName(settlement);
        const text = (settlement.description ?? '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const description =
            text.length > 160
                ? `${text.slice(0, 157)}...`
                : text || `${this.typeLabel(settlement)} ${name} на ролевом сервере Last Hearth (Vintage Story).`;

        this.seo.setSeoTags({
            title: `${name} — ${this.typeLabel(settlement)} на сервере Last Hearth`,
            description,
            keywords: '',
            robots: 'index, follow, max-image-preview:large',
            url: `${SITE_URL}/settlements/${settlement.id}`,
            type: 'website',
            locale: 'ru_RU',
            siteName: 'Last Hearth — ролевой сервер Vintage Story',
            image: settlement.attachments?.[0]?.url || `${SITE_URL}/og-image.jpg`,
            imageAlt: name,
        });
    }

    /**
     * Поселение наместника.
     *
     * @param settlement Поселение.
     */
    private isPinned(settlement: ISettlement): boolean {
        return getSettlementDisplayName(settlement) === PINNED_SETTLEMENT_NAME;
    }

    public constructor() {
        this.tagStore.loadTags$().subscribe();
        inject(MyJoinRequestsStore).load();
    }
}
