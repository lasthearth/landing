import { Component, computed, inject, signal } from '@angular/core';
import { NewsApiService, mapDtoToNews } from '@entities/news';
import { UserService, Role } from '@entities/user';
import { NewsCardComponent } from '../../ui/news-card/news-card.component';
import { TuiPagination } from '@taiga-ui/kit';
import { map, startWith, Subject, switchMap, take } from 'rxjs';

/**
 * Компонент списка новостей.
 *
 * Загружает новости из API, управляет пагинацией по 3 элемента на страницу.
 */
@Component({
    standalone: true,
    selector: 'app-news-list',
    imports: [NewsCardComponent, TuiPagination],
    templateUrl: './news-list.component.html',
})
export class NewsListComponent {
    /**
     * API-сервис для работы с новостями.
     */
    private readonly api = inject(NewsApiService);

    /**
     * Сервис пользователя для проверки ролей.
     */
    private readonly userService = inject(UserService);

    /**
     * Subject для принудительного обновления списка.
     */
    private readonly refresh$ = new Subject<void>();

    /**
     * Количество новостей на одной странице.
     */
    readonly pageSize = 3;

    /**
     * Текущий индекс страницы.
     */
    readonly pageIndex = signal(0);

    /**
     * Поток новостей из API.
     *
     * При первой подписке и по refresh$ загружает данные заново.
     */
    readonly news$ = this.refresh$.pipe(
        startWith(null),
        switchMap(() => this.api.getList()),
        map((list) => list.map(mapDtoToNews))
    );

    /**
     * Сигнал с массивом новостей.
     */
    readonly news = toSignal(this.news$, { initialValue: [] });

    /**
     * Общее количество страниц.
     */
    readonly totalPages = computed(() =>
        Math.ceil(this.news().length / this.pageSize)
    );

    /**
     * Новости текущей страницы.
     */
    readonly pageNews = computed(() => {
        const all = this.news();
        const start = this.pageIndex() * this.pageSize;

        return all.slice(start, start + this.pageSize);
    });

    /**
     * Флаг, указывающий, является ли текущий пользователь администратором.
     */
    readonly isAdmin = computed(() =>
        this.userService.roles.includes(Role.admin)
    );

    /**
     * Переходит на указанную страницу.
     *
     * @param index Индекс страницы (0-based).
     */
    goToPage(index: number): void {
        this.pageIndex.set(index);
    }

    /**
     * Принудительно обновляет список новостей.
     */
    refresh(): void {
        this.refresh$.next();
    }

    /**
     * Удаляет новость по идентификатору.
     *
     * Запрашивает подтверждение у пользователя перед удалением.
     * После успешного удаления обновляет список новостей.
     *
     * @param id Идентификатор новости для удаления.
     */
    deleteNews(id: string): void {
        if (!confirm('Вы уверены, что хотите удалить эту новость?')) {
            return;
        }

        this.api.delete(id).subscribe({
            next: () => {
                this.refresh$.next();
            },
            error: (err) => {
                console.error('[News] Ошибка удаления новости:', err);
            },
        });
    }

    /**
     * Открывает новость по идентификатору.
     *
     * Вызывает GET /v1/news/{id}, который инкрементирует счетчик просмотров на сервере.
     * После успешного запроса обновляет список новостей.
     *
     * @param id Идентификатор новости.
     */
    openNews(id: string): void {
        this.api
            .getById(id)
            .pipe(take(1))
            .subscribe({
                next: () => {
                    this.refresh$.next();
                },
                error: (err) => {
                    console.error('[News] Ошибка открытия новости:', err);
                },
            });
    }
}
