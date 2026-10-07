import { LfgPost, LfgPostDto } from './lfg.types';

/**
 * Превращает объявление из API в модель интерфейса.
 *
 * @param dto Объявление из API.
 * @returns Объявление.
 */
export function mapLfgPostDto(dto: LfgPostDto): LfgPost {
    const createdAt = new Date(dto.created_at);
    return {
        id: dto.id,
        authorId: dto.author_id,
        kind: dto.kind ?? 'POST_KIND_SESSION',
        activities: dto.activities?.length ? dto.activities : ['ACTIVITY_OTHER'],
        title: dto.title ?? '',
        description: dto.description ?? '',
        startsAt: dto.starts_at ? new Date(dto.starts_at) : null,
        slots: dto.slots ?? 1,
        responders: dto.responders ?? [],
        closed: !!dto.closed,
        expiresAt: new Date(dto.expires_at),
        createdAt,
        bumpedAt: dto.bumped_at ? new Date(dto.bumped_at) : createdAt,
        playDays: dto.play_days ?? [],
        playTimes: dto.play_times ?? [],
        experience: dto.experience && dto.experience !== 'EXPERIENCE_UNSPECIFIED' ? dto.experience : null,
        voice: !!dto.voice,
        hasContact: !!dto.has_contact,
    };
}
