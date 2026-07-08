import { CommonModule, DOCUMENT } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    EventEmitter,
    forwardRef,
    HostListener,
    inject,
    input,
    Input,
    InputSignal,
    Output,
    signal,
    WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Тип поля
 */
export type LHInputType = 'input' | 'select' | 'textarea' | 'inputNumber';

/**
 * Компонент многофункционального поля ввода.
 */
@Component({
    standalone: true,
    selector: 'lh-input',
    imports: [CommonModule, TuiIcon],
    templateUrl: './lh-input.component.html',
    styleUrl: './lh-input.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => LHInputComponent),
            multi: true,
        },
    ],
})
export class LHInputComponent<T = string> implements ControlValueAccessor {
    /**
     * Ссылка на DOM-элемент компонента.
     */
    private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

    /**
     * Тип поля ввода.
     */
    public type: InputSignal<LHInputType> = input<LHInputType>('input');

    /**
     * Список элементов выпадающего списка.
     */
    public items: InputSignal<T[]> = input<T[]>([]);

    /**
     * Функция, преобразования сложных объектов в строки для отображения в интерфейсе.
     */
    @Input()
    displayWith: (value: T) => string = (v) => String(v);

    /**
     * Плейсхолдер.
     */
    public placeholder: InputSignal<string> = input('');

    /**
     * Количество строк для многострочного поля.
     */
    public rows: InputSignal<number> = input(3);

    /**
     * Иконка Taiga UI, отображаемая справа внутри поля.
     */
    public icon: InputSignal<string> = input('');

    /**
     * Признак того, раскрыт ли список.
     */
    protected readonly dropdownOpen: WritableSignal<boolean> = signal(false);

    /**
     * Текущее значение поля ввода.
     */
    private _value: T | null = null;
    get value(): T | null {
        return this._value;
    }
    set value(val: T | null) {
        this._value = val;
        this.onChange(val);
        this.onTouched();
    }

    /**
     * Событие изменения значения.
     */
    @Output() valueChange = new EventEmitter<T>();

    /**
     * Признак того, задизейблено ли поле.
     */
    protected disabled: boolean = false;

    /** @inheritdoc */
    private onChange: (_: any) => void = () => {};

    /** @inheritdoc */
    private onTouched: () => void = () => {};

    /** @inheritdoc */
    public writeValue(value: T | null): void {
        this._value = value;
    }

    /** @inheritdoc */
    public registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    /** @inheritdoc */
    public registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    /** @inheritdoc */
    public setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    /**
     * Переключает состояние списка скрыт/раскрыт.
     */
    protected toggleDropdown() {
        if (this.type() === 'select' && !this.disabled) {
            this.dropdownOpen.update((state) => !state);
        }
    }

    /**
     * Закрывает выпадающий список при клике вне компонента.
     *
     * @param event Событие клика.
     */
    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (!this.dropdownOpen()) {
            return;
        }

        const target = event.target as HTMLElement;
        if (!this.elementRef.nativeElement.contains(target)) {
            this.dropdownOpen.set(false);
        }
    }

    /**
     * Выбирает элемент списка.
     *
     * @param item элемент списка.
     */
    protected selectItem(item: T) {
        this.value = item;
        this.valueChange.emit(item);
        this.dropdownOpen.set(false);
    }

    /**
     * Отдает значение для отображения.
     */
    get displayedValue(): string {
        if (this.type() === 'input' || this.type() === 'inputNumber' || this.type() === 'textarea') {
            return this.value !== null && this.value !== undefined ? String(this.value) : '';
        }

        return this.value !== null && this.value !== undefined ? this.displayWith(this.value) : '';
    }

    /**
     * Обрабатывает изменения в поле ввода.
     *
     * @param event Поле ввода.
     */
    protected onInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        let val: T;

        if (this.type() === 'inputNumber') {
            const hasMinus = input.value.startsWith('-');

            let numericValue = input.value.replace(/\D/g, '');

            if (hasMinus) {
                numericValue = '-' + numericValue;
            }

            val = numericValue as unknown as T;
            input.value = numericValue;
        } else {
            val = input.value.trim() as unknown as T;
            input.value = input.value.trim();
        }

        this.value = val;
        this.valueChange.emit(val);
    }
}
