import { Box, Flex, HStack, Image } from '@chakra-ui/react';
import { FiLogOut, FiMoon, FiSun } from 'react-icons/fi';

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const second = parts[1]?.[0] || parts[0]?.[1] || 'M';
  return `${first}${second}`.toUpperCase();
}

function NavbarItem({ active, children, onClick }) {
  return (
    <Box
      as="button"
      type="button"
      px={3}
      h="38px"
      display="flex"
      alignItems="center"
      borderRadius="9px"
      bg={active ? 'rgba(255,255,255,.2)' : 'transparent'}
      color="white"
      fontWeight="700"
      fontSize="13px"
      whiteSpace="nowrap"
      transition="all 180ms ease"
      _hover={{ bg: 'rgba(255,255,255,.24)' }}
      onClick={onClick}
    >
      {children}
    </Box>
  );
}

export default function ConstruleadsNavbar({
  activeModule = 'proyectos',
  isDarkMode,
  userName,
  onProjects,
  onCompanies,
  onLicitaciones,
  onAnalytics,
  onProfile,
  onToggleTheme,
  onLogout,
}) {
  const navbarColor = isDarkMode ? '#B9471E' : '#D95B27';

  return (
    <Flex
      bg={navbarColor}
      borderRadius="12px"
      px={4}
      py={2}
      mb={3}
      minH="60px"
      align="center"
      justify="flex-start"
      border={`1px solid ${navbarColor}`}
      gap={4}
      flexShrink={0}
    >
      <Box w="252px" flexShrink={0} display="flex" alignItems="center">
        <Image
          src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
          alt="BIMSA Reports"
          h="48px"
          objectFit="contain"
          filter="brightness(0) invert(1)"
        />
      </Box>

      <HStack spacing={1} flex="1" justify="flex-start" overflowX="auto">
        <NavbarItem active={activeModule === 'proyectos'} onClick={onProjects}>Proyectos</NavbarItem>
        <NavbarItem active={activeModule === 'companias'} onClick={onCompanies}>Compañías</NavbarItem>
        <NavbarItem active={activeModule === 'licitaciones'} onClick={onLicitaciones}>Licitaciones</NavbarItem>
      </HStack>

      <HStack spacing={3} flexShrink={0}>
        <Box
          as="button"
          type="button"
          h="36px"
          px={2.5}
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="9px"
          border="1px solid rgba(255,255,255,.42)"
          bg={activeModule === 'analytics' ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)'}
          transition="background 180ms ease, transform 180ms ease"
          _hover={{ bg: 'rgba(255,255,255,.2)', transform: 'translateY(-1px)' }}
          onClick={onAnalytics}
          aria-label="Abrir Bimsa Analytics"
          title="Bimsa Analytics"
        >
          <Image src={`${import.meta.env.BASE_URL}bimsa-analytics-white.svg`} alt="Bimsa Analytics" w="118px" h="25px" objectFit="contain" />
        </Box>
        <Box
          as={isDarkMode ? FiSun : FiMoon}
          boxSize="20px"
          color="white"
          cursor="pointer"
          transition="all 180ms ease"
          _hover={{ color: 'rgba(255,255,255,.82)' }}
          onClick={onToggleTheme}
          role="button"
          tabIndex={0}
          aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          title={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onToggleTheme?.();
          }}
        />
        <Box
          as={FiLogOut}
          boxSize="20px"
          color="white"
          cursor="pointer"
          transition="all 180ms ease"
          _hover={{ color: 'rgba(255,255,255,.82)' }}
          onClick={onLogout}
          role="button"
          tabIndex={0}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onLogout?.();
          }}
        />
        <Box position="relative">
          <Box
            as="button"
            type="button"
            w="32px"
            h="32px"
            borderRadius="full"
            bg="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontWeight="600"
            fontSize="12px"
            color="#D95B27"
            cursor="pointer"
            transition="transform 160ms ease, box-shadow 160ms ease"
            boxShadow={activeModule === 'perfil' ? '0 0 0 3px rgba(255,255,255,.42)' : 'none'}
            _hover={{ transform: 'translateY(-1px)' }}
            onClick={onProfile}
            aria-label="Abrir perfil"
            title="Abrir perfil"
          >
            {getInitials(userName)}
          </Box>
          <Box position="absolute" bottom="1px" right="-1px" w="8px" h="8px" borderRadius="full" bg="#35B56A" border="1px solid white" />
        </Box>
      </HStack>
    </Flex>
  );
}
