import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { I18nService, TranslatePipe } from '@core/i18n';
import { environment } from '@core/config/environments/environment';
import {
    ModCompatibility,
    ServerMod,
    ServerModApiService,
    ServerModList,
    fileSize,
    gameBranch,
    modCompatibility,
} from '@entities/server-mod';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { SkeletonComponent } from '@shared/ui/skeletons';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

/**
 * Какие моды показать.
 */
type ModFilter = 'all' | 'required' | 'optional';

/**
 * Состояние загрузки списка.
 */
type ModsState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; list: ServerModList };

/**
 * Мод, подготовленный для карточки: все подписи уже посчитаны.
 */
interface ModCard {
    mod: ServerMod;
    initial: string;
    required: boolean;
    text: string;
    sideKey: string;
    compatibility: ModCompatibility;
    size: string;
}

/**
 * Фильтры в порядке показа.
 */
const FILTERS: readonly ModFilter[] = ['all', 'required', 'optional'];

/**
 * Пути к папке Mods: в разных системах она в разных местах.
 */
const MOD_FOLDERS: readonly { os: string; path: string }[] = [
    { os: 'Windows', path: '%appdata%\\VintagestoryData\\Mods' },
    { os: 'Linux', path: '~/.config/VintagestoryData/Mods' },
    { os: 'macOS', path: '~/Library/Application Support/VintagestoryData/Mods' },
];

/**
 * Страница «Моды сервера» `/mods`.
 *
 * Список ведут модераторы во вкладке «Моды» админки, данные о модах бэкенд
 * берёт с ModDB. Обязательные моды игра скачивает сама, поэтому страница
 * в первую очередь — запасной путь: архив «Скачать всё», кнопка на каждый мод
 * и подсказка, куда класть файлы.
 *
 * Рендерится на сервере по запросу: список меняется без выкладки сайта.
 */
@Component({
    standalone: true,
    selector: 'app-mods-page',
    imports: [PageHeaderComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent, TuiIcon, TranslatePipe],
    templateUrl: './mods-page.component.html',
    styleUrl: './mods-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsPageComponent {
    private readonly api = inject(ServerModApiService);
    private readonly i18n = inject(I18nService);

    /**
     * Признак выполнения в браузере: в буфер обмена пишет только клиент.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Версия игры сервера.
     */
    protected readonly gameVersion = environment.gameVersion;

    /**
     * Фильтры.
     */
    protected readonly filters = FILTERS;

    /**
     * Где искать папку Mods.
     */
    protected readonly folders = MOD_FOLDERS;

    /**
     * Карточки-заглушки на время загрузки.
     */
    protected readonly skeletons = [1, 2, 3, 4];

    /**
     * Повторная загрузка после ошибки.
     */
    private readonly reload$ = new Subject<void>();

    /**
     * Список модов и его состояние.
     */
    protected readonly state = toSignal(
        this.reload$.pipe(
            startWith(undefined),
            switchMap(() =>
                this.api.list().pipe(
                    map((list): ModsState => ({ status: 'ready', list })),
                    catchError(() => of<ModsState>({ status: 'error' })),
                    startWith<ModsState>({ status: 'loading' })
                )
            )
        ),
        { initialValue: { status: 'loading' } as ModsState }
    );

    /**
     * Строка поиска.
     */
    protected readonly query = signal('');

    /**
     * Выбранный фильтр.
     */
    protected readonly filter = signal<ModFilter>('all');

    /**
     * Список уже скопирован (кнопка показывает «Скопировано» 2 секунды).
     */
    protected readonly copied = signal(false);

    /**
     * Все карточки.
     */
    private readonly cards = computed<ModCard[]>(() => {
        const state = this.state();
        return state.status === 'ready' ? state.list.mods.map((mod) => this.toCard(mod)) : [];
    });

    /**
     * Карточки, подходящие под поиск (до фильтра — для счётчиков).
     */
    private readonly searched = computed(() => {
        const query = this.query().trim().toLowerCase();
        return query ? this.cards().filter((card) => card.mod.name.toLowerCase().includes(query)) : this.cards();
    });

    /**
     * Карточки на экране.
     */
    protected readonly visible = computed(() => this.searched().filter((card) => this.matches(card, this.filter())));

    /**
     * Архив обязательных модов.
     */
    protected readonly archive = computed(() => {
        const state = this.state();
        return state.status === 'ready' ? state.list.archive : null;
    });

    /**
     * Подпись размера архива.
     */
    protected readonly archiveSize = computed(() => this.sizeLabel(this.archive()?.size ?? 0));

    /**
     * Дата обновления архива.
     */
    protected readonly archiveDate = computed(() => {
        const date = this.archive()?.updatedAt;
        return date
            ? new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU', {
                  day: 'numeric',
                  month: 'long',
              }).format(date)
            : '';
    });

    /**
     * Модов нет совсем (а не отфильтровали все).
     */
    protected readonly noMods = computed(() => this.state().status === 'ready' && this.cards().length === 0);

    /**
     * Ветка версии игры для подписи «для 1.22.x».
     */
    protected readonly gameBranch = gameBranch(environment.gameVersion);

    /**
     * Сколько модов под фильтром — с учётом поиска.
     *
     * @param filter Фильтр.
     * @returns Количество.
     */
    protected countOf(filter: ModFilter): number {
        return this.searched().filter((card) => this.matches(card, filter)).length;
    }

    /**
     * Выбирает фильтр.
     *
     * @param filter Фильтр.
     */
    protected setFilter(filter: ModFilter): void {
        this.filter.set(filter);
    }

    /**
     * Сбрасывает поиск и фильтр.
     */
    protected reset(): void {
        this.query.set('');
        this.filter.set('all');
    }

    /**
     * Повторяет загрузку после ошибки.
     */
    protected retry(): void {
        this.reload$.next();
    }

    /**
     * Копирует названия и версии видимых модов, по строке на мод.
     */
    protected copyList(): void {
        if (!this.isBrowser) {
            return;
        }

        const text = this.visible()
            .map((card) => `${card.mod.name} — ${card.mod.release?.version ?? ''}`.trim())
            .join('\n');

        void navigator.clipboard?.writeText(text).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        });
    }

    /**
     * Подходит ли карточка под фильтр.
     *
     * @param card Карточка.
     * @param filter Фильтр.
     * @returns `true`, если показывать.
     */
    private matches(card: ModCard, filter: ModFilter): boolean {
        if (filter === 'required') {
            return card.required;
        }

        if (filter === 'optional') {
            return !card.required;
        }

        return true;
    }

    /**
     * Готовит мод к показу.
     *
     * @param mod Мод.
     * @returns Карточка.
     */
    private toCard(mod: ServerMod): ModCard {
        return {
            mod,
            initial: mod.name.charAt(0).toUpperCase(),
            required: mod.audience === 'MOD_AUDIENCE_REQUIRED',
            text: mod.note || mod.summary,
            sideKey: this.sideKey(mod),
            compatibility: modCompatibility(mod.release, this.gameVersion),
            size: this.sizeLabel(mod.release?.fileSize ?? 0),
        };
    }

    /**
     * Ключ подписи «где работает мод».
     *
     * @param mod Мод.
     * @returns Ключ перевода или пустая строка.
     */
    private sideKey(mod: ServerMod): string {
        switch (mod.side) {
            case 'MOD_SIDE_BOTH':
                return 'mods.side.both';
            case 'MOD_SIDE_CLIENT':
                return 'mods.side.client';
            case 'MOD_SIDE_SERVER':
                return 'mods.side.server';
            default:
                return '';
        }
    }

    /**
     * Размер файла словами: «640 КБ», «18 МБ».
     *
     * @param bytes Размер в байтах.
     * @returns Подпись или пустая строка, если размер неизвестен.
     */
    private sizeLabel(bytes: number): string {
        const size = fileSize(bytes);
        return size
            ? this.i18n.translate(`mods.units.${size.unit}`, {
                  value: size.value.toLocaleString(this.i18n.language() === 'en' ? 'en-GB' : 'ru-RU'),
              })
            : '';
    }
}
