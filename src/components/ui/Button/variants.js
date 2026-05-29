export const buttonVariants = {
  primary: {
    bg: "primary.500",
    color: "white",
    _hover: {
      bg: "primary.600",
    },
    _active: {
      bg: "primary.700",
    },
  },

  secondary: {
    bg: "secondary.100",
    color: "secondary.800",
    _hover: {
      bg: "secondary.200",
    },
    _active: {
      bg: "secondary.300",
    },
  },

  outline: {
    bg: "transparent",
    color: "primary.500",
    border: "1px solid",
    borderColor: "primary.500",
    _hover: {
      bg: "primary.50",
    },
    _active: {
      bg: "primary.100",
    },
  },

  ghost: {
    bg: "transparent",
    color: "secondary.800",
    _hover: {
      bg: "gray.100",
    },
    _active: {
      bg: "gray.200",
    },
  },
};

export const buttonSizes = {
  sm: {
    h: "36px",
    px: 4,
    fontSize: "sm",
  },

  md: {
    h: "44px",
    px: 6,
    fontSize: "md",
  },

  lg: {
    h: "52px",
    px: 8,
    fontSize: "lg",
  },
};