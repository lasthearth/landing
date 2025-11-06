import { Component, input, InputSignal, OnInit } from '@angular/core';

@Component({
    selector: 'app-leader-card',
    templateUrl: './leader-card.component.html',
    styleUrls: ['./leader-card.component.css'],
})
export class LeaderCardComponent {
    public isBigSize: InputSignal<boolean> = input<boolean>(false);

    public playerName: InputSignal<string> = input.required<string>();

    public ratingPlace: InputSignal<string> = input.required<string>();

    public type: InputSignal<'Смертей' | 'Убийств' | 'Часов'> = input.required<'Смертей' | 'Убийств' | 'Часов'>();

    public count: InputSignal<number> = input.required<number>();
}
