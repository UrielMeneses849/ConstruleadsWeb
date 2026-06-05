export const testimonialSection = {
  width: "100%",
  py: "32px",
  px: {
    base: "24px",
    xl: "80px",
  },
  position: "relative",
};
  
export const testimonialContainer = {
  maxW: "1400px",
  mx: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "64px",
};

export const testimonialTitle = {
  textAlign: "center",
  fontWeight: "700",
  lineHeight: "1.1",
  color: "#041A46",
  fontSize: {
    base: "36px",
    md: "40px",
  },
};

export const testimonialHighlight = {
  color: "primary.500",
};

export const testimonialWrapper = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px",
};

export const testimonialGrid = {
  display: "grid",
  gridTemplateColumns: {
    base: "1fr",
    lg: "repeat(3, 1fr)",
  },
  gap: "32px",
  width: "100%",
  maxW: "1080px",
};

export const testimonialCard = {
  bg: "white",
  borderRadius: "24px",
  border: "1px solid",
  borderColor: "rgba(255, 102, 0, 0.45)",
  px: "32px",
  pt: "24px",
  pb: "32px",
  boxShadow: "0px 8px 24px rgba(15, 23, 42, 0.08)",
  minH: "340px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  transition: "all 0.25s ease",

  _hover: {
    transform: "translateY(-6px)",
    boxShadow: "0px 14px 30px rgba(15, 23, 42, 0.12)",
  },
};

export const testimonialAvatar = {
  width: "96px",
  height: "96px",
  borderRadius: "full",
  border: "3px solid",
  borderColor: "primary.500",
  objectFit: "contain",
  p: "12px",
  bg: "white",
  mb: "20px",
};

export const testimonialName = {
  color: "#041A46",
  fontWeight: "700",
  fontSize: "18px",
  lineHeight: "1.3",
  mb: "8px",
};

export const testimonialRole = {
  color: "primary.500",
  fontWeight: "500",
  fontSize: "14px",
  lineHeight: "1.4",
  mb: "20px",
};

export const testimonialText = {
  color: "#041A46",
  fontSize: "14px",
  lineHeight: "1.7",
  fontWeight: "400",
};

export const testimonialQuote = {
  color: "primary.500",
  fontSize: "72px",
  lineHeight: "1",
  mt: "auto",
  fontWeight: "700",
};

export const arrowButton = {
  width: "56px",
  height: "56px",
  minWidth: "56px",
  borderRadius: "16px",
  bg: "primary.500",
  color: "white",
  display: {
    base: "none",
    xl: "flex",
  },
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.2s ease",

  _hover: {
    transform: "scale(1.05)",
    bg: "primary.600",
  },
};

