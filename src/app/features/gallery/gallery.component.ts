import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LocalStorageService } from '@core/services/local-storage.service';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { formatShortDate } from '@shared/lib/relative-time';
import { ImageViewerComponent, ImageViewerItem } from '@shared/ui/image-viewer';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { RevealDirective } from '@shared/lib/directives';
import {
    DiscordGalleryImage,
    DiscordGalleryService,
} from '@shared/lib/discord-gallery/discord-gallery.service';
import { buildThumbUrl } from '@shared/lib/discord-gallery/discord-thumb-url.function';
import { readShotCaption } from '@shared/lib/discord-gallery/read-shot-caption.function';
import {
    ArchiveFactsSnapshot,
    readArchiveFacts,
    toFactsSnapshot,
    withFactsSnapshot,
} from './lib/archive-facts.function';
import { readShotFit, ShotFit } from './lib/read-shot-fit.function';
import { nextShotStage, readShotSrc, ShotStage } from './lib/shot-source.function';

/**
 * Сколько кадров стена показывает до первого шага «дальше».
 *
 * Число кратно 60 не случайно: ритм стены задан циклом из десяти отпечатков
 * на десктопе и из трёх на планшете, а 60 делится на оба. Поэтому стена
 * всегда кончается полным рядом, и справа перед циферблатом не остаётся дыры.
 */
const INITIAL_COUNT = 60;

/**
 * Ключ снимка фактов об архиве в localStorage.
 */
const FACTS_SNAPSHOT_KEY = 'lh_gallery_facts';

/**
 * Время жизни снимка фактов.
 *
 * Архив растёт примерно на два кадра в день, поэтому за шесть часов числа
 * расходятся с правдой на единицы, а страница показывает их сразу, не дожидаясь
 * конца архива. Живой пересчёт заменяет снимок, как только архив дочитан.
 */
const FACTS_SNAPSHOT_TTL = 6 * 60 * 60 * 1000;

/**
 * Сколько кадров добавляет один шаг.
 *
 * Шаг равен первому экрану стены и кратен длине её ритма, поэтому дописанный
 * кусок всегда заканчивается полным рядом. За один клик стена проходит
 * примерно полтора месяца архива, и циферблат успевает назвать новую дату.
 */
const STEP = 60;

/**
 * Сколько авторов попадает в список самых активных.
 */
const TOP_AUTHORS = 10;

/**
 * Сколько первых отпечатков стены грузятся сразу, а не по мере прокрутки.
 *
 * Первый ряд виден сразу под свежим кадром, а `loading="lazy"` откладывает
 * запрос до приближения к экрану: на медленной сети посетитель увидел бы
 * на месте ряда пустые тёмные рамы. Остальные кадры остаются ленивыми —
 * шаг стены весит около 2 МБ копий, и тянуть их все сразу незачем.
 */
const EAGER_COUNT = 6;

/**
 * Ширина копии для отпечатка стены, px.
 *
 * Обычный отпечаток на десктопе — около 373 px, поэтому 800 px закрывают
 * экраны с плотностью пикселей 2. Крупная пластина ритма доходит до 771 px:
 * на единице её хватает, а плотнее двух её на стене одна из десяти, поэтому
 * запас на все кадры стоил бы лишнего мегабайта на шаг. Оригинал кадра весит
 * 1.6 МБ, копия — около 50 КБ.
 */
const WALL_THUMB_WIDTH = 800;

/**
 * Ширина копии для свежего кадра на первом экране, px.
 */
const HERO_THUMB_WIDTH = 1200;

/**
 * Ширина копии для полноэкранного просмотрщика, px.
 */
const VIEWER_THUMB_WIDTH = 1600;

/**
 * Отпечаток стены: кадр архива вместе с адресом копии и подписью.
 */
interface GalleryTile {
    /**
     * Кадр архива.
     */
    image: DiscordGalleryImage;

    /**
     * Как вписать кадр в раму 16:9.
     */
    fit: ShotFit;

    /**
     * Грузить копию сразу, а не по мере прокрутки.
     */
    eager: boolean;

    /**
     * Адрес копии или `null`, когда кадр не открылся и показывается заглушка.
     */
    src: string | null;

    /**
     * Доступное имя кадра: подпись игрока либо автор и дата.
     */
    alt: string;

    /**
     * Подпись игрока в кавычках или пустая строка, если вместо неё имя файла.
     *
     * Пустая строка, а не `null`: место под подпись занято у всех отпечатков,
     * поэтому ряды стены выровнены и не идут лестницей.
     */
    note: string;
}

/**
 * Состояние циферблата архива под стеной.
 */
type DialState = 'hidden' | 'more' | 'loading' | 'end';

/**
 * Число отпечатков в скелетоне — один полный цикл ритма стены (четыре ряда).
 *
 * Число фиксированное, а не случайное: скелетон рисуется и в пререндере,
 * а расхождение с клиентом сломало бы гидратацию.
 */
const SKELETON_COUNT = 10;

/**
 * Страница архива скриншотов канала Last Hearth.
 *
 * Архив растёт с июля 2025 и не обрывается, поэтому страница устроена
 * как лента времени, по которой идут назад: свежий кадр крупно на первом
 * экране, затем стена всех кадров и циферблат, который называет дату,
 * до которой дошёл посетитель. Каждый кадр открывается в полноэкранном
 * просмотрщике и имеет собственную ссылку `/gallery#<id>`.
 */
@Component({
    selector: 'app-gallery',
    standalone: true,
    imports: [
        EmptyStateComponent,
        PageHeaderComponent,
        TuiIcon,
        TranslatePipe,
        RelativeTimeComponent,
        ImageViewerComponent,
        RevealDirective,
    ],
    templateUrl: './gallery.component.html',
    styleUrl: './gallery.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryComponent {
    /**
     * Сервис архива скриншотов.
     */
    private readonly galleryService = inject(DiscordGalleryService);

    /**
     * Ссылка на уничтожение компонента: снимает подписку на поток архива.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Адрес страницы — обновляет `#<id>` открытого кадра.
     */
    private readonly location = inject(Location);

    /**
     * Роут страницы: из него берётся `#<id>` для глубокой ссылки.
     */
    private readonly route = inject(ActivatedRoute);

    /**
     * Переводы и текущий язык.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Локальное хранилище — снимок фактов об архиве между визитами.
     */
    private readonly localStorage = inject(LocalStorageService);

    /**
     * Id кадра из глубокой ссылки, который ещё не открыт.
     */
    private pendingFragmentId: string | null = null;

    /**
     * Посетитель уже сам открывал или закрывал просмотрщик.
     *
     * После этого глубокая ссылка не применяется: без флага кадр,
     * закрытый посетителем, открылся бы заново, когда доедет
     * следующая страница архива.
     */
    private fragmentResolved = false;

    /**
     * Первая страница уже положена в localStorage.
     */
    private cacheSaved = false;

    /**
     * Загруженные кадры архива.
     */
    private readonly images = signal<DiscordGalleryImage[]>([]);

    /**
     * Идёт первая загрузка.
     */
    protected readonly isLoading = signal(true);

    /**
     * Поток архива завершился ошибкой.
     */
    protected readonly hasError = signal(false);

    /**
     * Архив дочитан до конца: больше страниц нет.
     */
    protected readonly archiveComplete = signal(false);

    /**
     * Сколько кадров стена показывает сейчас.
     */
    protected readonly visibleCount = signal(INITIAL_COUNT);

    /**
     * Индекс кадра, открытого в просмотрщике, или null.
     */
    protected readonly viewerIndex = signal<number | null>(null);

    /**
     * Индексы отпечатков скелетона.
     */
    protected readonly skeletons = Array.from({ length: SKELETON_COUNT }, (_, index) => index);

    /**
     * Стадии адресов кадров, которые не открылись.
     *
     * Ключ — id кадра. Пустая запись означает обычную стадию `thumb`,
     * поэтому в сигнал попадают только сбои, а не весь архив.
     */
    private readonly shotStages = signal<Record<string, ShotStage>>({});

    /**
     * Кадры от новых к старым.
     *
     * Сортировка своя, а не «как пришло»: порядок страниц решает бэкенд,
     * а стена и просмотрщик обязаны идти от свежего к первому.
     */
    protected readonly sorted = computed(() =>
        [...this.images()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    );

    /**
     * Снимок фактов прошлого полного прохода, если он не устарел.
     */
    private readonly factsSnapshot = signal<ArchiveFactsSnapshot | null>(null);

    /**
     * Архив дочитан или дочитать его не удалось: живой пересчёт окончательный.
     */
    private readonly archiveSettled = computed(() => this.archiveComplete() || this.hasError());

    /**
     * Факты об архиве: числа, которые страница показывает как есть.
     *
     * До конца архива числа подставляются из снимка прошлого полного прохода:
     * иначе «200 кадров» через секунду превратились бы в 300, а раздел стоял бы
     * пустым все двадцать секунд, пока страницы дочитываются.
     */
    protected readonly facts = computed(() => {
        const live = readArchiveFacts(this.sorted(), TOP_AUTHORS);

        return this.archiveSettled() ? live : withFactsSnapshot(live, this.factsSnapshot());
    });

    /**
     * Плитка свежего кадра — самого нового скриншота архива.
     */
    protected readonly heroTile = computed<GalleryTile | null>(() => {
        const image = this.sorted()[0];

        return image ? this.buildTile(image, HERO_THUMB_WIDTH) : null;
    });

    /**
     * Плитки стены: всё, что посетитель уже развернул, кроме свежего кадра.
     */
    protected readonly tiles = computed<GalleryTile[]>(() =>
        this.sorted()
            .slice(1, 1 + this.visibleCount())
            .map((image, index) => this.buildTile(image, WALL_THUMB_WIDTH, index < EAGER_COUNT))
    );

    /**
     * Сколько кадров стена показывает сейчас.
     */
    protected readonly shownCount = computed(() => this.tiles().length);

    /**
     * Сколько кадров архива ещё не показано на стене.
     */
    protected readonly hiddenCount = computed(() => Math.max(0, this.sorted().length - 1 - this.visibleCount()));

    /**
     * Сколько кадров добавит следующий шаг.
     */
    protected readonly stepCount = computed(() => Math.min(STEP, this.hiddenCount()));


    /**
     * Состояние циферблата под стеной.
     */
    protected readonly dialState = computed<DialState>(() => {
        if (this.isLoading() || this.sorted().length < 2) {
            return 'hidden';
        }

        if (this.hiddenCount() > 0) {
            return 'more';
        }

        return this.archiveComplete() ? 'end' : 'loading';
    });


    /**
     * Дата, до которой стена дошла сейчас.
     */
    protected readonly reachedDate = computed(() => this.dateAt(this.visibleCount()));

    /**
     * Дата, до которой доведёт следующий шаг.
     */
    protected readonly nextDate = computed(() => this.dateAt(this.visibleCount() + STEP));

    /**
     * Дата первого кадра архива.
     *
     * Живой `firstShot` известен только к концу архива; дата из снимка
     * появляется сразу и совпадает с ней: первый кадр не меняется.
     */
    protected readonly firstDate = computed(() => {
        const iso = this.facts().firstShot?.timestamp ?? this.factsSnapshot()?.firstShotDate ?? null;

        return iso ? formatShortDate(iso, this.i18n.language()) : '';
    });



    /**
     * Кадры для просмотрщика — весь архив, чтобы стрелки прошли его целиком.
     */
    protected readonly viewerItems = computed<ImageViewerItem[]>(() =>
        this.sorted().map((image) => {
            const caption = readShotCaption(image.alt);

            return {
                src: buildThumbUrl(image, VIEWER_THUMB_WIDTH),
                originalSrc: image.url,
                alt: this.buildAlt(image, caption),
                caption: image.author,
                note: caption ?? undefined,
                date: image.timestamp,
                shareUrl: `/gallery#${encodeURIComponent(image.id)}`,
            };
        })
    );

    /**
     * Снимок фактов кладётся в localStorage, когда архив дочитан до конца,
     * и читается при следующем визите: числа страницы верны сразу, а не после
     * двадцати секунд чтения страниц.
     */
    private readonly saveFactsSnapshot = effect(() => {
        if (!this.archiveComplete() || !this.isBrowser) {
            return;
        }

        this.localStorage.setItem(FACTS_SNAPSHOT_KEY, {
            savedAt: Date.now(),
            snapshot: toFactsSnapshot(readArchiveFacts(this.sorted(), TOP_AUTHORS)),
        });
    });

    public constructor() {
        const fragment = this.route.snapshot.fragment;

        this.pendingFragmentId = fragment ? decodeURIComponent(fragment) : null;
        this.factsSnapshot.set(this.readFactsSnapshot());
        this.loadArchive();
    }

    /**
     * Читает снимок фактов из localStorage, если он не устарел.
     *
     * @returns Снимок или `null`.
     */
    private readFactsSnapshot(): ArchiveFactsSnapshot | null {
        const record = this.localStorage.getItem<{ savedAt: number; snapshot: ArchiveFactsSnapshot }>(
            FACTS_SNAPSHOT_KEY
        );

        if (!record || Date.now() - record.savedAt > FACTS_SNAPSHOT_TTL || !record.snapshot) {
            return null;
        }

        return record.snapshot;
    }

    /**
     * Показывает на стене следующую порцию кадров.
     */
    protected showMore(): void {
        this.visibleCount.update((count) => count + STEP);
    }

    /**
     * Открывает кадр в просмотрщике.
     *
     * Ищет по id, а не по ссылке на объект: список кадров заменяется
     * целиком, когда доезжает следующая страница архива, и поиск по
     * ссылке вернул бы -1 — просмотрщик открылся бы пустым и заблокировал
     * прокрутку страницы.
     *
     * @param image Кадр архива.
     */
    protected open(image: DiscordGalleryImage): void {
        this.fragmentResolved = true;
        this.pendingFragmentId = null;

        const index = this.sorted().findIndex((item) => item.id === image.id);

        if (index >= 0) {
            this.setViewerIndex(index);
        }
    }

    /**
     * Меняет открытый кадр и адрес страницы (`#<id>`), чтобы ссылкой можно было поделиться.
     *
     * @param index Индекс кадра или null — закрыть.
     */
    protected setViewerIndex(index: number | null): void {
        this.fragmentResolved = true;

        if (index === null) {
            this.pendingFragmentId = null;
        }

        this.viewerIndex.set(index);

        if (!this.isBrowser) {
            return;
        }

        const base = this.location.path();
        const image = index === null ? null : this.sorted()[index];

        this.location.replaceState(image ? `${base}#${encodeURIComponent(image.id)}` : base);
    }

    /**
     * Перезапускает загрузку архива после сбоя.
     */
    protected reload(): void {
        this.images.set([]);
        this.cacheSaved = false;
        this.archiveComplete.set(false);
        this.loadArchive();
    }

    /**
     * Загружает архив: сначала кэш первой страницы, затем поток страниц.
     *
     * На сервере поток пустой и `isLoading` не сбрасывается — в пререндер
     * уходит скелетон, а не сообщение «в канале нет скриншотов», которое
     * было бы неправдой.
     */
    private loadArchive(): void {
        this.isLoading.set(true);
        this.hasError.set(false);

        // Пререндер отдаёт скелетон, а не «в канале нет скриншотов»: на сервере
        // архив не запрашивается, и пустой список здесь означает «ещё не грузили».
        // Адреса картинок Discord подписаны и истекают за сутки, поэтому в
        // собранный однажды HTML они всё равно легли бы мёртвыми.
        if (!this.isBrowser) {
            return;
        }

        const cached = this.galleryService.getCachedImages();

        if (cached && cached.length > 0) {
            this.images.set(cached);
            this.isLoading.set(false);
            this.cacheSaved = true;
            this.resolveFragment();
        }

        this.galleryService
            .getAllImages$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (loaded) => {
                    if (loaded.length > 0) {
                        this.images.set(loaded);

                        if (!this.cacheSaved) {
                            this.cacheSaved = true;
                            this.galleryService.saveCache(loaded);
                        }
                    }

                    this.isLoading.set(false);
                    this.resolveFragment();
                },
                error: () => {
                    this.hasError.set(true);
                    this.isLoading.set(false);
                },
                complete: () => {
                    this.archiveComplete.set(true);
                    this.pendingFragmentId = null;
                },
            });
    }

    /**
     * Открывает кадр из ссылки `/gallery#<id>`, когда его страница доехала.
     *
     * Кадр из конца архива лежит не в первой странице, поэтому поиск
     * повторяется на каждом новом значении потока и прекращается, как
     * только посетитель тронул просмотрщик сам.
     */
    private resolveFragment(): void {
        if (!this.pendingFragmentId || this.fragmentResolved) {
            return;
        }

        const index = this.sorted().findIndex((image) => image.id === this.pendingFragmentId);

        if (index < 0) {
            return;
        }

        this.fragmentResolved = true;
        this.pendingFragmentId = null;
        this.viewerIndex.set(index);
    }

    /**
     * Переводит кадр, который не открылся, на следующую стадию адреса.
     *
     * Копия через медиа-прокси иногда не отдаётся, хотя оригинал кадра
     * доступен: тогда страница просит оригинал. Если не открылся и он,
     * вместо картинки встаёт заглушка. Без неё кадр показывался бы пустым
     * тёмным прямоугольником, который посетитель читает как часть снимка.
     *
     * @param id Id кадра архива.
     */
    protected markShotFailed(id: string): void {
        this.shotStages.update((stages) => ({
            ...stages,
            [id]: nextShotStage(stages[id]),
        }));
    }

    /**
     * Собирает отпечаток из кадра архива.
     *
     * @param image Кадр архива.
     * @param thumbWidth Ширина запрашиваемой копии, px.
     * @param eager Грузить копию сразу, а не по мере прокрутки.
     * @returns Отпечаток с адресом копии, способом вписывания и подписью.
     */
    private buildTile(image: DiscordGalleryImage, thumbWidth: number, eager = false): GalleryTile {
        const caption = readShotCaption(image.alt);

        return {
            image,
            fit: readShotFit(image.width, image.height),
            eager,
            src: readShotSrc(image, thumbWidth, this.shotStages()[image.id] ?? 'thumb'),
            alt: this.buildAlt(image, caption),
            note: caption ? `«${caption}»` : '',
        };
    }

    /**
     * Строит доступное имя кадра.
     *
     * Подпись игрока — лучшее описание, какое у кадра есть. Когда вместо
     * неё имя файла (`image.png`), его заменяют автор и дата: читать
     * вслух `2026-11-02_23-02-08.png` бессмысленно.
     *
     * @param image Кадр архива.
     * @param caption Подпись игрока или `null`.
     * @returns Текст для `alt` и `aria-label`.
     */
    private buildAlt(image: DiscordGalleryImage, caption: string | null): string {
        if (caption) {
            return `${caption} — ${image.author}`;
        }

        return this.i18n.translate('shared.screenshotAlt', {
            author: image.author,
            date: formatShortDate(image.timestamp, this.i18n.language()),
        });
    }

    /**
     * Форматирует дату кадра, до которого дошла стена.
     *
     * @param visibleCount Сколько кадров показано.
     * @returns Дата или пустая строка, если кадра с таким номером ещё нет.
     */
    private dateAt(visibleCount: number): string {
        const list = this.sorted();
        const index = Math.min(list.length - 1, Math.max(0, visibleCount));
        const image = list[index];

        return image ? formatShortDate(image.timestamp, this.i18n.language()) : '';
    }
}
