import {
  Box,
  Flex,
  HStack,
  Image,
} from "@chakra-ui/react";

import { keyframes } from "@emotion/react";

import { NAV_LINKS } from "./constants";
import { navbarStyles } from "./styles";

import { useNavigate } from "react-router-dom";

import Button from "../../ui/Button";
import LoginModal from "../../Login/LoginModal";
import { useState } from "react";


const navbarEntrance = keyframes`
  from {
    opacity: 0;
    transform: translateY(-30px);
    filter: blur(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
`;


export default function LandingNavbar() {


const [isOpen, setIsOpen] = useState(false);

const onOpen = () => {
  console.log("ON OPEN");
  setIsOpen(true);
};

const onClose = () => {
  setIsOpen(false);
};
  
  const navigate = useNavigate();

  const routeMap = {
    '#inicio': '/',
    '#beneficios': '/beneficios',
    '#audiencia': '/audiencia',
    '#faq': '/faq',
  };

  return (
    <Box
      as="header"
      {...navbarStyles.wrapper}
      w="95%"
      animation={`${navbarEntrance} 0.8s ease-out`}
    >
      <Flex {...navbarStyles.container}>

        {/* LOGO */}
        <Box
          {...navbarStyles.logo}
          cursor="pointer"
          onClick={() => navigate('/')}
        >
          <Image
            src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
            h="100%"
            w="auto"
            objectFit="contain"
          />
        </Box>

        {/* NAV LINKS */}
        <HStack as="nav" {...navbarStyles.nav}>
          {NAV_LINKS.map((item) => (
            <Box
              key={item.label}
              {...navbarStyles.navLink}
              cursor="pointer"
onClick={() => {
  console.log('Navigating to:', item.path);
  navigate(item.path);
}}
            >
              {item.label}
            </Box>
          ))}
        </HStack>

        {/* ACTIONS */}
        <HStack {...navbarStyles.actions}>
          <Button variant="secondary" size="sm">
            Solicitar demo
          </Button>

<Button onClick={onOpen} size="sm">
  Iniciar sesión
</Button>
        </HStack>

      </Flex>
      <LoginModal
        isOpen={isOpen}
        onClose={onClose}
      />
    </Box>
  );
}
