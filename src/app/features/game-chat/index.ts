/**
 * Публичный API слайса "Game Chat".
 *
 * Другие слайсы импортируют только отсюда: @features/game-chat.
 * Внутренние файлы снаружи не читаются — проверяет scripts/check-architecture.mjs.
 */

export * from './model/game-chat-message';
export * from './services/game-chat.service';
export * from './ui/game-chat-widget/game-chat-widget.component';
