import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;