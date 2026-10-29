/**
 * Идентификатор типа ключевой точки.
 *
 * Значение же служит ключом словаря (`keyPoints.points.<id>`)
 * и параметром адреса `/key-points?point=<id>`.
 */
export type KeyPointId = 'mine' | 'fort' | 'harbor' | 'industry' | 'trade';
