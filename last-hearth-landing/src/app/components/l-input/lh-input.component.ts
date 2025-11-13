import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    forwardRef,
    input,
    Input,
    InputSignal,
    Output,
    signal,
    WritableSignal,
} from '@angular/core';
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
    imports: [CommonModule],
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
            return this.value ? String(this.value) : '';
        } else {
            return this.value ? this.displayWith(this.value) : '';
        }
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
            const numericValue = input.value.replace(/[^\d]/g, '');
            val = numericValue as unknown as T;
            input.value = numericValue;
        } else {
            val = input.value as unknown as T;
        }

        this.value = val;
        this.valueChange.emit(val);
    }
}
