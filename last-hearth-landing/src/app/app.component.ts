import { TuiRoot } from "@taiga-ui/core";
import { Component, inject } from '@angular/core';
import { LayoutComponent } from './layout/layout.component';
import { SeoService } from "./services/seo.service";

@Component({
    standalone: true,
    selector: 'app-root',
    imports: [LayoutComponent, TuiRoot],
    templateUrl: './app.component.html',
    styleUrl: './app.component.less'
})
export class AppComponent {
    private readonly seoService: SeoService = inject(SeoService);
}
