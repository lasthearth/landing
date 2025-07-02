import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Компонент лендинга.
 */
@Component({
    standalone: true,
    selector: 'app-landing',
    imports: [RouterOutlet],
    templateUrl: './landing.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {}
