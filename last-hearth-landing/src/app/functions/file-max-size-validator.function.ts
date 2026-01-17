import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function maxFileSize(maxSizeMb: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const file = control.value as File;

        // Если файла нет или это не файл (например, строка), валидация пройдена
        if (!file || !(file instanceof File)) {
            return null;
        }

        const maxSizeInBytes = maxSizeMb * 1024 * 1024;

        if (file.size > maxSizeInBytes) {
            return { maxFileSize: true };
        }

        return null;
    };
}
