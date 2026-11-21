import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, inject, NgZone, OnDestroy, output, PLATFORM_ID } from '@angular/core';

/** Ход, ниже которого касание считается тапом, а не жестом (px). */
const DRAG_START_THRESHOLD = 4;

/** Доля высоты пластины, после которой жест закрывает модалку. */
const DISMISS_DISTANCE_RATIO = 0.3;

/** Скорость закрытия, px/мс: короткий, но быстрый флик важнее расстояния. */
const DISMISS_VELOCITY = 0.5;

/** Сопротивление при вытягивании вверх: панель идёт дальше нуля на пятую часть. */
const RUBBER_BAND = 0.2;

/**
 * Кривая пластины — токен проекта `--lh-ease-smooth` (0.32, 0.72, 0, 1):
 * крутая на старте и мягкая на посадке, как у нижних шторок iOS.
 */
const SHEET_EASE = 'var(--lh-ease-smooth)';

/**
 * Жест закрытия нижней модалки: пластину тянут вниз за ручку.
 *
 * Директива ставится на саму пластину и требует двух пометок в разметке:
 * `data-sheet-handle` на ручке (единственная зона, с которой начинается жест)
 * и `data-sheet-scrim` на затемнении (по нему ведётся связанное затухание).
 *
 * Две фазы, как у любого прямого манипулирования:
 * - пока палец внизу, позиция идёт ровно за ним, без переходов и без
 *   пружины — иначе пластина отстаёт и кажется тяжёлой;
 * - после отпускания работает физика: расстояние или скорость закрывают
 *   модалку, иначе пластина возвращается быстрым переходом.
 *
 * Затемнение выводится из хода жеста, а не анимируется отдельно: две
 * независимые анимации расходятся в тот момент, когда жест разворачивают.
 *
 * Ручка — единственная зона захвата: `touch-action: none` на ней не мешает
 * прокрутке содержимого пластины, а браузер не отбирает жест себе.
 *
 * `prefers-reduced-motion` снимает длительность посадки, но не сам жест:
 * движение здесь производит пользователь.
 */
@Directive({
    selector: '[appSheetDrag]',
})
export class SheetDragDirective implements AfterViewInit, OnDestroy {
    /**
     * Модалка просит закрыться: жест прошёл порог по расстоянию или скорости.
     * Разметка: `(dismiss)="close()"`.
     */
    public readonly dismiss = output<void>();

    /**
     * Пластина, которую тянем.
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    /**
     * Признак браузерного окружения: на сервере событий указателя нет.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Зона Angular: `pointermove` приходит десятки раз в секунду, и каждый
     * тик в зоне дёргал бы change detection. Слушатели живут снаружи.
     */
    private readonly zone = inject(NgZone);

    /**
     * Ручка, с которой начинается жест.
     */
    private handle: HTMLElement | null = null;

    /**
     * Затемнение под пластиной: его прозрачность привязана к ходу жеста.
     */
    private scrim: HTMLElement | null = null;

    /**
     * Координата касания в начале жеста.
     */
    private startY = 0;

    /**
     * Предыдущая координата и время: по ним считается скорость отпускания.
     */
    private previousY = 0;
    private previousTime = 0;

    /**
     * Сглаженная скорость жеста, px/мс.
     */
    private velocity = 0;

    /**
     * Идёт ли жест прямо сейчас.
     */
    private dragging = false;

    /**
     * Признак, что палец уже сдвинулся дальше порога тапа.
     */
    private moved = false;

    /**
     * Текущее смещение пластины и кадр, который его применит.
     */
    private offset = 0;
    private frame = 0;

    /**
     * Таймер посадки: по нему снимаются инлайновые стили после анимации.
     */
    private settle = 0;

    /**
     * @inheritdoc
     */
    public ngAfterViewInit(): void {
        if (!this.isBrowser) {
            return;
        }

        this.handle = this.host.querySelector<HTMLElement>('[data-sheet-handle]');
        this.scrim = this.host.closest<HTMLElement>('[data-sheet-scrim]');

        if (!this.handle) {
            return;
        }

        this.zone.runOutsideAngular(() => {
            this.handle?.addEventListener('pointerdown', this.onPointerDown);
        });
    }

    /**
     * Возвращает пластину во владение CSS перед открытием.
     *
     * Вызывается модалкой до смены состояния: после закрытия жестом на
     * пластине остаются инлайновые `transform` и `transition`, и без сброса
     * следующее открытие упёрлось бы в них.
     */
    public reset(): void {
        if (this.settle) {
            clearTimeout(this.settle);
            this.settle = 0;
        }

        this.clearInline();
    }

    /**
     * Снимает слушатели и незавершённые кадры.
     */
    public ngOnDestroy(): void {
        this.handle?.removeEventListener('pointerdown', this.onPointerDown);
        this.stopTracking();

        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = 0;
        }

        if (this.settle) {
            clearTimeout(this.settle);
        }
    }

    /**
     * Начало жеста: запоминает точку, снимает переход и забирает указатель.
     *
     * @param event Событие нажатия на ручке.
     */
    private readonly onPointerDown = (event: PointerEvent): void => {
        // Правая и средняя кнопки мыши жест не начинают.
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        if (this.settle) {
            clearTimeout(this.settle);
            this.settle = 0;
        }

        this.dragging = true;
        this.moved = false;
        this.velocity = 0;
        this.startY = event.clientY;
        this.previousY = event.clientY;
        this.previousTime = event.timeStamp;
        this.offset = 0;
        this.host.style.transition = 'none';
        this.handle?.setPointerCapture(event.pointerId);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
    };

    /**
     * Ведение: пластина идёт за пальцем один к одному, затухание привязано к ходу.
     *
     * Кадр пишется один на `requestAnimationFrame`: несколько `pointermove`
     * между кадрами не должны перерисовывать пластину каждый раз.
     *
     * @param event Событие движения указателя.
     */
    private readonly onPointerMove = (event: PointerEvent): void => {
        if (!this.dragging) {
            return;
        }

        const travelled = event.clientY - this.startY;

        if (!this.moved && Math.abs(travelled) < DRAG_START_THRESHOLD) {
            return;
        }

        this.moved = true;

        const elapsed = event.timeStamp - this.previousTime;

        if (elapsed > 0) {
            const instant = (event.clientY - this.previousY) / elapsed;
            this.velocity = this.velocity * 0.4 + instant * 0.6;
        }

        this.previousY = event.clientY;
        this.previousTime = event.timeStamp;
        // Вверх пластина не уезжает: граница отвечает сопротивлением, а не стеной.
        this.offset = travelled > 0 ? travelled : travelled * RUBBER_BAND;

        if (!this.frame) {
            this.frame = requestAnimationFrame(this.paint);
        }
    };

    /**
     * Отпускание: закрывает модалку по расстоянию или скорости, иначе возвращает.
     */
    private readonly onPointerUp = (): void => {
        if (!this.dragging) {
            return;
        }

        this.dragging = false;
        this.stopTracking();

        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = 0;
            this.paint();
        }

        const height = this.host.offsetHeight || 1;
        const far = this.offset > height * DISMISS_DISTANCE_RATIO;
        const fast = this.velocity > DISMISS_VELOCITY;

        if (!this.moved) {
            this.settleTo('translate3d(0, 0, 0)', 0);

            return;
        }

        if (far || fast) {
            this.settleTo('translate3d(0, 100%, 0)', 260, true);

            return;
        }

        this.settleTo('translate3d(0, 0, 0)', 320);
    };

    /**
     * Применяет текущее смещение к пластине и затемнению.
     */
    private readonly paint = (): void => {
        this.frame = 0;
        this.host.style.transform = `translate3d(0, ${this.offset}px, 0)`;

        if (!this.scrim) {
            return;
        }

        const height = this.host.offsetHeight || 1;
        const progress = Math.min(1, Math.max(0, this.offset / height));

        this.scrim.style.backgroundColor = `color-mix(in srgb, var(--lh-overlay) ${(55 * (1 - progress)).toFixed(
            2
        )}%, transparent)`;
    };

    /**
     * Завершает жест переходом: закрытие или возврат на место.
     *
     * @param transform Куда едет пластина.
     * @param duration Длительность посадки, мс.
     * @param closing Признак закрытия: по его окончании модалка просит закрыться.
     */
    private settleTo(transform: string, duration: number, closing = false): void {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ms = reduced ? Math.min(duration, 140) : duration;

        this.host.style.transition = `transform ${ms}ms ${SHEET_EASE}`;
        this.host.style.transform = transform;

        if (this.scrim) {
            this.scrim.style.transition = `background-color ${ms}ms ${SHEET_EASE}`;

            if (closing) {
                this.scrim.style.backgroundColor = 'transparent';
            }
        }

        this.settle = window.setTimeout(() => {
            this.settle = 0;

            if (closing) {
                // Инлайновые стили остаются: пластина за кадром, а снимает их
                // `reset()` при следующем открытии — иначе между затуханием
                // и сменой класса модалка успевает моргнуть на месте.
                this.dismiss.emit();

                return;
            }

            // Возврат к значениям из CSS: класс открытия снова владеет позицией.
            this.clearInline();
        }, ms);
    }

    /**
     * Снимает инлайновые стили после посадки: дальше положением владеет CSS.
     */
    private clearInline(): void {
        this.host.style.removeProperty('transition');
        this.host.style.removeProperty('transform');

        if (this.scrim) {
            this.scrim.style.removeProperty('transition');
            this.scrim.style.removeProperty('background-color');
        }
    }

    /**
     * Снимает слушатели жеста.
     */
    private stopTracking(): void {
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
    }
}