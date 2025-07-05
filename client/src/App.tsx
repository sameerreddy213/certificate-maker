// client/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/ProtectedRoute';

// Corrected Imports: Use named imports { ComponentName } if the component file
// exports using 'export const ComponentName' or 'export class ComponentName'
import Index from './pages/Index'; // Confirmed as default export in previous messages
import { AuthPage } from './pages/AuthPage'; // Changed to named import
import { Dashboard } from './pages/Dashboard'; // Changed to named import
import { Templates } from './pages/Templates'; // Changed to named import
import { CreateTemplate } from './pages/CreateTemplate'; // Changed to named import
import { GenerateCertificates } from './pages/GenerateCertificates'; // Changed to named import
import { History } from './pages/History'; // Changed to named import
import NotFound from './pages/NotFound'; // Use default import for NotFound


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected Routes: This parent Route uses ProtectedRoute as its element.
              ProtectedRoute will render an <Outlet /> where the nested routes will appear. */}
          <Route element={<ProtectedRoute />}> {/* Changed from <ProtectedRoute><></></ProtectedRoute> */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/create" element={<CreateTemplate />} />
            <Route path="/certificates/generate" element={<GenerateCertificates />} />
            <Route path="/history" element={<History />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;