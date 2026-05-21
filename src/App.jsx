import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Products from './pages/Products';
import DocumentList from './pages/DocumentList';
import PurchaseInvoice from './pages/PurchaseInvoice';
import Quotation from './pages/Quotation';
import DocumentTypeSelection from './pages/DocumentTypeSelection';
import SaleInvoice from './pages/SaleInvoice';
import SaleOrder from './pages/SaleOrder';
import PurchaseOrder from './pages/PurchaseOrder';
import Reports from './pages/Reports';
import Compliance from './pages/Compliance';
import Settings from './pages/Settings';
import InwardPayment from './pages/InwardPayment';
import CreateInwardPayment from './pages/CreateInwardPayment';
import OutwardPayment from './pages/OutwardPayment';
import CreateOutwardPayment from './pages/CreateOutwardPayment';
import ProfitLossOverview from './pages/ProfitLossOverview';
import DeliveryChallan from './pages/DeliveryChallan';
import ProformaInvoice from './components/ProformaInvoice';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Ledger from './pages/Ledger';
import ContactLedger from './pages/ContactLedger';
import JobWork from './pages/JobWork';
import CreditNote from './pages/CreditNote';
import DebitNote from './pages/DebitNote';
import Letters from './pages/Letters/Letters';
import SpreadsheetEditor from './pages/SpreadsheetEditor';
import WordProcessor from './pages/WordProcessor';
import PresentationEditor from './pages/PresentationEditor';
import EditorHub from './pages/EditorHub';
import Staff from './pages/Staff';
import StaffAccount from './pages/StaffAccount';
import ContactProfile from './pages/ContactProfile';
import StaffProfile from './pages/StaffProfile';
import StaffSalaryHistory from './pages/StaffSalaryHistory';
import RecordStaffPayment from './pages/RecordStaffPayment';
import ProductProfile from './pages/ProductProfile';
import DailyExpenses from './pages/DailyExpenses';
import AddDailyExpense from './pages/AddDailyExpense';
import OtherIncome from './pages/OtherIncome';
import AddOtherIncome from './pages/AddOtherIncome';
import LoanManager from './pages/LoanManager';
import LoanDetails from './pages/LoanDetails';
import AddLoan from './pages/AddLoan';
import LoanTransactions from './pages/LoanTransactions';
import PaymentDetails from './pages/PaymentDetails';
import CreditReport from './pages/CreditReport';
import AdvancedLoanCalculator from './pages/AdvancedLoanCalculator';
import BankManager from './pages/BankManager';
import BankDetails from './pages/BankDetails';
import BankingReport from './pages/BankingReport';
import { LanguageProvider } from './contexts/LanguageContext';
import HistorySection from './pages/HistorySection';
import SearchResults from './pages/SearchResults';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Meet from './pages/Meet';
import NetworkHub from './pages/NetworkHub';
import PublicProfile from './pages/PublicProfile';
import PublicProductDetail from './pages/PublicProductDetail';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <Routes>

            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/p/:id" element={
              <Layout noWrapper={true}>
                <PublicProfile />
              </Layout>
            } />
            <Route path="/product/:id" element={
              <Layout noWrapper={true}>
                <PublicProductDetail />
              </Layout>
            } />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout extended={true}>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/contacts" element={
              <ProtectedRoute>
                <Layout>
                  <Contacts />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/contacts/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ContactProfile />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute>
                <Layout>
                  <Products />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/products/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ProductProfile />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <Layout>
                  <DocumentList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/select" element={
              <ProtectedRoute>
                <Layout noWrapper={true}>
                  <DocumentTypeSelection />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/sale/new" element={
              <ProtectedRoute>
                <Layout>
                  <SaleInvoice />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/sale/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <SaleInvoice />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/purchase/new" element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseInvoice />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/purchase/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseInvoice />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/quotation/new" element={
              <ProtectedRoute>
                <Layout>
                  <Quotation />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/quotation/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <Quotation />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/purchase-order/new" element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseOrder />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/purchase-order/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseOrder />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/sale-order/new" element={
              <ProtectedRoute>
                <Layout>
                  <SaleOrder />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/sale-order/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <SaleOrder />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/delivery-challan/new" element={
              <ProtectedRoute>
                <Layout>
                  <DeliveryChallan />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/delivery-challan/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <DeliveryChallan />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/job-work/new" element={
              <ProtectedRoute>
                <Layout>
                  <JobWork />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/job-work/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <JobWork />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/letters/new" element={
              <ProtectedRoute>
                <Layout noWrapper={true}>
                  <Letters />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/letters/edit/:id" element={
              <ProtectedRoute>
                <Layout noWrapper={true}>
                  <Letters />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/editor" element={
              <ProtectedRoute>
                <Layout>
                  <EditorHub />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/editor/spreadsheet" element={
              <ProtectedRoute>
                <Layout>
                  <SpreadsheetEditor />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/editor/spreadsheet/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <SpreadsheetEditor />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/word-processor" element={
              <ProtectedRoute>
                <Layout>
                  <WordProcessor />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/word-processor/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <WordProcessor />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/presentations" element={
              <ProtectedRoute>
                <Layout>
                  <PresentationEditor />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/presentations/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <PresentationEditor />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/credit-note/new" element={
              <ProtectedRoute>
                <Layout>
                  <CreditNote />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/credit-note/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <CreditNote />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/debit-note/new" element={
              <ProtectedRoute>
                <Layout>
                  <DebitNote />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/debit-note/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <DebitNote />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/proforma/new" element={
              <ProtectedRoute>
                <Layout>
                  <ProformaInvoice />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/documents/proforma/edit/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ProformaInvoice />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/payments/inward" element={
              <ProtectedRoute>
                <Layout>
                  <InwardPayment />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/payments/inward/new" element={
              <ProtectedRoute>
                <Layout>
                  <CreateInwardPayment />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/payments/outward" element={
              <ProtectedRoute>
                <Layout>
                  <OutwardPayment />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/payments/outward/new" element={
              <ProtectedRoute>
                <Layout>
                  <CreateOutwardPayment />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/payments/profit-loss" element={
              <ProtectedRoute>
                <Layout extended={true}>
                  <ProfitLossOverview />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <Layout>
                    <HistorySection />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/compliance" element={
              <ProtectedRoute>
                <Layout>
                  <Compliance />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/ledger" element={
              <ProtectedRoute>
                <Layout>
                  <Ledger />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/ledger/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ContactLedger />
                </Layout>
              </ProtectedRoute>
            } />


            <Route path="/staff" element={
              <ProtectedRoute>
                <Layout>
                  <Staff />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/account/:id" element={
              <ProtectedRoute>
                <Layout>
                  <StaffAccount />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/profile/:id" element={
              <ProtectedRoute>
                <Layout>
                  <StaffProfile />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/salary-history/:id" element={
              <ProtectedRoute>
                <Layout>
                  <StaffSalaryHistory />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff/record-payment/:id" element={
              <ProtectedRoute>
                <Layout>
                  <RecordStaffPayment />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/expenses/daily" element={
              <ProtectedRoute>
                <Layout>
                  <DailyExpenses />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/expenses/daily/new" element={
              <ProtectedRoute>
                <Layout extended={true}>
                  <AddDailyExpense />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/expenses/daily/edit/:id" element={
              <ProtectedRoute>
                <Layout extended={true}>
                  <AddDailyExpense />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/income/other" element={
              <ProtectedRoute>
                <Layout>
                  <OtherIncome />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/income/other/new" element={
              <ProtectedRoute>
                <Layout extended={true}>
                  <AddOtherIncome />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/income/other/edit/:id" element={
              <ProtectedRoute>
                <Layout extended={true}>
                  <AddOtherIncome />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/loans" element={
              <ProtectedRoute>
                <Layout>
                  <LoanManager />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/loan-calculator" element={
              <ProtectedRoute>
                <Layout>
                  <AdvancedLoanCalculator />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/loans/new" element={
              <ProtectedRoute>
                <Layout>
                  <AddLoan />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/loans/:id" element={
              <ProtectedRoute>
                <Layout>
                  <LoanDetails />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/loans/:id/transactions" element={
              <ProtectedRoute>
                <Layout>
                  <LoanTransactions />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Catch all - Redirect to dashboard */}
            <Route path="/loans/:id/transactions/:txId" element={
              <ProtectedRoute>
                <Layout>
                  <PaymentDetails />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/banks" element={
              <ProtectedRoute>
                <Layout>
                  <BankManager />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/banks/:id" element={
              <ProtectedRoute>
                <Layout>
                  <BankDetails />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/banking-report" element={
              <ProtectedRoute>
                <Layout>
                  <BankingReport />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/credit-report" element={
              <ProtectedRoute>
                <Layout>
                  <CreditReport />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/projects" element={
              <ProtectedRoute>
                <Layout>
                  <Projects />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ProjectDetails />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/meet" element={
              <ProtectedRoute>
                <Layout>
                  <Meet />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/network" element={
              <ProtectedRoute>
                <Layout>
                  <NetworkHub />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/search" element={
              <ProtectedRoute>
                <Layout noWrapper>
                  <SearchResults />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </LanguageProvider>
      </AuthProvider>
    </Router>

  );
}

export default App;
