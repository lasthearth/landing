import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderPrototypeSwitcherComponent } from './header-prototype-switcher.component';
import { HeaderVariantId, HeaderVariantOption } from './model/header-variant.model';

/**
 * Список вариантов для проверки листания.
 *
 * Настоящий список состоит из одного варианта, а переход по кругу виден
 * только на трёх, поэтому идентификаторы здесь тестовые.
 */
const VARIANTS = [
    { id: 'a', title: 'Альфа' },
    { id: 'b', title: 'Бета' },
    { id: 'c', title: 'Гамма' },
] as unknown as readonly HeaderVariantOption[];

/**
 * Отправляет нажатие клавиши в окно.
 *
 * @param key Значение `KeyboardEvent.key`.
 * @param target Цель события: поле ввода проверяет защиту от перехвата.
 * @returns Отправленное событие, чтобы прочитать `defaultPrevented`.
 */
function pressKey(key: string, target: EventTarget = window): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

    target.dispatchEvent(event);

    return event;
}

describe('HeaderPrototypeSwitcherComponent', () => {
    let fixture: ComponentFixture<HeaderPrototypeSwitcherComponent>;

    /**
     * Что переключатель отдал наружу за время теста.
     *
     * Тип шире варианта: список выше тестовый, и сравнивать удобнее строками.
     */
    let picked: (string | null)[];

    /**
     * Кнопка пилюли по её доступному имени.
     *
     * @param label Значение `aria-label`.
     * @returns Кнопка внутри разметки пилюли.
     */
    const button = (label: string): HTMLButtonElement => {
        const found = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
            `button[aria-label="${label}"]`
        );

        if (!found) {
            throw new Error(`кнопка «${label}» не найдена`);
        }

        return found;
    };

    /**
     * Нажимает кнопку пилюли.
     *
     * @param label Значение `aria-label`.
     */
    const click = (label: string): void => button(label).click();

    beforeEach(() => {
        picked = [];
        fixture = TestBed.createComponent(HeaderPrototypeSwitcherComponent);
        fixture.componentRef.setInput('variants', VARIANTS);
        fixture.componentRef.setInput('activeId', 'a' as HeaderVariantId);
        fixture.componentInstance.pick.subscribe((id) => picked.push(id));
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        document.body.innerHTML = '';
    });

    it('подпись называет вариант и его место в списке', () => {
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Шапка: Альфа · 1/3');
    });

    it('подпись зовёт боевую шапку, если вариант не выбран', () => {
        fixture.componentRef.setInput('activeId', null);
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Боевая шапка');
    });

    it('стрелка вправо отдаёт следующий вариант', () => {
        click('Следующий вариант');

        expect(picked).toEqual(['b']);
    });

    it('стрелка влево отдаёт предыдущий вариант по кругу', () => {
        click('Предыдущий вариант');

        expect(picked).toEqual(['c']);
    });

    it('шаг вперёд с последнего варианта возвращает первый', () => {
        fixture.componentRef.setInput('activeId', 'c' as HeaderVariantId);
        fixture.detectChanges();

        click('Следующий вариант');

        expect(picked).toEqual(['a']);
    });

    it('крестик возвращает боевую шапку', () => {
        click('Вернуть боевую шапку');

        expect(picked).toEqual([null]);
    });

    it('клавиша вправо листает вперёд и отменяет прокрутку страницы', () => {
        const event = pressKey('ArrowRight');

        expect(picked).toEqual(['b']);
        expect(event.defaultPrevented).toBe(true);
    });

    it('клавиша влево листает назад и отменяет прокрутку страницы', () => {
        const event = pressKey('ArrowLeft');

        expect(picked).toEqual(['c']);
        expect(event.defaultPrevented).toBe(true);
    });

    it('Escape возвращает боевую шапку и не трогает поведение браузера', () => {
        const event = pressKey('Escape');

        expect(picked).toEqual([null]);
        expect(event.defaultPrevented).toBe(false);
    });

    it('поле ввода оставляет стрелки себе', () => {
        const input = document.createElement('input');
        document.body.append(input);

        pressKey('ArrowRight', input);

        expect(picked).toEqual([]);
    });

    it('многострочное поле и список тоже оставляют стрелки себе', () => {
        const textarea = document.createElement('textarea');
        const select = document.createElement('select');
        document.body.append(textarea, select);

        pressKey('ArrowLeft', textarea);
        pressKey('ArrowRight', select);

        expect(picked).toEqual([]);
    });

    it('редактируемый блок оставляет стрелки себе', () => {
        const editable = document.createElement('div');
        document.body.append(editable);

        // jsdom не выводит `isContentEditable` из атрибута: свойство задаётся
        // вручную, иначе проверка компонента не увидит редактируемый блок.
        Object.defineProperty(editable, 'isContentEditable', { value: true });

        pressKey('ArrowRight', editable);

        expect(picked).toEqual([]);
    });

    it('после уничтожения компонента окно больше не слушается', () => {
        fixture.destroy();

        pressKey('ArrowRight');

        expect(picked).toEqual([]);
    });

    it('пустой список вариантов не отдаёт выбор', () => {
        fixture.componentRef.setInput('variants', []);
        fixture.detectChanges();

        click('Следующий вариант');
        pressKey('ArrowLeft');

        expect(picked).toEqual([]);
    });
});
