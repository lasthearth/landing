/**
 * Публичный API фичи "Реферальная программа".
 *
 * Экспортирует виджет профиля, блок ступеней выплат (он же стоит на главной)
 * и сервис автоматического применения кода из URL.
 */

export { ReferralWidgetComponent } from './components/referral-widget/referral-widget.component';
export { ReferralPayoutComponent } from './components/referral-payout/referral-payout.component';
export { ReferralApplierService } from './services/referral-applier.service';
