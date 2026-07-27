import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import { DonateService, IPurchase } from '@entities/donate';
import { UserService } from '@entities/user';
import { I18nService } from '@core/i18n';
import { TranslatePipe } from '@core/i18n';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';

/**
 * Размер страницы истории покупок.
 */
const PAGE_SIZE = 20;

/**
 * Срок действия привилегии в миллисекундах (месяц = 30 дней с момента выдачи).
 */
const PRIVILEGE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Компонент панели истории покупок всех игроков в админке.
 *
 * Отображает список покупок (сначала новые) с cursor-пагинацией
 * через кнопку «Загрузить ещё».
 */
@Component({
    selector: 'app-all-purchases-panel',
    standalone: true,
    imports: [TuiIcon, EmptyStateComponent, ErrorStateComponent, TranslatePipe],
    templateUrl: './all-purchases-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllPurchasesPanelComponent implements OnInit {
    /**
     * Сервис донат-магазина.
     */
    private readonly donateService: DonateService = inject(DonateService);

    /**
     * Сервис локализации.
     */
    private readonly i18n: I18nService = inject(I18nService);

    /**
     * Сервис пользователей (резолв ников администраторов по ID).
     */
    private readonly userService: UserService = inject(UserService);

    /**
     * Загруженные покупки.
     */
    protected readonly purchases = signal<IPurchase[]>([]);

    /**
     * Карта ников администраторов по их идентификаторам (`issued_by`).
     */
    protected readonly adminNames = signal<Record<string, string>>({});

    /**
     * Идентификаторы администраторов, для которых уже выполнен batch-запрос.
     */
    private readonly requestedAdminIds = new Set<string>();

    /**
     * Идентификаторы товаров-привилегий (у товара заполнен массив privileges).
     */
    private readonly privilegeItemIds = signal<Set<string>>(new Set());

    /**
     * Признак первоначальной загрузки списка.
     */
    protected readonly loading = signal<boolean>(false);

    /**
     * Признак дозагрузки следующей страницы.
     */
    protected readonly loadingMore = signal<boolean>(false);

    /**
     * Признак ошибки загрузки списка.
     */
    protected readonly error = signal<boolean>(false);

    /**
     * Токен следующей страницы; пустая строка — страниц больше нет.
     */
    protected readonly nextPageToken = signal<string>('');

    /**
     * @inheritdoc
     */
    public ngOnInit(): void {
        this.loadPrivilegeItems();
        this.load();
    }

    /**
     * Повторяет первоначальную загрузку после ошибки.
     */
    protected retry(): void {
        this.load();
    }

    /**
     * Дозагружает следующую страницу покупок.
     */
    protected loadMore(): void {
        this.load(this.nextPageToken());
    }

    /**
     * Возвращает отображаемое имя администратора, выдавшего покупку.
     *
     * @param issuedBy Идентификатор администратора из `issued_by`.
     * @returns Игровой ник или исходный идентификатор, если ник не найден.
     */
    protected adminName(issuedBy: string): string {
        return this.adminNames()[issuedBy] ?? issuedBy;
    }

    /**
     * Проверяет, является ли покупка привилегией.
     *
     * @param purchase Покупка.
     * @returns true, если товар покупки содержит привилегии.
     */
    protected isPrivilege(purchase: IPurchase): boolean {
        return this.privilegeItemIds().has(purchase.itemId);
    }

    /**
     * Проверяет, истекла ли привилегия (прошёл месяц с момента выдачи).
     *
     * Привилегия определяется по товару с заполненным массивом `privileges`.
     * Невыданные (без даты выдачи) и возвращённые покупки не считаются истёкшими.
     *
     * @param purchase Покупка.
     * @returns true, если привилегия просрочена.
     */
    protected isExpiredPrivilege(purchase: IPurchase): boolean {
        if (!this.isPrivilege(purchase) || !purchase.issuedAt) {
            return false;
        }

        if (purchase.status.toUpperCase() === 'REFUNDED') {
            return false;
        }

        return Date.now() - purchase.issuedAt.getTime() >= PRIVILEGE_DURATION_MS;
    }

    /**
     * Возвращает отображаемый статус покупки.
     *
     * Для истёкших привилегий подменяет статус сервера на `EXPIRED`.
     *
     * @param purchase Покупка.
     * @returns Статус для отображения.
     */
    protected displayStatus(purchase: IPurchase): string {
        return this.isExpiredPrivilege(purchase) ? 'EXPIRED' : purchase.status;
    }

    /**
     * Возвращает локализованный текст статуса покупки.
     *
     * @param status Статус для отображения (например, COMPLETED, EXPIRED).
     * @returns Локализованная строка или исходный статус, если перевод не найден.
     */
    protected statusText(status: string): string {
        const key = `admin.purchasesHistory.status.${status.toLowerCase()}`;
        const translated = this.i18n.translate(key);

        return translated === key ? status : translated;
    }

    /**
     * Возвращает CSS-классы бейджа статуса покупки.
     *
     * @param status Статус для отображения.
     * @returns Строка классов для бейджа.
     */
    protected statusBadgeClass(status: string): string {
        switch (status.toUpperCase()) {
            case 'REFUNDED':
            case 'EXPIRED':
                return 'bg-lh-danger/15 text-lh-danger';
            case 'PENDING_ISSUE':
                return 'bg-lh-accent/15 text-lh-accent';
            default:
                return 'bg-[#16a34a]/15 text-[#16a34a]';
        }
    }

    /**
     * Загружает страницу покупок.
     *
     * @param pageToken Токен страницы; без токена — первоначальная загрузка.
     */
    private load(pageToken?: string): void {
        const isInitial = !pageToken;

        if (isInitial) {
            this.loading.set(true);
        } else {
            this.loadingMore.set(true);
        }
        this.error.set(false);

        this.donateService
            .getAllPurchases$(PAGE_SIZE, pageToken)
            .pipe(
                catchError(() => {
                    this.error.set(true);
                    return of(null);
                })
            )
            .subscribe((page) => {
                if (page) {
                    this.purchases.update((list) => (isInitial ? page.purchases : [...list, ...page.purchases]));
                    this.nextPageToken.set(page.nextPageToken);
                    this.resolveAdminNames(page.purchases);
                }

                this.loading.set(false);
                this.loadingMore.set(false);
            });
    }

    /**
     * Загружает товары магазина и запоминает идентификаторы привилегий.
     */
    private loadPrivilegeItems(): void {
        this.donateService
            .getShopItems$()
            .pipe(catchError(() => of([])))
            .subscribe((items) => {
                this.privilegeItemIds.set(
                    new Set(items.filter((item) => item.privileges?.length).map((item) => item.id))
                );
            });
    }

    /**
     * Резолвит ники администраторов по идентификаторам из `issued_by`.
     *
     * @param purchases Загруженная страница покупок.
     */
    private resolveAdminNames(purchases: IPurchase[]): void {
        const missingIds = [
            ...new Set(
                purchases
                    .map((p) => p.issuedBy)
                    .filter((id) => !!id && !this.adminNames()[id] && !this.requestedAdminIds.has(id))
            ),
        ];

        if (missingIds.length === 0) {
            return;
        }

        missingIds.forEach((id) => this.requestedAdminIds.add(id));

        this.userService
            .getPlayersBatch$(missingIds)
            .pipe(catchError(() => of([])))
            .subscribe((players) => {
                this.adminNames.update((names) => ({
                    ...names,
                    ...Object.fromEntries(players.map((p) => [p.user_id, p.user_game_name])),
                }));
            });
    }
}
