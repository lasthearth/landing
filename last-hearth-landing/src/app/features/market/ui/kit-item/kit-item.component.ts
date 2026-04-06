import { Component, input, InputSignal } from '@angular/core';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';
import { KitItem } from '../../interfaces/kit-item.interface';
import { TuiHint, TuiHintDirective } from '@taiga-ui/core';

@Component({
    selector: 'app-kit-item',
    imports: [TuiBadgedContent, TuiBadgeNotification, TuiHintDirective, TuiHint],
    templateUrl: './kit-item.component.html',
})
export class KitItemComponent {
    public data: InputSignal<KitItem> = input.required();
}
