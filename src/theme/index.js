
import { colors } from "./colors";
import { createSystem, defaultConfig } from "@chakra-ui/react";

const config = {
  theme: {
    tokens: {

      colors: {
        primary: colors.primary,
        secondary: colors.secondary,

        surface: {
          value: "#F7F7F7",
        },

        border: {
          value: "#E5E7EB",
        },

        success: {
          value: "#22C55E",
        },

        warning: {
          value: "#FACC15",
        },

        danger: {
          value: "#EF4444",
        },
      },

      fonts: {

        heading: {
          value: "'Poppins', sans-serif",
        },

        body: {
          value: "'Poppins', sans-serif",
        },
      },

      radii: {

        xl: {
          value: "16px",
        },

        "2xl": {
          value: "24px",
        },
      },

      spacing: {

        18: {
          value: "4.5rem",
        },

        22: {
          value: "5.5rem",
        },
      },

      shadows: {

        card: {
          value: "0 2px 12px rgba(0,0,0,0.05)",
        },
      },
    },
  },
};

export const system = createSystem(defaultConfig, config);