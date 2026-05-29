

export const footerWrapper = {
  maxW: '1440px',
  mx: 'auto',
  px: { base: '24px', lg: '80px' },
  pb: '80px',
};

export const footerContainer = {
  bg: '#4A4A4A',
  borderRadius: '0px',
  px: { base: '32px', lg: '72px' },
  py: { base: '40px', lg: '56px' },
};

export const footerGrid = {
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    lg: '1.4fr 1fr 1fr 1fr',
  },
  gap: '48px',
};

export const sectionTitle = {
  color: 'white',
  fontSize: '20px',
  fontWeight: '600',
  mb: '24px',
};

export const footerLink = {
  color: 'whiteAlpha.900',
  fontSize: '18px',
  cursor: 'pointer',
  transition: '0.2s',
  _hover: {
    color: 'primary.500',
  },
};