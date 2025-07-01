import { DOCUMENT } from "@angular/common";
import { Injectable, inject, Renderer2, RendererFactory2 } from "@angular/core";
import { Title, Meta } from "@angular/platform-browser";

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
     * Объект {@link Document}, предоставляющий доступ к DOM страницы.
     */
    private readonly renderer: Renderer2;

    /**
     * Инициализирует экземпляр класса {@link SeoService}.
     *
     * @param rendererFactory2 Создает и инициализирует Renderer2.
     */
    constructor(rendererFactory2: RendererFactory2) {
        this.renderer = rendererFactory2.createRenderer(null, null);

        this.meta.updateTag({ name: 'description', content: 'Last Hearth - сервер по игре Vintage story' });
        this.meta.updateTag({ name: 'keywords', content: 'Vintage story Minecraft рп сервер Last Hearth' });
    }

    // /**
    //  * Устанавливает SEO параметры
    //  *
    //  * @param seoData Данные для SEO
    //  */
    // setSeoTags(seoData: ISeoData): void {
    //     this.title.setTitle(seoData.title);
    //     this.meta.updateTag({ property: 'og:title', content: seoData.title });

    //     this.meta.updateTag({ name: 'description', content: seoData.description });
    //     this.meta.updateTag({ property: 'og:description', content: seoData.description });

    //     this.meta.updateTag({ name: 'keywords', content: seoData.keywords });

    //     this.meta.updateTag({ property: 'og:url', content: seoData.url });

    //     if (seoData.canonicalUrl) {
    //         try {
    //             const canonicalLink = this.renderer.selectRootElement('link[rel="canonical"]', true) as HTMLLinkElement;

    //             this.renderer.setAttribute(canonicalLink, 'href', seoData.canonicalUrl);
    //         } catch {
    //             const link = this.renderer.createElement('link') as HTMLLinkElement;

    //             this.renderer.setAttribute(link, 'rel', 'canonical');
    //             this.renderer.setAttribute(link, 'href', seoData.canonicalUrl);
    //             this.renderer.appendChild(this.document.head, link);
    //         }
    //     }

    //     if (seoData.image) {
    //         this.meta.updateTag({ property: 'og:image', content: seoData.image });
    //     }
    // }
}
