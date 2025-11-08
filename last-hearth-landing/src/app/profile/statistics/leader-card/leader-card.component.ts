import { NgClass, NgIf } from '@angular/common';
import { Component, input, InputSignal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

@Component({
    standalone: true,
    selector: 'app-leader-card',
    imports: [NgClass, NgIf, TuiIcon],
    templateUrl: './leader-card.component.html',
    styleUrls: ['./leader-card.component.css'],
})
export class LeaderCardComponent {
    public isBigSize: InputSignal<boolean> = input<boolean>(false);

    public playerName: InputSignal<string> = input.required<string>();

    public ratingPlace: InputSignal<string> = input.required<string>();

    public type: InputSignal<'Смертей' | 'Убийств' | 'Часов'> = input.required<'Смертей' | 'Убийств' | 'Часов'>();

    public count: InputSignal<number> = input.required<number>();

    public userImage: InputSignal<string | undefined> = input<string | undefined>();

    public borderClass(): string {
        const place = this.ratingPlace();

        if (place === '1') {
            return 'card-frame--gold';
        }

        if (place === '2') {
            return 'card-frame--silver';
        }

        if (place === '3') {
            return 'card-frame--bronze';
        }

        return 'card-frame--default';
    }
}
