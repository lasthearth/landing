/**
 * Интерфейс данных для SEO-метатегов.
 */
export interface ISeoData {
    /**
     * Заголовок страницы.
     */
    title: string;

    /**
     * Описание страницы.
     */
    description: string;

    /**
     * Ключевые слова для поисковых систем.
     */
    keywords: string;

    /**
     * Инструкции для роботов (опционально).
     */
    robots?: string;

    /**
     * Канонический URL (опционально).
     */
    url?: string;

    /**
     * Тип Open Graph (опционально).
     */
    type?: string;

    /**
     * Локаль страницы (опционально).
     */
    locale?: string;

    /**
     * Название сайта (опционально).
     */
    siteName?: string;
}
