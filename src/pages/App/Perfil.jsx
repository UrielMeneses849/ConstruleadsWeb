import { useMemo, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';

import {
  FiArrowLeft,
  FiGrid,
  FiShield,
  FiUsers,
  FiEye,
  FiBarChart2,
  FiFileText,
  FiBell,
} from 'react-icons/fi';

const MODULES_CATALOG = [
  { id: 1, name: 'Proyectos', description: 'Búsqueda, mapa y resultados de obras.' },
  { id: 2, name: 'Rutas explorer', description: 'Trazado y exploración de rutas.' },
  { id: 3, name: 'Compañías', description: 'Consulta de empresas vinculadas.' },
  { id: 4, name: 'Convocatorias y fallos', description: 'Seguimiento documental y publicaciones.' },
  { id: 5, name: 'Analytics', description: 'Indicadores y lectura ejecutiva.' },
  { id: 6, name: 'Reportes personalizados', description: 'Exportaciones y vistas a medida.' },
  { id: 7, name: 'Administración de usuarios', description: 'Alta, baja y control de accesos.' },
  { id: 8, name: 'Noticias', description: 'Novedades y avisos del sistema.' },
];

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const second = parts[1]?.[0] || parts[0]?.[1] || 'M';
  return `${first}${second}`.toUpperCase();
}

function getUserRoleLabel(tipoUsuario) {
  return String(tipoUsuario) === '1' ? 'Administrador' : 'Público';
}

export default function Perfil() {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('cl_authenticated') === 'true';
  const [colorMode] = useState(() => localStorage.getItem('cl_color_mode') || 'light');
  const isDarkMode = colorMode === 'dark';

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('construleadsUser') || '{}');
    } catch {
      return {};
    }
  }, []);

  const theme = isDarkMode
    ? {
        pageBg: '#111111',
        surface: '#181818',
        surfaceMuted: '#202020',
        border: '#333333',
        text: '#F5F5F5',
        textMuted: '#A3A3A3',
        accent: '#FF653F',
        accentSoft: 'rgba(255,102,0,.12)',
      }
    : {
        pageBg: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceMuted: '#FAFAFA',
        border: '#ECECEC',
        text: '#202020',
        textMuted: '#6B7280',
        accent: '#FF653F',
        accentSoft: 'rgba(255,102,0,.10)',
      };

  useEffect(() => {
    document.title = 'Perfil | Construleads';
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const userName = user.nombreUsuario || 'Usuario BIMSA';
  const userRole = getUserRoleLabel(user.tipoUsuario);

  return (
    <Box
      minH="100vh"
      bg={theme.pageBg}
      color={theme.text}
      px={3}
      py={3}
      transition="background 180ms ease, color 180ms ease"
    >
      <Box
        maxW="1600px"
        mx="auto"
        minH="calc(100vh - 24px)"
        bg={theme.surface}
        border={`1px solid ${theme.border}`}
        borderRadius="16px"
        overflow="hidden"
        boxShadow="none"
      >
        <Flex
          align="center"
          justify="space-between"
          px={4}
          py={3}
          borderBottom={`1px solid ${theme.border}`}
          bg={theme.surfaceMuted}
          gap={3}
        >
          <HStack spacing={3} minW="0">
            <Button
              leftIcon={<FiArrowLeft />}
              variant="ghost"
              size="sm"
              onClick={() => navigate('/construleads')}
              color={theme.text}
              _hover={{ bg: theme.accentSoft }}
            >
              Volver
            </Button>
            <Box>
              <Text fontSize="12px" color={theme.textMuted}>
                Perfil del usuario
              </Text>
              <Heading size="md" color={theme.text}>
                {userName}
              </Heading>
            </Box>
          </HStack>

          <Badge
            px={3}
            py={1}
            borderRadius="full"
            bg={theme.accentSoft}
            color={theme.accent}
            border={`1px solid ${theme.accent}`}
          >
            {userRole}
          </Badge>
        </Flex>

        <Box p={4}>
          <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
            <Stack spacing={4} gridColumn={{ xl: 'span 1' }}>
              <Box
                bg={theme.surface}
                border={`1px solid ${theme.border}`}
                borderRadius="12px"
                p={4}
              >
                <HStack spacing={3} align="center">
                  <Box
                    w="56px"
                    h="56px"
                    borderRadius="full"
                    bg={theme.accent}
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="18px"
                    fontWeight="700"
                  >
                    {getInitials(userName)}
                  </Box>
                  <Box minW="0">
                    <Text fontSize="12px" color={theme.textMuted}>
                      Sesión activa
                    </Text>
                    <Heading size="sm" color={theme.text} noOfLines={1}>
                      {userName}
                    </Heading>
                    <Text fontSize="13px" color={theme.textMuted} noOfLines={1}>
                      ID {user.idUsuario || 'N/D'}
                    </Text>
                  </Box>
                </HStack>

                <Box my={4} h="1px" bg={theme.border} />

                <Stack spacing={3}>
                  <Flex justify="space-between" gap={3}>
                    <Text fontSize="13px" color={theme.textMuted}>
                      Sesion
                    </Text>
                    <Text fontSize="13px" color={theme.text} fontWeight="600">
                      {user.idSession || 'N/D'}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" gap={3}>
                    <Text fontSize="13px" color={theme.textMuted}>
                      Tipo de usuario
                    </Text>
                    <Text fontSize="13px" color={theme.text} fontWeight="600">
                      {user.tipoUsuario || 'N/D'}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" gap={3}>
                    <Text fontSize="13px" color={theme.textMuted}>
                      Acceso
                    </Text>
                    <Text fontSize="13px" color={theme.text} fontWeight="600">
                      {userRole}
                    </Text>
                  </Flex>
                </Stack>
              </Box>

              <Box
                bg={theme.surface}
                border={`1px solid ${theme.border}`}
                borderRadius="12px"
                p={4}
              >
                <HStack spacing={2} mb={3}>
                  <FiShield color={theme.accent} />
                  <Text fontWeight="700">Estado de cuenta</Text>
                </HStack>
                <Text fontSize="13px" color={theme.textMuted} lineHeight="1.6">
                  Este espacio quedará listo para mostrar permisos reales,
                  módulos activos y futuras configuraciones de administración.
                </Text>
              </Box>
            </Stack>

            <Box
              gridColumn={{ xl: 'span 2' }}
              bg={theme.surface}
              border={`1px solid ${theme.border}`}
              borderRadius="12px"
              p={4}
            >
              <Flex
                align="center"
                justify="space-between"
                gap={3}
                mb={4}
              >
                <Box>
                  <Text fontSize="12px" color={theme.textMuted}>
                    Módulos disponibles
                  </Text>
                  <Heading size="sm">Accesos del usuario</Heading>
                </Box>
                <Badge
                  bg={theme.accentSoft}
                  color={theme.accent}
                  borderRadius="full"
                  px={3}
                  py={1}
                >
                  ws_cl_modulos
                </Badge>
              </Flex>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                {MODULES_CATALOG.map((module) => (
                  <Box
                    key={module.id}
                    border={`1px solid ${theme.border}`}
                    borderRadius="12px"
                    p={3}
                    bg={theme.surfaceMuted}
                  >
                    <HStack align="start" spacing={3}>
                      <Box
                        w="36px"
                        h="36px"
                        borderRadius="10px"
                        bg={theme.accentSoft}
                        color={theme.accent}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        {module.id === 1 && <FiGrid />}
                        {module.id === 2 && <FiEye />}
                        {module.id === 3 && <FiUsers />}
                        {module.id === 4 && <FiFileText />}
                        {module.id === 5 && <FiBarChart2 />}
                        {module.id === 6 && <FiFileText />}
                        {module.id === 7 && <FiShield />}
                        {module.id === 8 && <FiBell />}
                      </Box>

                      <Box minW="0" flex="1">
                        <Flex justify="space-between" gap={3} mb={1}>
                          <Text fontWeight="700" noOfLines={1}>
                            {module.name}
                          </Text>
                          <Badge
                            flexShrink={0}
                            colorScheme="gray"
                            borderRadius="full"
                            variant="subtle"
                          >
                            ID {module.id}
                          </Badge>
                        </Flex>
                        <Text fontSize="13px" color={theme.textMuted} lineHeight="1.5">
                          {module.description}
                        </Text>
                        <Text fontSize="12px" color={theme.accent} mt={2} fontWeight="600">
                          Pendiente de pintar con ws_cl_modulos
                        </Text>
                      </Box>
                    </HStack>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
}
