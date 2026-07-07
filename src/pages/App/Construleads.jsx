import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';

import {
  Box,
  Flex,
  HStack,
  Image,
  Text,
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
import DownloadPanel from './DownloadPanel';
import { obtenerObras } from '../../api/obras';
import { parseObrasXml } from '../../utils/parseObrasXml';

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

export default function Construleads() {
  const isAuthenticated =
    localStorage.getItem(
      'cl_authenticated'
    ) === 'true';

  const [filtros, setFiltros] = useState({});
  const [obras, setObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [filteredObras, setFilteredObras] = useState([]);
  const [selectedResultObras, setSelectedResultObras] = useState([]);
  const [selectionResetToken, setSelectionResetToken] = useState(0);
  const [activeView, setActiveView] = useState('mapa');
  const [colorMode, setColorMode] = useState(() =>
    localStorage.getItem('cl_color_mode') || 'light'
  );
  const isDarkMode = colorMode === 'dark';

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
        navBg: '#E65C00',
        navBorder: '#E65C00',
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
        navBg: '#FF6600',
        navBorder: '#FF6600',
      };

  useEffect(() => {
    localStorage.setItem('cl_color_mode', colorMode);
  }, [colorMode]);

  useEffect(() => {
    const syncFilters = () => {
      setFiltros(window.construleadsFilters || {});
    };

    syncFilters();

    window.addEventListener(
      'construleads-filters-changed',
      syncFilters
    );

    return () => {
      window.removeEventListener(
        'construleads-filters-changed',
        syncFilters
      );
    };
  }, []);

  useEffect(() => {
    async function cargarObras() {
      try {
        setLoadingObras(true);

        const xml = await obtenerObras();

        const obrasParseadas = parseObrasXml(xml);

                console.log(
          'TOTAL OBRAS WS:',
          obrasParseadas.length
        );

        console.log(
          'PRIMERA OBRA:',
          obrasParseadas[0]
        );

        console.log('OBRAS WS:', obrasParseadas.length);

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

  console.log('CONSTRULEADS STATE =>', {
    obras: obras.length,
    filteredObras: filteredObras.length,
    activeView,
  });

  return (
    <Box
      bg={appColors.pageBg}
      minH="100vh"
      p={3}
      color={appColors.text}
      transition="background 180ms ease, color 180ms ease"
      style={{
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
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)' }}
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
    w="32px"
    h="32px"
    borderRadius="full"
    bg="white"
    display="flex"
    alignItems="center"
    justifyContent="center"
    fontWeight="600"
    fontSize="12px"
    color="#FF6600"
  >
    UM
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
      <Box
        position="fixed"
        left={`calc(272px + 24px)`}
        right="96px"
        bottom="16px"
        zIndex={40}
        pointerEvents="none"
      >
        <Box pointerEvents="auto">
          <PanelResumen obras={filteredObras.length ? filteredObras : obras} variant="map" />
        </Box>
      </Box>
      <Flex
        gap={3}
        height="calc(100vh - 116px)"
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
          <Box position="absolute" top="-3px" right="20px" zIndex={30}>
            <DownloadPanel selectedCount={selectedResultObras.length} />
          </Box>

          <Box flex="1" minH="0" position="relative" mt={activeView === 'resultados' ? 0 : 3}>
            <Box display={activeView === 'mapa' ? 'block' : 'none'} h="100%" minH="0">
              <Mapa
                obras={obras}
                filtros={filtros}
                isDarkMode={isDarkMode}
                onFilteredData={setFilteredObras}
              />
            </Box>

            <Box display={activeView === 'resultados' ? 'block' : 'none'} h="100%" minH="0" pt="56px">
              <Resultados
                filtros={filtros}
                obras={filteredObras}
                onSelectionChange={handleResultsSelectionChange}
                selectionResetToken={selectionResetToken}
                onGoToMap={() => setActiveView('mapa')}
              />
            </Box>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
