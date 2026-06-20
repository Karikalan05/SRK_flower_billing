import MerchantPicker from '../components/MerchantPicker'
import { useLang } from '../context/LanguageContext'

// "Received" flow: choose place -> merchant -> open the merchant page where you
// record the money received and see their bills in date order.
export default function Received() {
  const { t } = useLang()
  return (
    <MerchantPicker
      icon="💰"
      title={t('receivePayment')}
      destination={(merchantId) => `/merchants/${merchantId}/receive`}
    />
  )
}
