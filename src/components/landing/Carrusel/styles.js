import { keyframes } from "@emotion/react";

const scrollInfinite = keyframes`
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
`;

export const carruselContainer = {
  width: "100%",
  overflow: "hidden",
  position: "relative",
  py: "16px",
  maskImage:
    "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
};

export const carruselTrack = {
  display: "flex",
  alignItems: "center",
  gap: "72px",
  width: "max-content",
  animation: `${scrollInfinite} 40s linear infinite`,
  willChange: "transform",
};

export const carruselItem = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minW: "220px",
  width: "220px",
  height: "120px",
};