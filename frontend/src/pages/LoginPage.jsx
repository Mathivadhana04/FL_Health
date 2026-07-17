import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontSize: '15px',
    color: '#e2e8f0',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '14px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: '1.5px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(124,58,237,0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#7c3aed',
      borderWidth: '1.5px',
    },
    '&.Mui-focused': {
      background: 'rgba(124,58,237,0.04)',
    },
  },
  '& .MuiInputLabel-root': {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    '&.Mui-focused': { color: '#7c3aed' },
  },
  '& .MuiFormHelperText-root': {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontSize: '12px',
    mt: 0.5,
  },
};

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setServerError(message);
    }
  };

  return (
    <Box>
      <Typography
        sx={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '32px',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.5px',
          mb: 1,
        }}
      >
        Welcome back
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '15px',
          color: 'rgba(255,255,255,0.45)',
          mb: 4.5,
        }}
      >
        Sign in to your account to continue
      </Typography>

      {serverError && (
        <Alert
          severity="error"
          sx={{
            mb: 3.5,
            borderRadius: '14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: '14px',
            '& .MuiAlert-icon': { color: '#f87171' },
          }}
        >
          {serverError}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <TextField
          label="Email address"
          type="email"
          fullWidth
          autoComplete="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address',
            },
          })}
          error={!!errors.email}
          helperText={errors.email?.message}
          sx={inputSx}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          autoComplete="current-password"
          {...register('password', {
            required: 'Password is required',
          })}
          error={!!errors.password}
          helperText={errors.password?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#7c3aed' } }}
                >
                  {showPassword ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={inputSx}
        />

        <Button
          type="submit"
          fullWidth
          disabled={isSubmitting}
          sx={{
            mt: 1,
            py: 1.8,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
            color: '#fff',
            fontFamily: '"Outfit", sans-serif',
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'none',
            boxShadow: '0 4px 24px rgba(124,58,237,0.25)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: 'linear-gradient(135deg, #6d28d9 0%, #2563eb 100%)',
              boxShadow: '0 6px 32px rgba(124,58,237,0.4)',
              transform: 'translateY(-1.5px)',
            },
            '&:active': { transform: 'translateY(0)' },
            '&.Mui-disabled': {
              background: 'rgba(124,58,237,0.3)',
              color: 'rgba(255,255,255,0.4)',
            },
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.7)' }} />
          ) : (
            'Sign in'
          )}
        </Button>
      </Box>

      <Typography
        sx={{
          mt: 4.5,
          textAlign: 'center',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.35)',
        }}
      >
        Don&apos;t have an account?{' '}
        <Box
          component={Link}
          to="/register"
          sx={{
            color: '#7c3aed',
            textDecoration: 'none',
            fontWeight: 600,
            '&:hover': { color: '#9f67ff', textDecoration: 'underline' },
          }}
        >
          Create one
        </Box>
      </Typography>
    </Box>
  );
};

export default LoginPage;
