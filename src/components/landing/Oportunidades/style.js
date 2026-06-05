export const section = {
  width: '100%',
  py: '32px',
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
    base: '32px',
    lg: '40px',
  },
  lineHeight: '1.15',
  fontWeight: '700',
  color: '#041A46',
  mb: '8px',
};

export const highlight = {
  color: 'primary.500',
};

export const subtitle = {
  textAlign: 'center',
  fontSize: '18px',
  color: 'secondary.400',
  mb: '48px',
  color: '#041A46',
};

export const grid = {
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    md: 'repeat(2, 1fr)',
    lg: 'repeat(4, 1fr)',
  },
  gap: '24px',
};

export const card = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '24px',
  minH: '420px',
  bgSize: 'cover',
  bgPosition: 'center',
  boxShadow: '0px 6px 18px rgba(0,0,0,0.12)',
  transition: 'all .3s ease',
  _hover: {
    transform: 'translateY(-4px)',
  },
};

export const overlay = {
  position: 'absolute',
  left: '50%',
  bottom: '22px',
  transform: 'translateX(-50%)',
  bg: 'white',
  borderRadius: '18px',
  width: '80%',
  p: '20px 24px',
  boxShadow: '0px 4px 12px rgba(0,0,0,0.12)',
};

export const benefitsSection = {
  mt: '100px',
};

export const benefitsTitle = {
  fontSize: {
    base: '40px',
    lg: '40px',
  },
  lineHeight: '1.15',
  fontWeight: '700',
  color: '#041A46',
  mb: '56px',
  maxW: '900px',
};

export const benefitsGrid = {
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    lg: 'repeat(3, 1fr)',
  },
  gap: '24px',
  width: '90%',
  m: '0 auto',
};

export const benefitCard = {
  bg: 'white',
  borderRadius: '18px',
  p: '20px',
  boxShadow: '0px 6px 18px rgba(15,23,42,0.08)',
  borderBottom: '3px solid',
  borderColor: 'primary.500',
};