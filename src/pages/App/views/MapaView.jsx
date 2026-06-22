import { Box } from '@chakra-ui/react';
import Mapa from '../Mapa';
import PanelResumen from '../PanelResumen';

export default function MapaView({
  filtros,
  filteredObras,
  setFilteredObras,
}) {
  return (
    <>
      <Box flex="1">
        <Mapa
          filtros={filtros}
          onFilteredData={setFilteredObras}
        />
      </Box>

      <PanelResumen obras={filteredObras} />
    </>
  );
}