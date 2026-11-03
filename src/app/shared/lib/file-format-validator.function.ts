import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Признак соответствия MIME-типа файла одному шаблону `accept`.
 *
 * @param fileType MIME-тип файла.
 * @param pattern Шаблон из атрибута `accept`: `image/*` или точный тип `image/png`.
 * @returns true, если файл подходит под шаблон.
 */
function matchesPattern(fileType: string, pattern: string): boolean {
    if (pattern.endsWith('/*')) {
        return fileType.startsWith(pattern.slice(0, -1));
    }

    return fileType === pattern;
}

/**
 * Валидатор формата файла по списку `accept`.
 *
 * Нужен там, где файл попадает в форму не через `input[tuiInputFiles]`, а через
 * промежуточный компонент: тогда проверка формата Taiga остаётся на внутреннем
 * контроле компонента, а контрол формы о неверном типе не узнаёт.
 *
 * Пустое значение не проверяет — его ловит `Validators.required`.
 *
 * @param accept Список типов через запятую, как в атрибуте `accept` (`image/*`).
 * @returns Валидатор: ошибка `fileFormat`, если тип файла не подходит.
 */
export const fileFormatValidator = (accept: string): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
        const file = control.value;

        if (!file || !(file instanceof File)) {
            return null;
        }

        const patterns = accept
            .split(',')
            .map((pattern) => pattern.trim())
            .filter((pattern) => pattern.length > 0);

        if (patterns.length === 0) {
            return null;
        }

        if (patterns.some((pattern) => matchesPattern(file.type, pattern))) {
            return null;
        }

        return { fileFormat: true };
    };
};
