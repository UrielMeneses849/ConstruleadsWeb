import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import {
  Box,
  Flex,
  HStack,
  Image,
  Text,
  useMediaQuery,
} from '@chakra-ui/react';

import {
  FiMoon,
  FiSun,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi';

import SidebarFiltros from './SidebarFiltros';
import PanelResumen from './PanelResumen';
import Mapa from './Mapa';
import Resultados from './views/ResultadosView';
import GraficasView from './views/GraficasView';
import DownloadPanel from './DownloadPanel';
import { obtenerObras } from '../../api/obras';
import { parseObrasXml } from '../../utils/parseObrasXml';
import { filterObrasByFilters } from '../../utils/filterObras';

function getObraSelectionKey(obra) {
  return String(
    obra?.Id_Obra ||
    obra?.ID_OBRA ||
    obra?.id_obra ||
    obra?.id ||
    obra?.clave ||
    obra?.proyecto ||
    ''
  );
}

function haveSameSelection(previousSelection, nextSelection) {
  if (previousSelection.length !== nextSelection.length) return false;

  const previousKeys = previousSelection
    .map(getObraSelectionKey)
    .sort()
    .join('|');
  const nextKeys = nextSelection
    .map(getObraSelectionKey)
    .sort()
    .join('|');

  return previousKeys === nextKeys;
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const second = parts[1]?.[0] || parts[0]?.[1] || 'M';
  return `${first}${second}`.toUpperCase();
}

export default function Construleads() {
  const navigate = useNavigate();
  const [useCompactScale] = useMediaQuery(
    '(min-width: 1100px) and (max-width: 1366px) and (max-height: 900px)'
  );
  const [useMediumGraphScale] = useMediaQuery(
    '(min-width: 1367px) and (max-width: 1600px) and (max-height: 1000px)'
  );
  const isAuthenticated =
    localStorage.getItem(
      'cl_authenticated'
    ) === 'true';
  let user = {};

  try {
    user = JSON.parse(localStorage.getItem('construleadsUser') || '{}');
  } catch {
    user = {};
  }

  const [filtros, setFiltros] = useState({});
  const [obras, setObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const filteredObras = useMemo(
    () => filterObrasByFilters(obras, filtros),
    [obras, filtros]
  );
  const [selectedResultObras, setSelectedResultObras] = useState([]);
  const [selectionResetToken, setSelectionResetToken] = useState(0);
  const [activeView, setActiveView] = useState('mapa');
  const interfaceScale = useCompactScale
    ? 0.8
    : (useMediumGraphScale && activeView === 'graficas' ? 0.9 : 1);
  const usesScaledCanvas = interfaceScale < 1;
  const canvasSize = `${100 / interfaceScale}%`;
  const canvasViewportHeight = `${100 / interfaceScale}vh`;
  const [colorMode, setColorMode] = useState(() =>
    localStorage.getItem('cl_color_mode') || 'light'
  );
  const isDarkMode = colorMode === 'dark';
  const sidebarWidth = 'clamp(240px, 18vw, 272px)';

  const appColors = isDarkMode
    ? {
        pageBg: '#111111',
        surface: '#181818',
        surfaceMuted: '#222222',
        hover: '#242424',
        selected: '#2A2A2A',
        border: '#333333',
        text: '#E5E7EB',
        textStrong: '#F5F5F5',
        textMuted: '#A3A3A3',
        inputBg: '#1F1F1F',
        shadow: '0 12px 30px rgba(0,0,0,.34)',
        navBg: '#E85A37',
        navBorder: '#E85A37',
      }
    : {
        pageBg: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceMuted: '#FAFAFA',
        hover: '#FAFAFA',
        selected: '#FAFAFA',
        border: '#ECECEC',
        text: '#374151',
        textStrong: '#202020',
        textMuted: '#6B7280',
        inputBg: '#FFFFFF',
        shadow: '0 8px 24px rgba(0,0,0,.10)',
        navBg: '#FF653F',
        navBorder: '#FF653F',
      };

  useEffect(() => {
    localStorage.setItem('cl_color_mode', colorMode);
  }, [colorMode]);

  useEffect(() => {
    async function cargarObras() {
      try {
        setLoadingObras(true);

        const xml = await obtenerObras();

        const obrasParseadas = parseObrasXml(xml);

        setObras(obrasParseadas);
      } catch (error) {
        console.error('ERROR CARGANDO OBRAS:', error);
      } finally {
        setLoadingObras(false);
      }
    }

    cargarObras();
  }, []);

  const handleResultsSelectionChange = useCallback((selectedObras) => {
    const nextSelection = Array.isArray(selectedObras)
      ? selectedObras
      : [];

    setSelectedResultObras((currentSelection) => {
      if (haveSameSelection(currentSelection, nextSelection)) {
        return currentSelection;
      }

      return nextSelection;
    });
  }, []);

  const clearResultsSelection = useCallback(() => {
    setSelectedResultObras((currentSelection) =>
      currentSelection.length ? [] : currentSelection
    );
    setSelectionResetToken((current) => current + 1);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      bg={appColors.pageBg}
      minH="100vh"
      p={3}
      color={appColors.text}
      transition="background 180ms ease, color 180ms ease"
      w={usesScaledCanvas ? canvasSize : '100%'}
      maxW="none"
      minH={usesScaledCanvas ? canvasViewportHeight : '100vh'}
      position={usesScaledCanvas ? 'fixed' : 'relative'}
      top={usesScaledCanvas ? 0 : 'auto'}
      left={usesScaledCanvas ? 0 : 'auto'}
      overflow={usesScaledCanvas ? 'hidden' : 'visible'}
      style={{
        transform: usesScaledCanvas ? `scale(${interfaceScale})` : 'none',
        transformOrigin: 'top left',
        '--cl-page-bg': appColors.pageBg,
        '--cl-surface': appColors.surface,
        '--cl-surface-muted': appColors.surfaceMuted,
        '--cl-hover': appColors.hover,
        '--cl-selected': appColors.selected,
        '--cl-border': appColors.border,
        '--cl-text': appColors.text,
        '--cl-text-strong': appColors.textStrong,
        '--cl-text-muted': appColors.textMuted,
        '--cl-input-bg': appColors.inputBg,
        '--cl-shadow': appColors.shadow,
        '--cl-sidebar-width': sidebarWidth,
      }}
    >
      <Flex
        bg={appColors.navBg}
        borderRadius="12px"
        px={4}
        py={2}
        mb={3}
        minH="60px"
        align="center"
        justify="flex-start"
        border={`1px solid ${appColors.navBorder}`}
        gap={4}
      >
        <Box
          w="252px"
          flexShrink={0}
          display="flex"
          alignItems="center"
        >
          <Image
            src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
            alt="BIMSA Reports"
            h="48px"
            objectFit="contain"
            filter="brightness(0) invert(1)"
          />
        </Box>

        <HStack
          spacing={1}
          flex="1"
          justify="flex-start"
        >
          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            bg="transparent"
            
            color="white"
            borderBottom={activeView === 'mapa' ? '3px solid white' : '3px solid transparent'}
            fontWeight={activeView === 'mapa' ? '600' : '500'}
            cursor="pointer"
            fontSize="14px"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)', color: 'white' }}
            onClick={() => setActiveView('mapa')}
          >
            Mapa
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            bg="transparent"
            color="white"
            borderBottom={activeView === 'resultados' ? '3px solid white' : '3px solid transparent'}
            fontWeight={activeView === 'resultados' ? '600' : '500'}
            cursor="pointer"
            fontSize="14px"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)', color: 'white' }}
            onClick={() => setActiveView('resultados')}
          >
            Resultados
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="white"
            cursor="pointer"
            fontSize="14px"
            fontWeight={activeView === 'graficas' ? '600' : '500'}
            borderBottom={activeView === 'graficas' ? '3px solid white' : '3px solid transparent'}
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)' }}
            onClick={() => setActiveView('graficas')}
          >
            Gráficas
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="white"
            cursor="pointer"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)' }}
          >
            Analytics
          </Box>

          <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="white"
            cursor="pointer"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)' }}
          >
            Personalizado
          </Box>
        </HStack>

        <HStack spacing={3}>
          <Box
            as={isDarkMode ? FiSun : FiMoon}
            boxSize="20px"
            color="white"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: 'rgba(255,255,255,.82)' }}
            onClick={() => {
              setColorMode((current) =>
                current === 'dark' ? 'light' : 'dark'
              );
            }}
          />

          <Box
            as={FiSettings}
            boxSize="20px"
            color="white"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: 'rgba(255,255,255,.82)' }}
          />

          <Box
            as={FiLogOut}
            boxSize="20px"
            color="white"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: 'rgba(255,255,255,.82)' }}
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
              _hover={{ transform: 'translateY(-1px)' }}
              onClick={() => navigate('/construleads/perfil')}
              aria-label="Abrir perfil"
              title="Abrir perfil"
            >
              {getInitials(user.nombreUsuario)}
            </Box>

            <Box
              position="absolute"
              bottom="1px"
              right="-1px"
              w="8px"
              h="8px"
              borderRadius="full"
              bg="#35B56A"
              border="1px solid white"
            />
          </Box>
        </HStack>
      </Flex>
      <Flex
        gap={3}
        height={usesScaledCanvas
          ? `calc(${canvasViewportHeight} - 116px)`
          : 'calc(100vh - 116px)'}
        minH="0"
        overflow="hidden"
        align="stretch"
        flexDirection="row"
      >
        <Box position="relative" flexShrink={0} h="100%">
          <SidebarFiltros
            obras={obras}
            onApplyFilters={setFiltros}
          />
        </Box>

        <Box
          flex="1"
          minW="0"
          minH="0"
          h="100%"
          position="relative"
          display="flex"
          flexDirection="column"
        >
          <Box
            position="fixed"
            left={`calc(var(--cl-sidebar-width) + 24px)`}
            right="12px"
            bottom="12px"
            zIndex={40}
            pointerEvents="none"
          >
            <Flex
              pointerEvents="auto"
              align="end"
              gap={3}
              justify="space-between"
              width="100%"
            >
              <Box flex="1" minW="0">
                <PanelResumen
                  obras={filteredObras}
                  filtros={filtros}
                  variant="map"
                />
              </Box>
              <Box flexShrink={0}>
                <DownloadPanel selectedCount={selectedResultObras.length} />
              </Box>
            </Flex>
          </Box>

          <Box flex="1" minH="0" position="relative" mt={activeView === 'resultados' ? 0 : 3}>
            <style>{`
              @keyframes cl-view-enter {
                0% { opacity: 0; transform: translate3d(18px, 0, 0); }
                65% { opacity: 1; transform: translate3d(-2px, 0, 0); }
                100% { opacity: 1; transform: none; }
              }
              .cl-view-enter {
                animation: cl-view-enter 360ms cubic-bezier(.22, 1, .36, 1) both;
                backface-visibility: hidden;
              }
              @media (prefers-reduced-motion: reduce) { .cl-view-enter { animation: none; } }
            `}</style>
            {activeView === 'mapa' && <Box className="cl-view-enter" h="100%" minH="0" pb="50px">
              <Mapa
                obras={obras}
                filtros={filtros}
                isDarkMode={isDarkMode}
              />
            </Box>}

            {activeView === 'resultados' && <Box className="cl-view-enter" h="100%" minH="0" pb="50px">
              <Resultados
                filtros={filtros}
                obras={filteredObras}
                onSelectionChange={handleResultsSelectionChange}
                selectionResetToken={selectionResetToken}
                onGoToMap={() => setActiveView('mapa')}
              />
            </Box>}

            {activeView === 'graficas' && <Box className="cl-view-enter" h="100%" minH="0" pb="50px">
              <GraficasView
                obras={obras}
                filtros={filtros}
              />
            </Box>}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
