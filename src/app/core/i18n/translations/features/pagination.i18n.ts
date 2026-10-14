/**
 * Переводы общей пагинации: она встречается на разных страницах,
 * поэтому словарь подключён глобально (см. translations/index.ts).
 */
export const PAGINATION_I18N = {
    ru: {
        pagination: {
            prev: 'Предыдущая страница',
            next: 'Следующая страница',
            label: 'Страницы',
            of: '{{page}} из {{pages}}',
        },
    },
    en: {
        pagination: {
            prev: 'Previous page',
            next: 'Next page',
            label: 'Pages',
            of: '{{page}} of {{pages}}',
        },
    },
};
