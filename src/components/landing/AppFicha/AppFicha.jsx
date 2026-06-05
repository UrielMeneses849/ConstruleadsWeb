

import { Box, Button, Heading, Image, Text } from '@chakra-ui/react';

import {
  section,
  container,
  row,
  title,
  highlight,
  description,
  image,
} from './style';

export default function AppFicha() {
  return (
    <Box {...section}>
      <Box {...container}>

        <Box {...row}>
          <Image
            src={`${import.meta.env.BASE_URL}ficha.png`}
            alt='Ficha técnica'
            {...image}
          />

          <Box>
            <Heading {...title}>
              <Box as='span' {...highlight}>
                Explora cada proyecto
              </Box>
              <br />
              a través de una ficha
              <br />
              con información
              <br />
              completa y detallada.
            </Heading>

            <Text {...description}>
              Podrás consultar información detallada de cada proyecto,
              desde la ubicación de la obra y el tipo de construcción
              hasta montos de inversión, datos de contacto,
              etapa actual y fechas clave del proyecto.
            </Text>

            <Button
              bg='primary.500'
              color='white'
              size='lg'
              borderRadius='16px'
              _hover={{ bg: 'primary.600' }}
            >
              Ver más información +
            </Button>
          </Box>
        </Box>

        <Box {...row}>
          <Box>
            <Heading {...title}>
              Lleva todo el poder de
              <Box as='span' {...highlight}>
                {' '}Bimsa Construleads
              </Box>
              <br />
              en la palma de
              <br />
              tu mano
            </Heading>

            <Text {...description}>
              Descubre proyectos estratégicos desde tu teléfono con un mapa
              interactivo que te permite localizar obras cerca de ti o en
              cualquier parte de México.
            </Text>

            <Box display='flex' gap='16px' flexWrap='wrap'>
              <Image src={`${import.meta.env.BASE_URL}gp.png`} alt='Google Play' h='50px' />
              <Image src={`${import.meta.env.BASE_URL}as.png`} alt='App Store' h='50px' />
            </Box>
          </Box>

          <Image
            src={`${import.meta.env.BASE_URL}app.png`}
            alt='Aplicación móvil'
            {...image}
          />
        </Box>

      </Box>
    </Box>
  );
}