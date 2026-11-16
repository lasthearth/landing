/**
 * Тесты боевой шапки «Очаг и корона».
 *
 * «Корона» заменена заглушкой со своими тестами в `crown/`: этот компонент
 * отвечает только за её подключение и декоративный слой очага.
 */
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

/** Заглушка «Короны»: её собственные тесты живут в `crown/`. */
@Component({
    standalone: true,
    selector: 'app-header-crown',
    template: '<div data-stub="crown-content"></div>',
})
class CrownStubComponent {}

describe('HeaderComponent', () => {
    let fixture: ComponentFixture<HeaderComponent>;
    let root: HTMLElement;

    beforeEach(() => {
        TestBed.overrideComponent(HeaderComponent, {
            set: { imports: [CrownStubComponent] },
        });
        fixture = TestBed.createComponent(HeaderComponent);
        fixture.detectChanges();
        root = fixture.nativeElement as HTMLElement;
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('рисует композицию «Короны» внутри шапки', () => {
        expect(root.querySelector('app-header-crown [data-stub="crown-content"]')).not.toBeNull();
    });

    it('добавляет ореол и двенадцать углей декорацией без чтения скринридером', () => {
        const hearth = root.querySelector('.crown-fire__hearth');

        expect(hearth?.getAttribute('aria-hidden')).toBe('true');
        expect(root.querySelector('.crown-fire__haze')).not.toBeNull();
        expect(root.querySelectorAll('.crown-fire__ember').length).toBe(12);
    });
});
