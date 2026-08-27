import { registerTranslations, TranslationBundle } from '../translations/registry';

/**
 * Загружает компонент страницы вместе с её словарями переводов.
 *
 * Словари регистрируются до того, как роутер создаст компонент, поэтому
 * первый рендер уже видит переводы. Импорты идут параллельно и попадают
 * в один ленивый чанк, так что дополнительного запроса не возникает.
 *
 * @param loadComponent Загрузчик компонента страницы.
 * @param loadBundles Загрузчики словарей, нужных этой странице.
 * @returns Компонент страницы.
 */
export async function loadPage<T>(
    loadComponent: () => Promise<T>,
    loadBundles: Array<() => Promise<TranslationBundle>> = []
): Promise<T> {
    const [component, ...bundles] = await Promise.all([loadComponent(), ...loadBundles.map((load) => load())]);

    for (const bundle of bundles as TranslationBundle[]) {
        registerTranslations(bundle);
    }

    return component;
}
