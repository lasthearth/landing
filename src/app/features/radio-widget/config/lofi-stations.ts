import { RadioStation } from '../model/radio-station';

/**
 * Жёстко заданный список lo-fi стримов с YouTube.
 */
export const DEFAULT_LOFI_STATIONS: RadioStation[] = [
    {
        id: 'JD-kMIpDfnY',
        name: 'Lofi Girl - beats to relax/study to',
        streamUrl: 'https://www.youtube.com/embed/JD-kMIpDfnY?autoplay=1&mute=0',
        thumbnailUrl: 'https://img.youtube.com/vi/JD-kMIpDfnY/mqdefault.jpg',
    },
    {
        id: '4xDzrJKXOOY',
        name: 'Lofi Girl - beats to sleep/chill to',
        streamUrl: 'https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1&mute=0',
        thumbnailUrl: 'https://img.youtube.com/vi/4xDzrJKXOOY/mqdefault.jpg',
    },
    {
        id: 'IxPANmjPaek',
        name: 'Chill lofi radio',
        streamUrl: 'https://www.youtube.com/embed/IxPANmjPaek?autoplay=1&mute=0',
        thumbnailUrl: 'https://img.youtube.com/vi/IxPANmjPaek/mqdefault.jpg',
    },
    {
        id: 'X4VbdwhkE10',
        name: 'Lofi hip hop radio',
        streamUrl: 'https://www.youtube.com/embed/X4VbdwhkE10?autoplay=1&mute=0',
        thumbnailUrl: 'https://img.youtube.com/vi/X4VbdwhkE10/mqdefault.jpg',
    },
];
