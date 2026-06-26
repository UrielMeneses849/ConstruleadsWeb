import {
  Box,
  Flex,
  Heading,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';
import React, { useMemo, useState, useRef, useEffect } from 'react';

const mockData = Array.from({ length: 16 }, (_, i) => ({
  clave: i % 2 === 0 ? 'OC328735' : 'PP235080',
  proyecto: `Proyecto ${i + 1}`,
  genero: 'Vivienda',
  estado: ['CDMX', 'Guerrero', 'Edo. México', 'Guanajuato'][i % 4],
  inicio: '30-04-2026',
  fin: '30-04-2026',
  publicacion: '30-03-2026',
  tipo: i % 2 === 0 ? 'Proyecto contratado' : 'Proyecto de inversión',
}));

export default function ResultadosView({ obras = [] }) {
  console.log('RESULTADOS VIEW RECIBIO OBRAS:', obras.length);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterMenu, setFilterMenu] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});

  const [filterPosition, setFilterPosition] = useState({
  top: 0,
  left: 0,
});

  const tableData = (obras || []).map((obra, index) => {
        console.log('OBRA TABLA:', obra);
        console.log('KEYS OBRA:', Object.keys(obra));

        return {
          id:
            obra.Id_Obra ||
            obra.ID_OBRA ||
            obra.id_obra ||
            index,

          clave:
            obra.clave ||
            obra.Clave_Proyecto ||
            obra.CLAVE_PROYECTO ||
            obra.clave_proyecto ||
            obra.claveProyecto ||
            obra.ClaveProyecto ||
            obra.claveproyecto ||
            '-',

          proyecto:
            obra.proyecto ||
            obra.Proyecto ||
            obra.PROYECTO ||
            obra.Nombre_Proyecto ||
            obra.NOMBRE_PROYECTO ||
            '-',

          genero:
            obra.genero ||
            obra.Genero ||
            obra.GENERO ||
            '-',

          estado:
            obra.estado ||
            obra.Estado_Proyecto ||
            obra.ESTADO_PROYECTO ||
            obra.estado_proyecto ||
            obra.Estado ||
            obra.ESTADO ||
            '-',

          inicio:
            obra.fechaInicio ||
            obra.Fecha_Inicio ||
            obra.FECHA_INICIO ||
            obra.fecha_inicio ||
            obra.FechaInicio ||
            obra.fechainicio ||
            '-',

          fin:
            obra.fechaTermino ||
            obra.Fecha_Terminacion ||
            obra.FECHA_TERMINACION ||
            obra.fecha_terminacion ||
            obra.FechaTerminacion ||
            obra.fechaterminacion ||
            obra.Fecha_Fin ||
            obra.FECHA_FIN ||
            obra.fecha_fin ||
            '-',

          publicacion:
            obra.fechaPublicacion ||
            obra.Fecha_publicacion ||
            obra.FECHA_PUBLICACION ||
            obra.fecha_publicacion ||
            obra.FechaPublicacion ||
            obra.fechapublicacion ||
            obra.Fecha_Publicacion ||
            '-',

          tipo:
            obra.tipoProyecto ||
            obra.Tipo_Proyecto ||
            obra.TIPO_PROYECTO ||
            obra.tipo_proyecto ||
            obra.TipoProyecto ||
            obra.tipoproyecto ||
            '-',
        };
      });

  console.log('TABLA RECIBIÓ:', obras.length, 'OBRAS');

  if (obras.length > 0) {
    console.log('PRIMERA OBRA TABLA:', obras[0]);
    console.log('ULTIMA OBRA TABLA:', obras[obras.length - 1]);
  }

  console.log('RENDER TABLA =>', {
    obrasRecibidas: obras?.length,
    filasTabla: tableData.length,
  });

  const filteredData = tableData.filter((row) => {
    return Object.entries(columnFilters).every(([field, values]) => {
      if (!values || values.length === 0) return true;
      return values.includes(String(row[field] ?? ''));
    });
  });

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    // Copy data to avoid mutating original
    const data = [...filteredData];
    data.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      // Treat '-' or null as empty string for sorting
      av = av === null || av === undefined || av === '-' ? '' : av;
      bv = bv === null || bv === undefined || bv === '-' ? '' : bv;
      // Try to compare as numbers if possible, else as string
      if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
        av = Number(av);
        bv = Number(bv);
      }
      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredData, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  const getUniqueValues = (field) => {
    return [...new Set(tableData.map(row => String(row[field] ?? '')).filter(Boolean))]
      .sort();
  };

  const toggleFilterValue = (field, value) => {
    setColumnFilters(prev => {
      const current = prev[field] || [];

      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  };

  return (
    <Box height="calc(100vh - 96px)" display="flex" flexDirection="column" bg="white" border="1px solid #ECECEC" borderRadius="12px" p={3}>
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md" color="#202020">Tabla</Heading>

        <HStack spacing={3}>
          <Text fontSize="13px" color="#6B7280">Ordenar por:</Text>

          <select
            style={{
              width: '220px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #ECECEC',
              padding: '0 12px',
              background: 'white',
              color: '#202020',
              fontSize: '13px',
            }}
          >
            <option>Fecha de publicación</option>
            <option>Fecha inicio</option>
            <option>Estado</option>
          </select>

          <Button
            bg="#FF6600"
            color="white"
            _hover={{ bg: '#E65C00' }}
            borderRadius="8px"
            px={4}
            h="36px"
            fontSize="13px"
            transition="all 180ms ease"
          >
            Descargar
          </Button>
        </HStack>
      </Flex>

      <Box
        bg="white"
        border="1px solid #ECECEC"
        borderRadius="8px"
        overflow="hidden"
        flex="1"
        minH="0"
        display="flex"
        flexDirection="column"
        height="100%"
        position="relative"
      >
        <table
          style={{
            width: '100%',
            height: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            tableLayout: 'fixed',
          }}
        >
          <thead style={{ background: '#FAFAFA' }}>
            <tr>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '10%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('clave')}
              >
                <Flex align='center' gap={2}>
                  <span>Clave</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('clave');
  }}
>
  ⏷
</span>
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '24%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('proyecto')}
              >
                <Flex align='center' gap={2}>
                  <span>Proyecto</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('proyecto');
  }}
>
  ⏷
</span>
                  
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '10%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('genero')}
              >
                <Flex align='center' gap={2}>
                  <span>Género</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('genero');
  }}
>
  ⏷
</span>
               
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '11%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('estado')}
              >
                <Flex align='center' gap={2}>
                  <span>Estado</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('estado');
  }}
>
  ⏷
</span>
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '11%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('inicio')}
              >
                <Flex align='center' gap={2}>
                  <span>Inicio</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('inicio');
  }}
>
  ⏷
</span>
                  
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '11%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('fin')}
              >
                <Flex align='center' gap={2}>
                  <span>Fin</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('fin');
  }}
>
  ⏷
</span>
                  
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '11%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('publicacion')}
              >
                <Flex align='center' gap={2}>
                  <span>Publicación</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('publicacion');
  }}
>
  ⏷
</span>
                  
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '10%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('tipo')}
              >
                <Flex align='center' gap={2}>
                  <span>Tipo</span>
<span
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu('tipo');
  }}
>
  ⏷
</span>
                 
                </Flex>
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#4A5568',
                  width: '8%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px'
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          {filterMenu && (
            <div
              style={{
position: 'fixed',
top: `${filterPosition.top}px`,
left: `${filterPosition.left - 20}px`,
                zIndex: 1000,
                background: 'white',
                border: '1px solid #ECECEC',
                borderRadius: '8px',
                padding: '12px',
                width: '260px',
                maxHeight: '320px',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,.10)',
                color: '#202020',
                fontSize: '13px'
              }}
            >
              {getUniqueValues(filterMenu).map(value => (
                <label
                  key={value}
                  style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                >
                  <input
                    type='checkbox'
                    checked={(columnFilters[filterMenu] || []).includes(value)}
                    onChange={() => toggleFilterValue(filterMenu, value)}
                  />
                  {value}
                </label>
              ))}
            </div>
          )}

          <style>
            {`
              thead, tbody tr {
                display: table;
                width: 100%;
                table-layout: fixed;
              }
            `}
          </style>

          <tbody
            key={`tbody-${obras.length}`}
            style={{
              display: 'block',
              overflowY: 'auto',
              height: 'calc(100vh - 310px)',
            }}
          >
            {sortedData.map((row, index) => {
              if (index === 0) {
                console.log('PRIMERA FILA RENDERIZADA:', row);
              }

              return (
                <tr
                  key={row.id || row.clave || index}
                  style={{
                    background: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    display: 'table',
                    width: '100%',
                    tableLayout: 'fixed',
                  }}
                >
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '10%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.clave}</td>
                  <td
                    style={{
                      padding: '12px 16px',
                      borderTop: '1px solid #ECECEC',
                      width: '24%',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      lineHeight: '1.5',
                      fontSize: '13px'
                    }}
                  >
                    {row.proyecto}
                  </td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '10%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.genero}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '11%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.estado}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '11%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.inicio}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '11%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.fin}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '11%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.publicacion}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '10%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.tipo}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #ECECEC', width: '8%', whiteSpace: 'nowrap', fontSize: '13px' }}>
                    <HStack spacing={2}>
                      <Button size="xs" variant="outline" borderColor="#ECECEC" color="#FF6600" borderRadius="8px" _hover={{ bg: '#FAFAFA', borderColor: '#FF6600' }}>👁</Button>
                      <Button size="xs" variant="outline" borderColor="#ECECEC" color="#FF6600" borderRadius="8px" _hover={{ bg: '#FAFAFA', borderColor: '#FF6600' }}>↓</Button>
                    </HStack>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      <Flex
        justify="space-between"
        align="center"
        px={3}
        borderTop="1px solid #ECECEC"
        bg="white"
        py={3}
        mt={0}
      >
        <Text color="#6B7280" fontSize="13px">
          Mostrando {sortedData.length} resultados
        </Text>
        <Box flex="1" />
        <HStack spacing={2}>
          <Button size="sm" variant="outline" borderRadius="8px">&lt;</Button>
          <Button size="sm" bg="#FF6600" color="white" borderRadius="8px">1</Button>
          <Button size="sm" variant="outline" borderRadius="8px">2</Button>
          <Button size="sm" variant="outline" borderRadius="8px">3</Button>
          <Button size="sm" variant="outline" borderRadius="8px">12</Button>
          <Button size="sm" variant="outline" borderRadius="8px">&gt;</Button>
        </HStack>
      </Flex>
    </Box>
  );
}
