import { Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsPillDirective } from './tabs-pill.directive';

/**
 * Хост с директивой: ряд из трёх вкладок разной ширины.
 */
@Component({
    selector: 'app-tabs-pill-host',
    imports: [TabsPillDirective],
    template: `
        <div
            #row
            appTabsPill
            role="tablist"
            style="display: inline-flex; gap: 4px; padding: 4px; border: 1px solid #000; border-radius: 14px;"
        >
            @for (label of labels; track label; let index = $index) {
                <button
                    type="button"
                    role="tab"
                    [attr.aria-selected]="active() === index"
                    (click)="active.set(index)"
                    [style.padding]="paddings[index]"
                    style="height: 44px; border: none; cursor: pointer;"
                >
                    {{ label }}
                </button>
            }
        </div>
    `,
})
class TabsPillHostComponent {
    /**
     * Подписи вкладок разной длины: ширины кнопок заведомо разные.
     */
    protected readonly labels = ['AAAA', 'BBBBBBBB', 'CC'];

    /**
     * Горизонтальные паддинги кнопок, px — тоже разные.
     */
    protected readonly paddings = ['0 20px', '0 32px', '0 10px'];

    /**
     * Индекс активной вкладки.
     */
    protected readonly active = signal(0);

    /**
     * Ряд вкладок — для замеров геометрии.
     */
    public readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
}

/**
 * Контрольный ряд без директивы: та же разметка, для сравнения отступов.
 */
@Component({
    selector: 'app-tabs-pill-control',
    template: `
        <div
            #row
            role="tablist"
            style="display: inline-flex; gap: 4px; padding: 4px; border: 1px solid #000; border-radius: 14px;"
        >
            @for (label of labels; track label) {
                <button
                    type="button"
                    role="tab"
                    [style.padding]="paddings[$index]"
                    style="height: 44px; border: none; cursor: pointer;"
                >
                    {{ label }}
                </button>
            }
        </div>
    `,
})
class TabsPillControlComponent {
    protected readonly labels = ['AAAA', 'BBBBBBBB', 'CC'];
    protected readonly paddings = ['0 20px', '0 32px', '0 10px'];

    public readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
}

/**
 * Правила плашки из глобальных стилей: в карма-окружении styles.css
 * не подключается, поэтому минимальный набор вставляется в документ —
 * ровно те свойства, от которых зависит геометрия.
 */
const PILL_CSS = `
[role='tab'] { background: #eee; }
.lh-tabs-pill { position: relative; }
.lh-tabs-pill > [role='tab'] { position: relative; }
.lh-tabs-pill .lh-tabs-pill__el {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    pointer-events: none;
}

.lh-tabs-pill .lh-tabs-pill__el.is-placed {
    transition:
        transform 200ms cubic-bezier(0.32, 0.72, 0, 1),
        width 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
.lh-tabs-pill .lh-tabs-pill__face {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 10px;
    background-color: #ddd;
}
.lh-tabs-pill.is-ready > [role='tab'][aria-selected='true'] { background: transparent; }
`;

describe('TabsPillDirective', () => {
    let style: HTMLStyleElement;
    let fixture: ComponentFixture<TabsPillHostComponent>;
    let host: TabsPillHostComponent;

    /**
     * Контрольные замеры ряда без директивы. Снимаются до создания хоста:
     * TestBed уничтожает предыдущий фикстур при создании нового.
     */
    let controlRowWidth = 0;
    let controlLefts: number[] = [];

    const pill = (): HTMLElement | null =>
        host.row().nativeElement.querySelector<HTMLElement>('.lh-tabs-pill__el');

    const buttons = (): HTMLElement[] =>
        Array.from(host.row().nativeElement.querySelectorAll<HTMLElement>('[role="tab"]'));

    /**
     * Ждёт реального времени: WAAPI-полёт живёт на настоящем rAF,
     * fakeAsync его не двигает.
     */
    const settle = (ms: number): Promise<void> =>
        new Promise((resolve) => {
            setTimeout(resolve, ms);
        });

    beforeAll(async () => {
        style = document.createElement('style');
        style.textContent = PILL_CSS;
        document.head.appendChild(style);

        await TestBed.configureTestingModule({ imports: [TabsPillHostComponent, TabsPillControlComponent] })
            .compileComponents();
    });

    afterAll(() => {
        style.remove();
    });

    beforeEach(async () => {
        const controlFixture = TestBed.createComponent(TabsPillControlComponent);
        controlFixture.detectChanges();
        await controlFixture.whenStable();

        const controlRow = controlFixture.componentInstance.row().nativeElement;
        const controlRowRect = controlRow.getBoundingClientRect();

        controlRowWidth = controlRow.clientWidth;
        controlLefts = Array.from(controlRow.querySelectorAll<HTMLElement>('[role="tab"]')).map(
            (button) => button.getBoundingClientRect().left - controlRowRect.left,
        );

        fixture = TestBed.createComponent(TabsPillHostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        await settle(80);
    });

    it('создаёт плашку и делает её абсолютной в ряду', () => {
        const row = host.row().nativeElement;

        expect(row.classList.contains('lh-tabs-pill')).toBe(true);
        expect(row.classList.contains('is-ready')).toBe(true);

        const el = pill();

        expect(el).withContext('плашка вставлена в ряд').not.toBeNull();
        expect(getComputedStyle(el!).position).withContext('плашка выпала из потока').toBe('absolute');
        expect(el!.firstElementChild?.className).withContext('слой-потомок на месте').toContain('lh-tabs-pill__face');
    });

    it('не сдвигает кнопки ряда: отступы как у ряда без директивы', () => {
        const row = host.row().nativeElement;
        const rowRect = row.getBoundingClientRect();

        // Сравнение в одной системе координат: rect кнопки минус rect ряда.
        expect(row.clientWidth)
            .withContext('ширина ряда не изменилась')
            .toBe(controlRowWidth);

        buttons().forEach((button, index) => {
            const relative = button.getBoundingClientRect().left - rowRect.left;

            expect(Math.abs(relative - controlLefts[index]))
                .withContext(`кнопка ${index} не уехала вправо: ${relative} против ${controlLefts[index]}`)
                .toBeLessThanOrEqual(1);
        });
    });

    it('встаёт точно на активную вкладку: позиция и ширина', () => {
        const active = buttons()[0];
        const pillRect = pill()!.getBoundingClientRect();
        const buttonRect = active.getBoundingClientRect();

        expect(Math.abs(pillRect.left - buttonRect.left))
            .withContext('левый край плашки совпадает с кнопкой')
            .toBeLessThanOrEqual(1);
        expect(Math.abs(pillRect.width - buttonRect.width))
            .withContext('ширина плашки совпадает с кнопкой')
            .toBeLessThanOrEqual(1);
        expect(Math.abs(pillRect.top - buttonRect.top))
            .withContext('верх плашки совпадает с кнопкой')
            .toBeLessThanOrEqual(1);
    });

    it('активная вкладка без своей заливки: подсветку держит плашка', () => {
        const active = buttons()[0];

        expect(getComputedStyle(active).backgroundColor).withContext('заливка кнопки погашена').toBe('rgba(0, 0, 0, 0)');
    });

    it('перелетает на вторую вкладку по клику и остаётся на ней', async () => {
        buttons()[1].click();
        fixture.detectChanges();

        // Полёт 200ms + приземление: ждём с запасом.
        await settle(500);

        const second = buttons()[1];
        const pillRect = pill()!.getBoundingClientRect();
        const secondRect = second.getBoundingClientRect();

        expect(second.getAttribute('aria-selected')).toBe('true');
        expect(Math.abs(pillRect.left - secondRect.left))
            .withContext('плашка прилетела на вторую вкладку')
            .toBeLessThanOrEqual(1);
        expect(Math.abs(pillRect.width - secondRect.width))
            .withContext('ширина плашки подстроилась под вторую вкладку')
            .toBeLessThanOrEqual(1);
    });

    it('не дрейфует после серии переключений: посадка ровно на вкладку', async () => {
        const sequence = [2, 0, 1, 2, 0, 1, 0, 2];

        for (const index of sequence) {
            buttons()[index].click();
            fixture.detectChanges();
            await settle(420);

            const button = buttons()[index];
            const pillRect = pill()!.getBoundingClientRect();
            const buttonRect = button.getBoundingClientRect();
            expect(Math.abs(pillRect.left - buttonRect.left))
                .withContext(`шаг ${index}: плашка на кнопке (левый край)`)
                .toBeLessThanOrEqual(1);
            expect(Math.abs(pillRect.width - buttonRect.width))
                .withContext(`шаг ${index}: ширина плашки`)
                .toBeLessThanOrEqual(1);
        }
    });

    it('перехватывает полёт без скачка назад', async () => {
        buttons()[2].click();
        fixture.detectChanges();
        await settle(90); // середина полёта
        buttons()[1].click();
        fixture.detectChanges();
        await settle(500);

        const pillRect = pill()!.getBoundingClientRect();
        const secondRect = buttons()[1].getBoundingClientRect();

        expect(Math.abs(pillRect.left - secondRect.left))
            .withContext('после перехвата плашка на второй вкладке')
            .toBeLessThanOrEqual(1);
    });
});
