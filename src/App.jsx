import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Places from './pages/Places'
import PlaceDetail from './pages/PlaceDetail'
import MerchantDetail from './pages/MerchantDetail'
import NewBill from './pages/NewBill'
import BillView from './pages/BillView'
import Billing from './pages/Billing'
import Received from './pages/Received'
import ReceivePayment from './pages/ReceivePayment'
import Flowers from './pages/Flowers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="places" element={<Places />} />
        <Route path="places/:placeId" element={<PlaceDetail />} />
        <Route path="merchants/:merchantId" element={<MerchantDetail />} />
        <Route path="merchants/:merchantId/new-bill" element={<NewBill />} />
        <Route path="merchants/:merchantId/receive" element={<ReceivePayment />} />
        <Route path="bills/:billId" element={<BillView />} />
        <Route path="billing" element={<Billing />} />
        <Route path="received" element={<Received />} />
        <Route path="flowers" element={<Flowers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
