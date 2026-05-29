import { Button as ChakraButton } from "@chakra-ui/react";

import { buttonVariants, buttonSizes } from "./variants";
import { buttonBaseStyles } from "./styles";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <ChakraButton
      {...buttonBaseStyles}
      {...buttonVariants[variant]}
      {...buttonSizes[size]}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      {...props}
    >
      {children}
    </ChakraButton>
  );
}