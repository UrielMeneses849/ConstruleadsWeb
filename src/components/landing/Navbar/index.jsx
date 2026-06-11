import {
  Box,
  Flex,
  HStack,
  Image,
  VStack,
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
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleContactClick = () => {
    const section = document.getElementById('contacto');

    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }

    setIsMobileMenuOpen(false);
  };

  return (
    <Box
      as="header"
      {...navbarStyles.wrapper}
      w={{ base: '100%', lg: '95%' }}
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
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </Box>
          ))}

          <Box
            {...navbarStyles.navLink}
            cursor="pointer"
            onClick={handleContactClick}
          >
            Contacto
          </Box>
        </HStack>

        {/* ACTIONS */}
        <HStack {...navbarStyles.actions}>
          <Box
            display={{ base: 'flex', lg: 'none' }}
            alignItems="center"
            justifyContent="center"
            fontSize="28px"
            cursor="pointer"
            position="relative"
            zIndex="1001"
            onClick={() => {
              console.log('MENU CLICK');
              setIsMobileMenuOpen((prev) => !prev);
            }}
          >
            ☰
          </Box>
          {/* <Button variant="secondary" size="sm">
            Solicitar demo
          </Button> */}

          <Box display={{ base: 'none', lg: 'block' }}>
            <Button onClick={onOpen} size="sm">
              Iniciar sesión
            </Button>
          </Box>
        </HStack>

      </Flex>
      {isMobileMenuOpen && (
  <>
    <Box
      position="fixed"
      inset="0"
      backdropFilter="blur(14px)"
      bg="rgba(15,23,42,0.25)"
      zIndex="999"
      onClick={() => setIsMobileMenuOpen(false)}
    />

    <Box
      position="fixed"
      top="50%"
      left="24px"
      right="24px"
      transform="translateY(-50%)"
      zIndex="1001"
      bg="rgba(255,255,255,0.92)"
      backdropFilter="blur(20px)"
      borderRadius="24px"
      border="1px solid rgba(255,255,255,0.5)"
      boxShadow="0 20px 60px rgba(15,23,42,0.18)"
      p={8}
      h="50vh"
      maxH="560px"
      display={{ base: 'block', lg: 'none' }}
    >
      <Flex
        justify="space-between"
        align="center"
        mb={8}
      >
        <Image
          src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
          h="28px"
          w="auto"
          objectFit="contain"
        />

        <Box
          w="40px"
          h="40px"
          borderRadius="full"
          bg="blackAlpha.50"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          fontSize="22px"
          fontWeight="500"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          ✕
        </Box>
      </Flex>

      <VStack
        h="calc(100% - 60px)"
        justify="space-between"
        align="stretch"
      >
        <VStack
          flex="1"
          justify="space-evenly"
          spacing={0}
        >
          {NAV_LINKS.map((item) => (
            <Box
              key={item.label}
              fontSize="16px"
              fontWeight="500"
              letterSpacing="-0.01em"
              color="secondary.900"
              _hover={{
                color: 'primary.500',
                transform: 'translateY(-1px)'
              }}
              transition="all 0.2s ease"
              cursor="pointer"
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
            >
              {item.label}
            </Box>
          ))}

          <Box
            fontSize="16px"
            fontWeight="500"
            letterSpacing="-0.01em"
            color="secondary.900"
            _hover={{
              color: 'primary.500',
              transform: 'translateY(-1px)'
            }}
            transition="all 0.2s ease"
            cursor="pointer"
            onClick={handleContactClick}
          >
            Contacto
          </Box>
        </VStack>

        <Box
          w="100%"
          borderTop="1px solid"
          borderColor="blackAlpha.100"
          pt={6}
          display="flex"
          justifyContent="center"
        >
          <Button onClick={onOpen} size="sm">
            Iniciar sesión
          </Button>
        </Box>
      </VStack>
    </Box>
  </>
)}
      <LoginModal
        isOpen={isOpen}
        onClose={onClose}
      />
    </Box>
  );
}
