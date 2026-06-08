import { TagKey } from '../active-tag/active-tag.component';

export interface Tag {
    id: string;
    text: string;
    action: 'add' | 'remove' | 'custom';
    type: TagKey;
    unique?: boolean;
    disabled: boolean;
}
