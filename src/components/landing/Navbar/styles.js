
export const navbarStyles = {
  wrapper: {
    width: "88%",
    maxWidth: "1600px",
    position: "sticky",
    top: "24px",
    mx: "auto",
    zIndex: 1000,
    bg: "white",
    borderRadius: "24px",
    overflow: "hidden",
    border: "1px solid",
    borderColor: "border",
    boxShadow: "0px 8px 32px rgba(15, 23, 42, 0.08)",
  },

  container: {
    maxW: "1440px",
    mx: "auto",
    px: {
      base: "24px",
      lg: "18px",
    },
    py: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "32px",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    height: "34px",
    flexShrink: 0,
  },

  nav: {
    display: {
      base: "none",
      lg: "flex",
    },
    alignItems: "center",
    gap: "20px",
  },

  navLink: {
    fontSize: "14px",
    lineHeight: "100%",
    whiteSpace: "nowrap",
    fontWeight: "500",
    color: "secondary.900",
    position: "relative",
    transition: "all 0.2s ease",
    _hover: {
      color: "primary.500",
    },
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
};
