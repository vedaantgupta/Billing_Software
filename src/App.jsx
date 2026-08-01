import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Layout from '@/components/layout/Layout';

// Pages
import Dashboard from '@/features/dashboard/pages/Dashboard';
import Contacts from '@/features/contacts/pages/Contacts';
import Products from '@/features/products/pages/Products';
import DocumentList from '@/features/documents/components/DocumentList';
import PurchaseInvoice from '@/features/documents/pages/PurchaseInvoice';
import Quotation from '@/features/documents/pages/Quotation';
import DocumentTypeSelection from '@/features/documents/components/DocumentTypeSelection';
import SaleInvoice from '@/features/documents/pages/SaleInvoice';
import SaleOrder from '@/features/documents/pages/SaleOrder';
import PurchaseOrder from '@/features/documents/pages/PurchaseOrder';
import Reports from '@/features/reports/pages/Reports';
import Compliance from '@/features/compliance/pages/Compliance';
import Settings from '@/features/settings/pages/Settings';
import InwardPayment from '@/features/documents/pages/InwardPayment';
import CreateInwardPayment from '@/features/documents/pages/CreateInwardPayment';
import OutwardPayment from '@/features/documents/pages/OutwardPayment';
import CreateOutwardPayment from '@/features/documents/pages/CreateOutwardPayment';
import ProfitLossOverview from '@/features/dashboard/pages/ProfitLossOverview';
import DeliveryChallan from '@/features/documents/pages/DeliveryChallan';
import ProformaInvoice from '@/features/documents/components/ProformaInvoice';
import Login from '@/features/auth/pages/Login';
import Register from '@/features/auth/pages/Register';
import ForgotPassword from '@/features/auth/pages/ForgotPassword';
import Ledger from '@/pages/Ledger';
import ContactLedger from '@/features/contacts/pages/ContactLedger';
import JobWork from '@/features/documents/pages/JobWork';
import CreditNote from '@/features/documents/pages/CreditNote';
import DebitNote from '@/features/documents/pages/DebitNote';
import Letters from '@/features/letters/pages/Letters';
import SpreadsheetEditor from '@/features/tools/pages/SpreadsheetEditor';
import WordProcessor from '@/features/tools/pages/WordProcessor';
import PresentationEditor from '@/pages/PresentationEditor';
import EditorHub from '@/pages/EditorHub';
import BusinessCardEditor from '@/features/tools/pages/BusinessCardEditor';
import CardBuilderHome from '@/features/tools/pages/CardBuilderHome';
import Staff from '@/features/staff/pages/Staff';
import StaffAccount from '@/features/staff/pages/StaffAccount';
import ContactProfile from '@/features/contacts/pages/ContactProfile';
import StaffProfile from '@/features/staff/pages/StaffProfile';
import StaffSalaryHistory from '@/features/staff/pages/StaffSalaryHistory';
import RecordStaffPayment from '@/features/staff/pages/RecordStaffPayment';
import ProductProfile from '@/features/products/pages/ProductProfile';
import DailyExpenses from '@/features/expenses/pages/DailyExpenses';
import AddDailyExpense from '@/features/expenses/pages/AddDailyExpense';
import OtherIncome from '@/features/accounting/pages/OtherIncome';
import AddOtherIncome from '@/features/accounting/pages/AddOtherIncome';
import LoanManager from '@/features/banking/pages/LoanManager';
import LoanDetails from '@/features/banking/pages/LoanDetails';
import AddLoan from '@/features/banking/pages/AddLoan';
import LoanTransactions from '@/features/banking/pages/LoanTransactions';
import PaymentDetails from '@/features/documents/pages/PaymentDetails';
import CreditReport from '@/features/banking/pages/CreditReport';
import AdvancedLoanCalculator from '@/features/banking/pages/AdvancedLoanCalculator';
import BankManager from '@/features/banking/pages/BankManager';
import BankDetails from '@/features/banking/pages/BankDetails';
import BankingReport from '@/features/reports/pages/BankingReport';
import { LanguageProvider } from '@/contexts/LanguageContext';
import HistorySection from '@/pages/HistorySection';
import SearchResults from '@/pages/SearchResults';
import Projects from '@/features/projects/pages/Projects';
import ProjectDetails from '@/features/projects/pages/ProjectDetails';
import Meet from '@/features/projects/pages/Meet';
import NetworkHub from '@/pages/NetworkHub';
import PublicProfile from '@/pages/PublicProfile';
import PublicProductDetail from '@/features/products/pages/PublicProductDetail';

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
            <Route path="/editor/business-card" element={
            <ProtectedRoute>
              <Layout noWrapper={true}>
                <CardBuilderHome />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/editor/business-card/editor" element={
            <ProtectedRoute>
              <Layout noWrapper={true}>
                <BusinessCardEditor />
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
