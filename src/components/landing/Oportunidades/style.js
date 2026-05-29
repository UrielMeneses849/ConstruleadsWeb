export const section = {
  width: '100%',
  py: '120px',
  px: {
    base: '24px',
    xl: '80px',
  },
};

export const container = {
  maxW: '1400px',
  mx: 'auto',
};

export const title = {
  textAlign: 'center',
  fontSize: {
    base: '42px',
    lg: '64px',
  },
  lineHeight: '1.15',
  fontWeight: '700',
  color: 'secondary.500',
  mb: '16px',
};

export const highlight = {
  color: 'primary.500',
};

export const subtitle = {
  textAlign: 'center',
  fontSize: '24px',
  color: 'secondary.400',
  mb: '64px',
};

export const grid = {
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    lg: 'repeat(2, 1fr)',
  },
  gap: '32px',
};

export const card = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '24px',
  minH: '380px',
  bgSize: 'cover',
  bgPosition: 'center',
  transition: 'all .3s ease',
  _hover: {
    transform: 'translateY(-4px)',
  },
};

export const overlay = {
  position: 'absolute',
  left: '50%',
  bottom: '24px',
  transform: 'translateX(-50%)',
  bg: 'white',
  borderRadius: '20px',
  width: '85%',
  p: '24px',
  boxShadow: 'lg',
};

export const benefitsSection = {
  mt: '140px',
};

export const benefitsTitle = {
  fontSize: {
    base: '42px',
    lg: '64px',
  },
  lineHeight: '1.15',
  fontWeight: '700',
  color: 'secondary.500',
  mb: '56px',
  maxW: '900px',
};

export const benefitsGrid = {
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    lg: 'repeat(3, 1fr)',
  },
  gap: '32px',
};

export const benefitCard = {
  bg: 'white',
  borderRadius: '24px',
  p: '32px',
  boxShadow: '0px 8px 24px rgba(15,23,42,0.08)',
  borderBottom: '4px solid',
  borderColor: 'primary.500',
};