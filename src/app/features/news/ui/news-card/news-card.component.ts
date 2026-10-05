import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    model,
    output,
    PLATFORM_ID,
    signal,
    viewChild,
} from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, EMPTY, of, switchMap, take } from 'rxjs';
import { NewsApiService } from '@entities/news';
import { UserService } from '@entities/user';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { I18nService, TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { ClockService } from '@shared/lib/clock';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { NewsCardVariant } from './news-card-variant';

/**
 * Компонент карточки новости.
 *
 * Отображает заголовок, содержание, превью и время публикации.
 * Время показывается относительно текущего момента («5 минут назад», «вчера»),
 * а старше двух недель — датой; полная дата доступна в подсказке.
 * Длинный текст обрезается с плавным затуханием; карточка целиком ведёт
 * на страницу новости `/news/:id` (если передан `id`).
 * При наличии прав доступа отображает кнопку удаления.
 * При появлении карточки в зоне видимости регистрирует просмотр авторизованным пользователем.
 */
@Component({
    standalone: true,
    selector: 'app-news-card',
    imports: [TuiIcon, ImageLoaderComponent, TranslatePipe, NgTemplateOutlet, RouterLink, RelativeTimeComponent],
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
     * Текущее время, обновляемое раз в минуту.
     */
    private readonly clock = inject(ClockService);

    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Ссылка на DOM-элемент компонента.
     */
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Ссылка для отмены наблюдателя при уничтожении компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Блок с текстом новости.
     */
    private readonly textRef = viewChild<ElementRef<HTMLElement>>('textEl');

    /**
     * Уникальный идентификатор новости.
     */
    public readonly id = input<string>('');

    /**
     * Вариант отображения: крупная главная новость или компактная карточка сетки.
     */
    public readonly variant = input<NewsCardVariant>('featured');

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
     *
     * Используется как запасной вариант, если `createdAt` не передан.
     */
    public readonly date = input.required<string>();

    /**
     * Дата публикации новости как объект Date.
     *
     * Используется для относительного времени и признака «новая».
     */
    public readonly createdAt = input<Date | null>(null);

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
     * Событие удаления новости.
     *
     * Вызывается после подтверждения в диалоге.
     */
    public readonly delete = output<void>();

    /**
     * Текст не помещается в отведённую высоту — внизу показывается затухание.
     */
    protected readonly isClamped = signal(false);

    /**
     * Ссылка на страницу новости или null, если идентификатора нет
     * (например, в предпросмотре формы создания).
     */
    protected readonly link = computed(() => (this.id() ? ['/news', this.id()] : null));

    /**
     * Признак того, что просмотр уже был зарегистрирован для текущей карточки.
     */
    private viewRegistered = false;

    /**
     * Признак того, что новость опубликована не позднее 24 часов назад.
     */
    protected readonly isNew = computed(() => {
        const date = this.createdAt();

        if (!date) {
            return false;
        }

        const dayInMs = 24 * 60 * 60 * 1000;
        const diff = this.clock.now() - date.getTime();

        return diff <= dayInMs;
    });

    constructor() {
        afterNextRender(() => {
            this.initIntersectionObserver();
            this.initOverflowObserver();
        });

        // Содержимое может меняться (живой предпросмотр в форме создания) —
        // после перерисовки заново проверяем, помещается ли текст.
        effect(() => {
            this.content();

            if (this.isBrowser) {
                requestAnimationFrame(() => this.updateClamped());
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
     * Следит за размером блока текста и шрифтами, чтобы показывать
     * затухание только когда текст действительно обрезан.
     */
    private initOverflowObserver(): void {
        const text = this.textRef()?.nativeElement;

        if (!text) {
            return;
        }

        const check = (): void => this.updateClamped();

        // Картинки внутри текста меняют его высоту после загрузки;
        // событие load не всплывает, поэтому слушаем на фазе перехвата.
        text.addEventListener('load', check, true);
        this.destroyRef.onDestroy(() => text.removeEventListener('load', check, true));

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(check);
            observer.observe(text);
            this.destroyRef.onDestroy(() => observer.disconnect());
        }

        void document.fonts?.ready.then(check);
        check();
    }

    /**
     * Пересчитывает, обрезан ли текст.
     */
    private updateClamped(): void {
        const text = this.textRef()?.nativeElement;

        if (!text) {
            return;
        }

        this.isClamped.set(text.scrollHeight - text.clientHeight > 2);
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

                    return this.api.addView(this.id()).pipe(catchError(() => of(null)));
                }),
                catchError(() => EMPTY)
            )
            .subscribe((count) => {
                if (count != null) {
                    this.viewCount.set(count);
                }
            });
    }
}
