export const buttonBaseStyles = {
  borderRadius: "16px",
  fontWeight: "600",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  cursor: "pointer",

  _focusVisible: {
    boxShadow: "0 0 0 4px rgba(255,107,0,0.15)",
  },

  _disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};