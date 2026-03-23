import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { HeaderActionsProvider } from './contexts/HeaderActionsContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <HeaderActionsProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors />
      </HeaderActionsProvider>
    </AuthProvider>
  );
}