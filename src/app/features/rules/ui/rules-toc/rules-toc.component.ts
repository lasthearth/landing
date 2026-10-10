import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { RulesTocItem } from '../../model/rules-toc-item.interface';

/**
 * Сколько держать подсветку выбранного пункта, пока идёт прокрутка (мс).
 */
const CLICK_LOCK_MS = 1500;

/**
 * Оглавление правил.
 *
 * На широком экране — липкий список слева от текста, на узком — строка
 * прокручиваемых чипов над разделами. Подсвечивает раздел, который сейчас
 * читают, и по клику сообщает родителю, к какому разделу перейти.
 */
@Component({
    standalone: true,
    selector: 'app-rules-toc',
    templateUrl: './rules-toc.component.html',
    styleUrl: './rules-toc.component.less',
    imports: [TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesTocComponent {
    /**
     * Пункты оглавления в порядке следования разделов.
     */
    public readonly items = input.required<readonly RulesTocItem[]>();

    /**
     * Запрос перехода к разделу.
     * Эмитит `sectionId` выбранного пункта.
     */
    public readonly navigate = output<string>();

    /**
     * Раздел, который сейчас в зоне чтения (`null` — ещё не определён).
     */
    protected readonly activeId = signal<string | null>(null);

    /**
     * До какого момента (мс) не менять подсветку по прокрутке.
     * После клика страница едет к разделу через другие разделы — без паузы
     * подсветка перескакивала бы на них, а у последних разделов (страница
     * упирается в конец) так и оставалась бы на чужом.
     */
    private lockedUntil = 0;

    constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            if (typeof IntersectionObserver === 'undefined') {
                return;
            }

            // Активным считается раздел, верх которого прошёл верхнюю треть экрана.
            const observer = new IntersectionObserver(
                (entries) => {
                    if (Date.now() < this.lockedUntil) {
                        return;
                    }
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            this.activeId.set(entry.target.id.replace(/^rules-/, ''));
                        }
                    }
                },
                { rootMargin: '-15% 0px -70% 0px' }
            );

            for (const item of this.items()) {
                const el = document.getElementById(`rules-${item.sectionId}`);
                if (el) {
                    observer.observe(el);
                }
            }

            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    /**
     * Обрабатывает клик по пункту: подсвечивает его и запрашивает переход.
     *
     * @param event Событие клика (переход по якорю отменяется — прокрутку делает родитель).
     * @param sectionId Идентификатор раздела.
     */
    protected select(event: Event, sectionId: string): void {
        event.preventDefault();
        this.lockedUntil = Date.now() + CLICK_LOCK_MS;
        this.activeId.set(sectionId);
        this.navigate.emit(sectionId);
    }
}
