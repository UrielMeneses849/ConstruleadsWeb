import {
  Box,
  Flex,
  HStack,
  Image,
  Link,
} from "@chakra-ui/react";

import { NAV_LINKS } from "./constants";
import { navbarStyles } from "./styles";

import Button from "../../ui/Button";

export default function LandingNavbar() {
  return (
    <Box as="header" {...navbarStyles.wrapper} w="95%">
      <Flex {...navbarStyles.container}>

        {/* LOGO */}
        <Box {...navbarStyles.logo}>
          <Image
            src="/logo-construleads.svg"
            alt="Construleads"
            h="100%"
            w="auto"
            objectFit="contain"
          />
        </Box>

        {/* NAV LINKS */}
        <HStack as="nav" {...navbarStyles.nav}>
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              {...navbarStyles.navLink}
            >
              {item.label}
            </Link>
          ))}
        </HStack>

        {/* ACTIONS */}
        <HStack {...navbarStyles.actions}>
          <Button variant="secondary" size="sm">
            Solicitar demo
          </Button>

          <Button variant="primary" size="sm">
            Iniciar sesión
          </Button>
        </HStack>

      </Flex>
    </Box>
  );
}
