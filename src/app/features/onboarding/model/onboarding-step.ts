import { OnboardingStepKey } from './onboarding-step-key';
import { OnboardingStepState } from './onboarding-step-state';

/**
 * Шаг пути новичка для вывода.
 */
export interface OnboardingStep {
    /**
     * Какой это шаг.
     */
    key: OnboardingStepKey;

    /**
     * Состояние шага.
     */
    state: OnboardingStepState;

    /**
     * Шаг по желанию: не мешает считать путь пройденным.
     */
    optional: boolean;
}
