export interface IJwtTokenLh {
    sub: string;    // Стандартное поле (subject)
    name: string;   // Кастомное поле
    iat: number;    // Время выпуска (issued at)
    exp?: number;   // Опциональное поле (expiration)
    roles?: string[]; // Дополнительные кастомные поля
}
