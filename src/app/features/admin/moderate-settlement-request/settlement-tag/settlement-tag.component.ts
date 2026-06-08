import { Component, computed, input, InputSignal, OnInit, output, OutputEmitterRef } from '@angular/core';
import { TagKey } from '../active-tag/active-tag.component';

@Component({
    selector: 'app-settlement-tag',
    templateUrl: './settlement-tag.component.html',
})
export class SettlementTagComponent {
    type = input.required<TagKey>();
    text = input.required<string>();
    uppercase = input<boolean>(true);

    private readonly colorMap: Record<TagKey, string> = {
        east: 'bg-lh-tag-coral text-white',
        west: 'bg-lh-tag-cyan text-white',
        suzerain: 'bg-lh-tag-purple text-white',
    };

    protected readonly tagClasses = computed(() => {
        return this.colorMap[this.type()];
    });
}
