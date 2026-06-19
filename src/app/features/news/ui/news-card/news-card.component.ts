
import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, model, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, EMPTY, of, switchMap, take } from 'rxjs';
import { NewsApiService } from '@entities/news';
import { UserService } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';


/**
 * Компонент карточки новости.
 *
 * Отображает заголовок, содержание, превью и дату публикации.
 * При наличии прав доступа отображает кнопку удаления.
 * При появлении карточки в зоне видимости регистрирует просмотр авторизованным пользователем.
 */
@Component({
    standalone: true,
    selector: 'app-news-card',
    imports: [TuiIcon, ImageLoaderComponent, TranslatePipe],
    templateUrl: './news-card.component.html',
    styleUrl: './news-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
    /**
     * API-сервис новостей.
     */
    private readonly api = inject(NewsApiService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Ссылка на DOM-элемент компонента.
     */
    private readonly elementRef = inject(ElementRef);

    /**
     * Ссылка для отмены наблюдателя при уничтожении компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Уникальный идентификатор новости.
     */
    public readonly id = input<string>('');

    /**
     * Заголовок новости.
     */
    public readonly title = input.required<string>();

    /**
     * Содержание новости (HTML-разметка).
     */
    public readonly content = input.required<string>();

    /**
     * URL превью-изображения новости.
     */
    public readonly preview = input.required<string>();

    /**
     * Дата публикации новости в отформатированном виде.
     */
    public readonly date = input.required<string>();

    /**
     * Количество просмотров новости.
     */
    public readonly viewCount = model<number>(0);

    /**
     * Автор новости (идентификатор или имя).
     */
    public readonly createdBy = input<string>('');

    /**
     * Флаг, указывающий, может ли текущий пользователь удалять новость.
     *
     * При значении `true` отображается кнопка удаления.
     */
    public readonly canDelete = input<boolean>(false);

    /**
     * Флаг, указывающий, нужно ли отслеживать просмотры при появлении в зоне видимости.
     */
    public readonly trackViews = input<boolean>(false);

    /**
     * Признак того, что просмотр уже был зарегистрирован для текущей карточки.
     */
    private viewRegistered = false;

    constructor() {
        afterNextRender(() => {
            this.initIntersectionObserver();
        });
    }

    /**
     * Инициализирует IntersectionObserver для отслеживания появления карточки на экране.
     *
     * При первом попадании карточки в зону видимости вызывает регистрацию просмотра.
     */
    private initIntersectionObserver(): void {
        if (typeof IntersectionObserver === 'undefined' || !this.trackViews() || !this.id()) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    this.markViewed();
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(this.elementRef.nativeElement);

        this.destroyRef.onDestroy(() => observer.disconnect());
    }

    /**
     * Регистрирует просмотр новости для авторизованного пользователя.
     *
     * При ошибке никаких уведомлений не показывается.
     */
    private markViewed(): void {
        if (!this.trackViews() || !this.id() || this.viewRegistered) {
            return;
        }

        this.viewRegistered = true;

        this.userService.authState$
            .pipe(
                take(1),
                switchMap((isAuth) => {
                    if (!isAuth) {
                        return EMPTY;
                    }

                    return this.api
                        .addView(this.id())
                        .pipe(catchError(() => of(null)));
                }),
                catchError(() => EMPTY)
            )
            .subscribe((count) => {
                if (count != null) {
                    this.viewCount.set(count);
                }
            });
    }

    /**
     * Обрабатывает клик по кнопке удаления.
     *
     * Показывает диалог подтверждения и эмитит запрос на удаление
     * только после подтверждения пользователя.
     *
     * @param event Событие клика мыши.
     */
    protected onDeleteClick(event: MouseEvent): void {
        event.stopPropagation();

        this.confirmDialog
            .open({
                title: this.i18n.translate('news.card.confirmDeleteTitle'),
                text: this.i18n.translate('news.card.confirmDeleteText', { title: this.title() }),
            })
            .subscribe((confirmed) => {
                if (confirmed) {
                    this.delete.emit();
                }
            });
    }

    /**
     * Событие удаления новости.
     *
     * Вызывается при нажатии на кнопку удаления.
     */
    public readonly delete = output<void>();

}
