import { Injectable, inject, Renderer2, RendererFactory2, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ISeoData } from '@core/types/i-seo-data';

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
     * @param seoData Данные для SEO.
     */
    public setSeoTags(seoData: ISeoData): void {
        this.title.setTitle(seoData.title);

        this.meta.updateTag({ name: 'description', content: seoData.description });
        this.meta.updateTag({ name: 'keywords', content: seoData.keywords });

        if (seoData.robots) {
            this.meta.updateTag({ name: 'robots', content: seoData.robots });
        }

        this.setOpenGraphTags(seoData);
        this.setTwitterCardTags(seoData);
        this.setCanonicalUrl(seoData.url);
    }

    /**
     * Устанавливает Open Graph метатеги.
     *
     * @param seoData Данные для SEO.
     */
    private setOpenGraphTags(seoData: ISeoData): void {
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

        if (seoData.image) {
            this.meta.updateTag({ property: 'og:image', content: seoData.image });
            this.meta.updateTag({ property: 'og:image:width', content: '1200' });
            this.meta.updateTag({ property: 'og:image:height', content: '630' });

            if (seoData.imageAlt) {
                this.meta.updateTag({ property: 'og:image:alt', content: seoData.imageAlt });
            }
        }
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

        if (seoData.image) {
            this.meta.updateTag({ name: 'twitter:image', content: seoData.image });

            if (seoData.imageAlt) {
                this.meta.updateTag({ name: 'twitter:image:alt', content: seoData.imageAlt });
            }
        }
    }

    /**
     * Устанавливает или обновляет канонический URL.
     *
     * @param url Канонический URL.
     */
    private setCanonicalUrl(url?: string): void {
        if (!this.canonicalLink) {
            this.canonicalLink = this.renderer.createElement('link') as HTMLLinkElement;
            this.renderer.setAttribute(this.canonicalLink, 'rel', 'canonical');
            this.renderer.appendChild(this.document.head, this.canonicalLink);
        }

        if (url) {
            this.renderer.setAttribute(this.canonicalLink, 'href', url);
        }
    }
}
