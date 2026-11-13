/**
 * Тесты композиции «Очаг и корона».
 *
 * Настоящая «Корона» заменена заглушкой: этот вариант отвечает только за её
 * подключение и декоративный слой очага, а не за поведение меню и телеметрии.
 */
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HearthCrownComponent } from './hearth-crown.component';

/** Заглушка композиции «Короны»: её собственные тесты живут отдельно. */
@Component({
    standalone: true,
    selector: 'app-header-crown',
    template: '<div data-stub="crown-content"></div>',
})
class CrownStubComponent {}

describe('HearthCrownComponent', () => {
    let fixture: ComponentFixture<HearthCrownComponent>;
    let root: HTMLElement;

    beforeEach(() => {
        TestBed.overrideComponent(HearthCrownComponent, {
            set: { imports: [CrownStubComponent] },
        });
        fixture = TestBed.createComponent(HearthCrownComponent);
        fixture.detectChanges();
        root = fixture.nativeElement as HTMLElement;
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('рисует настоящую композицию «Короны» внутри объединённого варианта', () => {
        expect(root.querySelector('app-header-crown [data-stub="crown-content"]')).not.toBeNull();
    });

    it('добавляет линию, ореол и двенадцать углей декорацией без чтения скринридером', () => {
        const hearth = root.querySelector('.crown-fire__hearth');

        expect(hearth?.getAttribute('aria-hidden')).toBe('true');
        expect(root.querySelector('.crown-fire__line')).not.toBeNull();
        expect(root.querySelector('.crown-fire__haze')).not.toBeNull();
        expect(root.querySelectorAll('.crown-fire__ember').length).toBe(12);
    });
});
