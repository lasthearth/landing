import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

//Валидатор размера файла
export const maxFileSizeValidator = (maxSizeMb: number): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
        const file = control.value;

        //Проверка передается ли файл нужного формата
        if (!file || !(file instanceof File)) {
            return { fileFormat: true };
        }

        //Преобразование мегабайт в байты
        const maxSizeInBytes = maxSizeMb * 1024 * 1024;

        //Проверка размера файла
        if (file.size > maxSizeInBytes) {
            return { maxFileSize: true };
        }

        return null;
    };
};
