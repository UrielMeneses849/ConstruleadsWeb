export const heroStyles = {
  wrapper: {
    width: "100%",
    pt: {
      base: "120px",
      lg: "64px",
    },
    pb: "80px",
    overflow: "hidden",
  },

  container: {
    align: "center",
    justify: "space-between",
    minH: "760px",
    gap: "40px",
    direction: {
      base: "column",
      lg: "row",
    },
  },

content: {
  align: "flex-start",
  spacing: "28px",
  maxW: "520px",
  flex: "0 0 38%",
  zIndex: 2,
  pt: "40px",
},

  title: {
    fontSize: {
      base: "48px",
      lg: "72px",
    },
    lineHeight: "88%",
    fontWeight: "800",
    letterSpacing: "-3px",
    color: "secondary.900",
  },

  description: {
    fontSize: "20px",
    lineHeight: "170%",
    color: "secondary.700",
    maxW: "560px",
  },

imageWrapper: {
  flex: "0 0 62%",
  position: "relative",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  overflow: "visible",
},

image: {
  width: "125%",
  maxW: "none",
  objectFit: "contain",
  transform: "translateX(80px)",
  userSelect: "none",
  pointerEvents: "none",
},
};