import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbilityTagComponent } from './ability-tag.component';

describe('AbilityTagComponent', () => {
    let component: AbilityTagComponent;
    let fixture: ComponentFixture<AbilityTagComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AbilityTagComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AbilityTagComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', { icon: '@tui.heart', text: 'Test' });
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
