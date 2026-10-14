import { buildPaginationPages } from './build-pagination-pages.function';

describe('buildPaginationPages', () => {
    it('на одной странице показывает один номер', () => {
        expect(buildPaginationPages(1, 1)).toEqual([1]);
    });

    it('короткий список показывает целиком', () => {
        expect(buildPaginationPages(1, 2)).toEqual([1, 2]);
        expect(buildPaginationPages(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('длинный список сворачивает в окно вокруг текущей страницы', () => {
        expect(buildPaginationPages(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12]);
    });

    it('на первой странице окно сдвинуто к началу', () => {
        expect(buildPaginationPages(1, 12)).toEqual([1, 2, 'gap', 12]);
    });

    it('на последней странице окно сдвинуто к концу', () => {
        expect(buildPaginationPages(12, 12)).toEqual([1, 'gap', 11, 12]);
    });

    it('некорректные значения не ломают нумерацию', () => {
        expect(buildPaginationPages(0, 0)).toEqual([1]);
        expect(buildPaginationPages(9, 3)).toEqual([1, 2, 3]);
    });
});
