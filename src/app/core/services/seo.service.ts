import { Injectable, inject, Renderer2, RendererFactory2, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ISeoData } from '@core/types/i-seo-data';

/**
 * Директива роботам по умолчанию: страница открыта для индексации.
 */
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large';

/**
 * Картинка для соцсетей по умолчанию.
 */
const DEFAULT_OG_IMAGE = 'https://lasthearth.ru/og-image.jpg';

/**
 * Сервис по работе с SEO данными приложения.
 */
@Injectable({
    providedIn: 'root',
})
export class SeoService {
    /**
     * Сервис устанавливающий заголовок в текущем HTML документе.
     */
    private readonly title: Title = inject(Title);

    /**
     * Сервис управляющий мета-тегами в разметке.
     */
    private readonly meta: Meta = inject(Meta);

    /**
     * Объект {@link Document}, предоставляющий доступ к DOM страницы.
     */
    private readonly document: Document = inject(DOCUMENT);

    /**
     * Объект {@link Renderer2} для безопасной работы с DOM.
     */
    private readonly renderer: Renderer2;

    /**
     * Канонический link-тег, если он был создан.
     */
    private canonicalLink: HTMLLinkElement | null = null;

    /**
     * Блоки структурированных данных по идентификатору.
     */
    private readonly jsonLd = new Map<string, HTMLScriptElement>();

    /**
     * Инициализирует экземпляр класса {@link SeoService}.
     *
     * @param rendererFactory2 Создает и инициализирует Renderer2.
     */
    constructor(rendererFactory2: RendererFactory2) {
        this.renderer = rendererFactory2.createRenderer(null, null);
    }

    /**
     * Устанавливает SEO-метатеги для текущей страницы.
     *
     * `robots` ставится всегда: страница «не найдено» объявляет `noindex`,
     * и без сброса этот тег остался бы на следующей открытой странице.
     * Ключевые слова поисковики не учитывают, поэтому тег только убирается.
     *
     * @param seoData Данные для SEO.
     */
    public setSeoTags(seoData: ISeoData): void {
        this.title.setTitle(seoData.title);
        this.meta.updateTag({ name: 'description', content: seoData.description });
        this.meta.updateTag({ name: 'robots', content: seoData.robots ?? DEFAULT_ROBOTS });

        this.setOpenGraphTags(seoData);
        this.setTwitterCardTags(seoData);
        this.setCanonicalUrl(seoData.url);

        this.meta.removeTag('name="keywords"');
    }

    /**
     * Устанавливает Open Graph метатеги.
     *
     * @param seoData Данные для SEO.
     */
    private setOpenGraphTags(seoData: ISeoData): void {
        const image = seoData.image || DEFAULT_OG_IMAGE;

        this.meta.updateTag({ property: 'og:title', content: seoData.title });
        this.meta.updateTag({ property: 'og:description', content: seoData.description });

        if (seoData.url) {
            this.meta.updateTag({ property: 'og:url', content: seoData.url });
        }

        if (seoData.type) {
            this.meta.updateTag({ property: 'og:type', content: seoData.type });
        }

        if (seoData.siteName) {
            this.meta.updateTag({ property: 'og:site_name', content: seoData.siteName });
        }

        if (seoData.locale) {
            this.meta.updateTag({ property: 'og:locale', content: seoData.locale });
        }

        // Превью ссылки есть у каждой страницы: без картинки мессенджеры
        // показывают пустую заглушку.
        this.meta.updateTag({ property: 'og:image', content: image });
        this.meta.updateTag({ property: 'og:image:width', content: '1200' });
        this.meta.updateTag({ property: 'og:image:height', content: '630' });
        this.meta.updateTag({ property: 'og:image:alt', content: seoData.imageAlt || seoData.title });
    }

    /**
     * Устанавливает Twitter Card метатеги.
     *
     * @param seoData Данные для SEO.
     */
    private setTwitterCardTags(seoData: ISeoData): void {
        this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.meta.updateTag({ name: 'twitter:title', content: seoData.title });
        this.meta.updateTag({ name: 'twitter:description', content: seoData.description });
        this.meta.updateTag({ name: 'twitter:image', content: seoData.image || DEFAULT_OG_IMAGE });

        if (seoData.imageAlt) {
            this.meta.updateTag({ name: 'twitter:image:alt', content: seoData.imageAlt });
        }
    }

    /**
     * Устанавливает, обновляет или убирает канонический URL.
     *
     * У страницы без своего адреса (страница «не найдено») канонической ссылки
     * быть не должно: иначе робот склеит её с той страницей, на которую указывает.
     *
     * @param url Канонический URL.
     */
    private setCanonicalUrl(url?: string): void {
        if (!url) {
            if (this.canonicalLink) {
                this.renderer.removeChild(this.document.head, this.canonicalLink);
                this.canonicalLink = null;
            }

            return;
        }

        if (!this.canonicalLink) {
            this.canonicalLink = this.renderer.createElement('link') as HTMLLinkElement;
            this.renderer.setAttribute(this.canonicalLink, 'rel', 'canonical');
            this.renderer.appendChild(this.document.head, this.canonicalLink);
        }

        this.renderer.setAttribute(this.canonicalLink, 'href', url);
    }

    /**
     * Ставит или убирает блок структурированных данных страницы.
     *
     * @param id Идентификатор блока: повторный вызов с тем же id заменяет его.
     * @param data Объект schema.org или `null`, чтобы убрать блок.
     */
    public setJsonLd(id: string, data: object | null): void {
        const existing = this.jsonLd.get(id);

        if (!data) {
            if (existing) {
                this.renderer.removeChild(this.document.head, existing);
                this.jsonLd.delete(id);
            }

            return;
        }

        const script = existing ?? this.renderer.createElement('script');

        if (!existing) {
            this.renderer.setAttribute(script, 'type', 'application/ld+json');
            this.renderer.setAttribute(script, 'id', `ld-${id}`);
            this.renderer.appendChild(this.document.head, script);
            this.jsonLd.set(id, script);
        }

        // Текст статьи не должен уметь закрыть тег: `<` уезжает в экранированном виде.
        this.renderer.setProperty(script, 'textContent', JSON.stringify(data).replace(/</g, '\\u003c'));
    }
}
