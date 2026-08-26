import { useEffect, useRef, useState } from 'react';
import { Box, Button, Flex, HStack, Image, Stack, Text } from '@chakra-ui/react';
import {
  FiActivity,
  FiBell,
  FiDownload,
  FiFileText,
  FiLogOut,
  FiMoon,
  FiSliders,
  FiSun,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import {
  getActiveRadarNotifications,
  RADAR_PREFERENCES_UPDATED_EVENT,
} from '../../utils/radarNotifications';
import { getDownloadHistory } from '../../utils/downloadHistory';

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const second = parts[1]?.[0] || parts[0]?.[1] || 'M';
  return `${first}${second}`.toUpperCase();
}

function getCurrentMonthDownloads() {
  const now = new Date();
  return getDownloadHistory().filter((item) => {
    const date = new Date(item?.createdAt || item?.date || '');
    return !Number.isNaN(date.getTime())
      && date.getMonth() === now.getMonth()
      && date.getFullYear() === now.getFullYear();
  }).length;
}

function notificationIcon(kind) {
  const icons = {
    projects: FiTrendingUp,
    tenders: FiFileText,
    radar: FiSliders,
    changes: FiActivity,
    companies: FiUsers,
    usage: FiDownload,
  };
  return icons[kind] || FiBell;
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

function NotificationsMenu({ onPreferences }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => (
    getActiveRadarNotifications({ monthlyDownloads: getCurrentMonthDownloads() })
  ));
  const menuRef = useRef(null);

  useEffect(() => {
    const refresh = () => {
      setNotifications(getActiveRadarNotifications({ monthlyDownloads: getCurrentMonthDownloads() }));
    };
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };

    window.addEventListener(RADAR_PREFERENCES_UPDATED_EVENT, refresh);
    window.addEventListener('construleads-download-history-updated', refresh);
    window.addEventListener('storage', refresh);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      window.removeEventListener(RADAR_PREFERENCES_UPDATED_EVENT, refresh);
      window.removeEventListener('construleads-download-history-updated', refresh);
      window.removeEventListener('storage', refresh);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, []);

  return (
    <Box ref={menuRef} position="relative">
      <Box
        as="button"
        type="button"
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        w="32px"
        h="32px"
        color="white"
        borderRadius="9px"
        transition="all 180ms ease"
        _hover={{ bg: 'rgba(255,255,255,.18)' }}
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Abrir notificaciones"
        aria-expanded={isOpen}
        title="Notificaciones"
      >
        <FiBell size={20} />
        {notifications.length > 0 && (
          <Flex
            position="absolute"
            top="1px"
            right="1px"
            minW="15px"
            h="15px"
            px="3px"
            borderRadius="full"
            bg="white"
            color="#E85A37"
            fontSize="9px"
            lineHeight="1"
            fontWeight="800"
            border="1px solid #E85A37"
            align="center"
            justify="center"
          >
            {notifications.length > 9 ? '9+' : notifications.length}
          </Flex>
        )}
      </Box>

      {isOpen && (
        <Box
          position="absolute"
          zIndex="200"
          right="0"
          top="calc(100% + 12px)"
          w="370px"
          maxW="calc(100vw - 32px)"
          bg="var(--cl-surface, #FFFFFF)"
          color="var(--cl-text, #252525)"
          border="1px solid var(--cl-border, #E5E3DF)"
          borderRadius="16px"
          boxShadow="0 18px 42px rgba(20,20,20,.22)"
          overflow="hidden"
        >
          <Flex px={4} py={3.5} align="center" justify="space-between" borderBottom="1px solid var(--cl-border, #E5E3DF)">
            <Box>
              <Text fontSize="13px" fontWeight="800">Notificaciones</Text>
              <Text mt={.5} fontSize="10px" color="var(--cl-text-muted, #777777)">Según tus preferencias activas</Text>
            </Box>
            <Box px={2} py={.5} borderRadius="full" bg="rgba(255,101,63,.12)" color="#E85A37" fontSize="10px" fontWeight="700">
              {notifications.length} activas
            </Box>
          </Flex>
          <Stack p={2} gap={1} maxH="360px" overflowY="auto">
            {notifications.length ? notifications.map((notification) => {
              const Icon = notificationIcon(notification.kind);
              return (
                <Flex key={notification.id} gap={3} p={3} borderRadius="11px" align="flex-start" _hover={{ bg: 'rgba(255,101,63,.06)' }}>
                  <Flex w="30px" h="30px" borderRadius="9px" bg="rgba(255,101,63,.12)" color="#E85A37" align="center" justify="center" flexShrink="0"><Icon size={15} /></Flex>
                  <Box minW="0">
                    <Text fontSize="12px" fontWeight="700">{notification.title}</Text>
                    <Text mt={.5} fontSize="10px" color="var(--cl-text-muted, #777777)" lineClamp={2}>{notification.detail}</Text>
                  </Box>
                </Flex>
              );
            }) : (
              <Text px={3} py={6} textAlign="center" fontSize="11px" color="var(--cl-text-muted, #777777)">No tienes notificaciones activas.</Text>
            )}
          </Stack>
          <Box p={3} borderTop="1px solid var(--cl-border, #E5E3DF)">
            <Button w="100%" size="sm" variant="outline" borderColor="rgba(255,101,63,.45)" color="#E85A37" _hover={{ bg: 'rgba(255,101,63,.08)' }}
              onClick={() => { setIsOpen(false); onPreferences?.(); }}>
              <FiSliders /> Configurar preferencias
            </Button>
          </Box>
        </Box>
      )}
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
  onProfile,
  onPreferences,
  onToggleTheme,
  onLogout,
}) {
  const navbarColor = isDarkMode ? '#E85A37' : '#FF653F';

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
        <NotificationsMenu onPreferences={onPreferences} />
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
            color="#FF653F"
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
