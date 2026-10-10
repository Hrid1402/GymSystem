import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';

function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <AppRouter />
    </AuthProvider>
  );
}

export default App;