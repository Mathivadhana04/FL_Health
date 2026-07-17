import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './routes/ProtectedRoute';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FLDashboardPage from './pages/FLDashboardPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c3aed' },
    secondary: { main: '#3b82f6' },
    background: { default: '#0a0a0f', paper: '#111118' },
    text: { primary: '#e2e8f0', secondary: 'rgba(255,255,255,0.45)' },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@import': [
          "url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap')",
        ],
        body: {
          background: '#0a0a0f',
        },
        '*': {
          boxSizing: 'border-box',
        },
        '::-webkit-scrollbar': { width: '6px' },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: 'rgba(124,58,237,0.3)',
          borderRadius: '3px',
        },
      },
    },
  },
});

const DashboardPage = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 3,
        p: 4,
      }}
    >
      <Box
        sx={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          p: 5,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '26px',
          }}
        >
          ✨
        </Box>
        <Typography
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontSize: '26px',
            fontWeight: 800,
            color: '#fff',
            mb: 1,
          }}
        >
          Welcome, {user?.firstName}!
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', mb: 3 }}>
          {user?.email}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 2,
            py: 0.75,
            borderRadius: '8px',
            background: isAdmin()
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(124,58,237,0.15)',
            border: `1px solid ${isAdmin() ? 'rgba(239,68,68,0.3)' : 'rgba(124,58,237,0.3)'}`,
            mb: 4,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: isAdmin() ? '#fca5a5' : '#a78bfa',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {user?.role}
          </Typography>
        </Box>
        
        <Button
          fullWidth
          onClick={() => navigate('/fl-dashboard')}
          sx={{
            py: 1.4,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            color: '#fff',
            fontFamily: '"Syne", sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'none',
            mb: 2,
            '&:hover': {
              background: 'linear-gradient(135deg, #6d28d9, #2563eb)',
            },
          }}
        >
          Open Federated Learning Workspace
        </Button>

        <Button
          fullWidth
          onClick={handleLogout}
          sx={{
            py: 1.4,
            borderRadius: '12px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5',
            fontFamily: '"Syne", sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': {
              background: 'rgba(239,68,68,0.2)',
            },
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );
};

const UnauthorizedPage = () => (
  <Box
    sx={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <Typography sx={{ fontFamily: '"Syne", sans-serif', fontSize: '48px', fontWeight: 800, color: '#fff' }}>
      403
    </Typography>
    <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>
      You are not authorized to view this page.
    </Typography>
  </Box>
);

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/fl-dashboard" element={<FLDashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route
                path="/admin"
                element={
                  <Box sx={{ p: 4, color: '#fff', fontFamily: '"Syne", sans-serif' }}>
                    Admin Panel
                  </Box>
                }
              />
            </Route>

            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;

