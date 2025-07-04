import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';

/**
 * Компонент разметки.
 */
@Component({
    standalone: true,
    selector: 'app-layout',
    imports: [RouterOutlet, HeaderComponent, FooterComponent],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {}
