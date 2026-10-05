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
}
