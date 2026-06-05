
export const footerWrapper = {
  width: '100%',
  px: 0,
  pb: 0,
  mt: '80px',
};

export const footerContainer = {
  width: '100%',
  bg: '#4A4A4A',
  borderRadius: '0',
  px: { base: '24px', lg: '80px' },
  py: { base: '48px', lg: '64px' },
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
  fontSize: '14px',
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