import { TuiRoot } from '@taiga-ui/core';
import { Component, inject } from '@angular/core';
import { LayoutComponent } from './layout/layout.component';
import { SeoService } from './services/seo.service';
import { ISeoData } from './services/interface/i-seo-data';

@Component({
    standalone: true,
    selector: 'app-root',
    imports: [LayoutComponent, TuiRoot],
    templateUrl: './app.component.html',
    styleUrl: './app.component.less',
})
export class AppComponent {
    private readonly seoService: SeoService = inject(SeoService);

    private readonly seo: ISeoData = {
        title: 'Last Hearth',

        description: 'Last Hearth - сервер по игре Vintage story',

        keywords:
            'Vintage story, Minecraft, рп сервер, Last Hearth, Vintage Story 1.20.12, Vintage Story сервер, Vintage Story сервер Россия, сервер Vintage Story, лучший Vintage Story сервер, Vintage Story онлайн, сервер выживания Vintage Story, ролевой сервер Vintage Story, средневековый сервер Vintage Story, Vintage Story с привилегиями, донат Vintage Story, Рыцарь Барон Граф Герцог, титулы Vintage Story, RP сервер Vintage Story, Vintage Story pvp сервер, Vintage Story pve сервер, бесплатный сервер Vintage Story, как играть Vintage Story онлайн, Vintage Story многопользовательский сервер, Vintage Story multiplayer, крафт Vintage Story сервер, строительство Vintage Story, Voxel игра сервер, Vintage Story моды, Vintage Story модификации, рпг сервер Vintage Story, open world Vintage Story сервер, реализм Vintage Story, Vanilla Vintage Story сервер, Vanilla+ сервер Vintage Story, лучшие сервера Vintage Story, средневековая песочница, Voxel RPG игра, Last Hearth сервер, Last Hearth Vintage Story, привилегии Vintage Story, донатный магазин Vintage Story, купить титул Vintage Story, игровой титул Рыцарь, игровой титул Барон, привилегии на сервере',

        robots: 'index, follow',

        url: 'https://lasthearth.ru/home',

        type: 'website',

        locale: 'ru_RU',

        siteName: 'Last Hearth',
    };

    /**
     * Инициализирует экземпляр класса {@link AppComponent}.
     */
    public constructor() {
        this.seoService.setSeoTags(this.seo);
    }
}
