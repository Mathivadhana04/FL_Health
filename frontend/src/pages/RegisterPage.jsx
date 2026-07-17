import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BrushIcon from '@mui/icons-material/Brush';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
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

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'CREATOR',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await registerUser(data);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.fieldErrors?.email ||
        'Registration failed. Please try again.';
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
        Create account
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '15px',
          color: 'rgba(255,255,255,0.45)',
          mb: 4,
        }}
      >
        Join the FL Health Portal today
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
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="First name"
            fullWidth
            autoComplete="given-name"
            {...register('firstName', {
              required: 'First name is required',
              minLength: { value: 2, message: 'Min 2 characters' },
              maxLength: { value: 50, message: 'Max 50 characters' },
            })}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
            sx={inputSx}
          />
          <TextField
            label="Last name"
            fullWidth
            autoComplete="family-name"
            {...register('lastName', {
              required: 'Last name is required',
              minLength: { value: 2, message: 'Min 2 characters' },
              maxLength: { value: 50, message: 'Max 50 characters' },
            })}
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
            sx={inputSx}
          />
        </Box>

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
          autoComplete="new-password"
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Minimum 8 characters required' },
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

        <Box>
          <Typography
            sx={{
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              mb: 1.5,
            }}
          >
            Select your role
          </Typography>
          <Controller
            name="role"
            control={control}
            rules={{ required: 'Please select a role' }}
            render={({ field }) => (
              <ToggleButtonGroup
                value={field.value}
                exclusive
                onChange={(_, newValue) => {
                  if (newValue) field.onChange(newValue);
                }}
                fullWidth
                sx={{
                  gap: 2,
                  '& .MuiToggleButtonGroup-grouped': {
                    border: '1.5px solid rgba(255,255,255,0.08) !important',
                    borderRadius: '14px !important',
                    flex: 1,
                    py: 1.8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.8,
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'rgba(124,58,237,0.08)',
                      borderColor: 'rgba(124,58,237,0.4) !important',
                    },
                    '&.Mui-selected': {
                      background: 'rgba(124,58,237,0.12)',
                      borderColor: '#7c3aed !important',
                      color: '#a78bfa',
                    },
                  },
                }}
              >
                <ToggleButton value="CREATOR">
                  <BrushIcon sx={{ fontSize: 20 }} />
                  Creator
                </ToggleButton>
                <ToggleButton value="ADMIN">
                  <AdminPanelSettingsIcon sx={{ fontSize: 20 }} />
                  Admin
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          />
          {errors.role && (
            <Typography sx={{ color: '#f87171', fontSize: '12px', mt: 0.5, ml: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {errors.role.message}
            </Typography>
          )}
        </Box>

        <Button
          type="submit"
          fullWidth
          disabled={isSubmitting}
          sx={{
            mt: 0.5,
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
            'Create account'
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
        Already have an account?{' '}
        <Box
          component={Link}
          to="/login"
          sx={{
            color: '#7c3aed',
            textDecoration: 'none',
            fontWeight: 600,
            '&:hover': { color: '#9f67ff', textDecoration: 'underline' },
          }}
        >
          Sign in
        </Box>
      </Typography>
    </Box>
  );
};

export default RegisterPage;
