

export const styles = {
  page: {
    bg: '#F8F8F8',
    minH: '100vh',
  },

  container: {
    maxW: '1400px',
    pt: { base: 24, lg: 32 },
    pb: { base: 12, lg: 20 },
  },

  hero: {
    bg: 'white',
    borderRadius: '24px',
    p: { base: 8, lg: 12 },
    gap: 12,
    align: 'center',
    direction: { base: 'column', lg: 'row' },
    boxShadow: '0 10px 30px rgba(0,0,0,.04)',
    mb: 20,
  },

  eyebrow: {
    color: '#FF6600',
    fontSize: { base: '28px', lg: '36px' },
    fontWeight: 700,
    mb: 4,
  },

  title: {
    color: '#071B52',
    fontSize: { base: '42px', lg: '64px' },
    lineHeight: '1.05',
    fontWeight: 700,
    mb: 6,
  },

  description: {
    color: '#071B52',
    fontSize: { base: '16px', lg: '18px' },
    lineHeight: '1.8',
    maxW: '700px',
  },

  heroImage: {
    w: '100%',
    maxW: '100%',
    objectFit: 'contain',
  },

  cardsGrid: {
    wrap: 'wrap',
    justify: 'center',
    gap: 6,
    mb: 24,
  },

  card: {
    bg: 'white',
    borderRadius: '18px',
    p: 5,
    gap: 4,
    align: 'center',
    borderLeft: '4px solid #FF6600',
    boxShadow: '0 8px 24px rgba(0,0,0,.06)',
    w: { base: '100%', md: '380px' },
    transition: 'all .3s ease',
    _hover: {
      transform: 'translateY(-6px)',
      boxShadow: '0 16px 40px rgba(0,0,0,.12)',
    },
  },

  iconWrapper: {
    minW: '56px',
    h: '56px',
    borderRadius: 'full',
    bg: '#FF6600',
    align: 'center',
    justify: 'center',
  },

  cardTitle: {
    color: '#071B52',
    fontSize: '22px',
    fontWeight: 700,
    mb: 2,
  },

  cardDescription: {
    color: '#071B52',
    fontSize: '15px',
    lineHeight: '1.6',
  },

  benefitsSection: {
    align: 'center',
    gap: 16,
    direction: { base: 'column', lg: 'row' },
  },

  benefitsTitle: {
    color: '#071B52',
    fontSize: { base: '42px', lg: '64px' },
    lineHeight: '1.05',
    fontWeight: 700,
    mb: 6,
  },

  benefitsDescription: {
    color: '#071B52',
    fontSize: '18px',
    lineHeight: '1.8',
    mb: 8,
  },

  checklist: {
    align: 'start',
    spacing: 5,
    mb: 8,
  },

  checklistText: {
    color: '#071B52',
    fontSize: '17px',
  },

  ctaButton: {
    bg: '#FF6600',
    color: 'white',
    px: 8,
    _hover: {
      bg: '#e65c00',
      transform: 'translateY(-2px)',
    },
  },

  sectionImage: {
    w: '100%',
    borderRadius: '24px'
  },
};