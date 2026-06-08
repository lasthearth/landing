import { NgClass } from '@angular/common';
import { Component, computed, input, InputSignal, OnInit, output, OutputEmitterRef } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

export type TagKey = 'east' | 'west' | 'suzerain';

@Component({
    selector: 'app-active-tag',
    imports: [TuiIcon],
    templateUrl: './active-tag.component.html',
})
export class ActiveTagComponent {
    type = input.required<TagKey>();
    text = input.required<string>();
    uppercase = input<boolean>(true);
    disabled = input<boolean>(false);
    icon = input<string>();
    action: InputSignal<'add' | 'remove' | 'custom'> = input<'add' | 'remove' | 'custom'>('add');
    tagWasClicked: OutputEmitterRef<'add' | 'remove' | 'custom'> = output<'add' | 'remove' | 'custom'>();

    private readonly colorMap: Record<TagKey, string> = {
        east: 'bg-lh-tag-coral text-white',
        west: 'bg-lh-tag-cyan text-white',
        suzerain: 'bg-lh-tag-purple text-white',
    };

    protected readonly tagClasses = computed(() => {
        return this.colorMap[this.type()];
    });

    protected getIcon() {
        switch (this.action()) {
            case 'add':
                return '@tui.circle-plus';
            case 'remove':
                return '@tui.trash-2';
            default:
                return this.icon();
        }
    }
}
