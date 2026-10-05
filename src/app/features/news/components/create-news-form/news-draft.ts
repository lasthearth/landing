/**
 * Черновик новости, сохраняемый в localStorage.
 */
export interface NewsDraft {
    /**
     * Заголовок.
     */
    title: string;

    /**
     * Текст в разметке редактора.
     */
    content: string;
}
