import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HeaderPrototypeSwitcherComponent } from './header-prototype-switcher.component';
import { HeaderPrototypeComponent } from './header-prototype.component';
import { HEADER_PROTOTYPE_VARIANTS } from './config/header-prototype-variants.constant';

/**
 * Заглушка боевой шапки.
 *
 * Настоящая тянет `HeaderState` с десятком сервисов, а хост проверяется только
 * на том, какой из двух заголовков он рисует.
 */
@Component({
    standalone: true,
    selector: 'app-header',
    template: '<div data-stub="production"></div>',
})
class ProductionHeaderStubComponent {}

/**
 * Заглушка варианта «Врата очага».
 */
@Component({
    standalone: true,
    selector: 'app-header-hearth-gate',
    template: '<div data-stub="hearth-gate"></div>',
})
class HearthGateStubComponent {}

/**
 * Заглушки остальных вариантов прототипа: хост обязан рисовать каждый из списка.
 */
@Component({
    standalone: true,
    selector: 'app-header-rail',
    template: '<div data-stub="rail"></div>',
})
class RailStubComponent {}

@Component({
    standalone: true,
    selector: 'app-header-hud',
    template: '<div data-stub="hud"></div>',
})
class HudStubComponent {}

@Component({
    standalone: true,
    selector: 'app-header-crown',
    template: '<div data-stub="crown"></div>',
})
class CrownStubComponent {}

@Component({
    standalone: true,
    selector: 'app-header-deck',
    template: '<div data-stub="deck"></div>',
})
class DeckStubComponent {}

@Component({
    standalone: true,
    selector: 'app-header-morph',
    template: '<div data-stub="morph"></div>',
})
class MorphStubComponent {}

@Component({
    standalone: true,
    selector: 'app-header-hearth-crown',
    template: '<div data-stub="hearth-crown"></div>',
})
class HearthCrownStubComponent {}

/**
 * Заглушка содержимого маршрута: роутеру нужен компонент для адреса.
 */
@Component({
    standalone: true,
    template: '',
})
class RouteStubComponent {}

describe('HeaderPrototypeComponent', () => {
    let fixture: ComponentFixture<HeaderPrototypeComponent>;
    let router: Router;
    let root: HTMLElement;

    /**
     * Ставит параметр варианта в адрес до создания хоста.
     *
     * @param value Значение `?hvariant=`; `null` — параметр не нужен.
     */
    const openWith = async (value: string | null): Promise<void> => {
        await router.navigate([], { queryParams: { hvariant: value } });
    };

    /**
     * Рисует хост и исполняет отложенные эффекты рендера.
     */
    const render = (): void => {
        fixture.detectChanges();
        TestBed.flushEffects();
        root = fixture.nativeElement as HTMLElement;
    };

    beforeEach(async () => {
        TestBed.overrideComponent(HeaderPrototypeComponent, {
            set: {
                imports: [
                    ProductionHeaderStubComponent,
                    HeaderPrototypeSwitcherComponent,
                    HearthGateStubComponent,
                    RailStubComponent,
                    HudStubComponent,
                    CrownStubComponent,
                    DeckStubComponent,
                    MorphStubComponent,
                    HearthCrownStubComponent,
                ],
            },
        });
        TestBed.configureTestingModule({
            providers: [provideRouter([{ path: '**', component: RouteStubComponent }])],
        });

        router = TestBed.inject(Router);
        await router.navigateByUrl('/');
        fixture = TestBed.createComponent(HeaderPrototypeComponent);
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('без параметра рисует боевую шапку и прячет пилюлю', async () => {
        await openWith(null);
        render();

        expect(root.querySelector('[data-stub="production"]')).not.toBeNull();
        expect(root.querySelector('[data-stub="hearth-gate"]')).toBeNull();
        expect(root.querySelector('.switcher')).toBeNull();
    });

    it('параметр hvariant включает вариант и показывает пилюлю', async () => {
        await openWith('hearth-gate');
        render();

        expect(root.querySelector('[data-stub="hearth-gate"]')).not.toBeNull();
        expect(root.querySelector('[data-stub="production"]')).toBeNull();
        expect(root.querySelector('.switcher')).not.toBeNull();
    });

    it('каждый вариант из списка рисуется своим компонентом', async () => {
        for (const variant of HEADER_PROTOTYPE_VARIANTS) {
            await openWith(variant.id);
            render();

            expect(root.querySelector(`[data-stub="${variant.id}"]`)).not.toBeNull();
            expect(root.querySelector('[data-stub="production"]')).toBeNull();
        }
    });

    it('неизвестное значение параметра оставляет боевую шапку', async () => {
        await openWith('no-such-variant');
        render();

        expect(root.querySelector('[data-stub="production"]')).not.toBeNull();
        expect(root.querySelector('.switcher')).toBeNull();
    });

    it('переход с параметром после первого кадра включает вариант', async () => {
        await openWith(null);
        render();

        expect(root.querySelector('[data-stub="production"]')).not.toBeNull();

        await openWith('hearth-gate');
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('[data-stub="hearth-gate"]')).not.toBeNull();
    });

    it('крестик пилюли возвращает боевую шапку и убирает параметр', async () => {
        await openWith('hearth-gate');
        render();

        root.querySelector<HTMLButtonElement>('button[aria-label="Вернуть боевую шапку"]')?.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('[data-stub="production"]')).not.toBeNull();
        expect(router.url).toBe('/');
    });
});
