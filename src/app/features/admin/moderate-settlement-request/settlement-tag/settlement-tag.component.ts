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
        east: 'bg-lh-tag-coral-bg text-lh-tag-coral',
        west: 'bg-lh-tag-cyan-bg text-lh-tag-cyan',
        suzerain: 'bg-lh-tag-purple-bg text-lh-tag-purple',
    };

    protected readonly tagClasses = computed(() => {
        return this.colorMap[this.type()];
    });
}
