import MerchantPicker from '../components/MerchantPicker'
import { useLang } from '../context/LanguageContext'

// "Bill" flow: choose place -> merchant -> go straight to the new-bill screen.
export default function Billing() {
  const { t } = useLang()
  return (
    <MerchantPicker
      icon="🧾"
      title={t('newBill')}
      destination={(merchantId) => `/merchants/${merchantId}/new-bill`}
    />
  )
}
