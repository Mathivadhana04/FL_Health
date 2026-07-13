import { Box, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        background: '#0a0a0f',
      }}
    >
      {/* Left Panel - Brand */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0533 50%, #0a0a0f 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontSize: '20px',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.3px',
              }}
            >
              FL Health Portal
            </Typography>
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 'clamp(42px, 5vw, 60px)',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-2px',
              color: '#fff',
              mb: 3,
            }}
          >
            Create content
            <br />
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              at the speed
            </Box>
            <br />
            of thought.
          </Typography>

          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '17px',
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.7,
              maxWidth: '380px',
              mb: 6,
            }}
          >
            The intelligent platform for creators and teams who demand more from their AI tools.
          </Typography>

          <Box sx={{ display: 'flex', gap: 3 }}>
            {[
              { value: '10x', label: 'Faster output' },
              { value: '50k+', label: 'Active creators' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <Box key={stat.label}>
                <Typography
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.35)',
                    mt: 0.5,
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right Panel - Form */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { xs: '40px 24px', sm: '60px 48px', lg: '80px 72px' },
          background: '#0a0a0f',
        }}
      >
        {/* Mobile brand */}
        <Box
          sx={{
            display: { xs: 'flex', lg: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: 5,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Typography
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            FL Health Portal
          </Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: '420px' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;
