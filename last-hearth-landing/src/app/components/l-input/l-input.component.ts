import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, forwardRef, input, Input, InputSignal, Output, signal, WritableSignal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Компонент многофункционального поля ввода.
 */
@Component({
    standalone: true,
    selector: 'l-input',
    imports: [CommonModule],
    templateUrl: './l-input.component.html',
    styleUrl: './l-input.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => LInputComponent),
            multi: true
        }
    ]
})
export class LInputComponent<T = string> implements ControlValueAccessor {
    public type: InputSignal<'input' | 'select' | 'textarea'> = input<'input' | 'select' | 'textarea'>('input');

    public items: InputSignal<T[]> = input<T[]>([]);

    @Input() displayWith: (value: T) => string = (v) => String(v);

    public placeholder: InputSignal<string> = input('');

    protected readonly dropdownOpen: WritableSignal<boolean> = signal(false);

    private _value: T | null = null;
    get value(): T | null {
        return this._value;
    }
    set value(val: T | null) {
        this._value = val;
        this.onChange(val);
        this.onTouched();
    }

    @Output() valueChange = new EventEmitter<T>();

    private onChange: (_: any) => void = () => { };

    private onTouched: () => void = () => { };

    protected disabled = false;

    public writeValue(value: T | null): void {
        this._value = value;
    }

    public registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    public registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    public setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    protected toggleDropdown() {
        if (this.type() === 'select' && !this.disabled) {
            this.dropdownOpen.update((state) => !state);
        }
    }

    protected selectItem(item: T) {
        this.value = item;
        this.valueChange.emit(item);
        this.dropdownOpen.set(false);
    }

    get displayedValue(): string {
        if (this.type() === 'input') {
            return this.value ? String(this.value) : '';
        } else {
            return this.value ? this.displayWith(this.value) : '';
        }
    }

    protected onInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const val = input.value as unknown as T;
        this.value = val;
        this.valueChange.emit(val);
    }
}
