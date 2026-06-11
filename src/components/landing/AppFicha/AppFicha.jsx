import { Box, Button, Heading, Image, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

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
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={sectionRef} {...section}>
      <Box {...container}>

        <Box {...row}>
          <Image
            src={`${import.meta.env.BASE_URL}ficha.png`}
            alt='Ficha técnica'
            {...image}
            opacity={isVisible ? 1 : 0}
            transform={
              isVisible
                ? 'translateY(0) rotate(0deg)'
                : 'translateY(80px) rotate(-4deg)'
            }
            transition='all 1.2s cubic-bezier(0.22, 1, 0.36, 1)'
          />

          <Box
            opacity={isVisible ? 1 : 0}
            transform={isVisible ? 'translateY(0)' : 'translateY(60px)'}
            transition='all 1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s'
          >
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
          <Box
            opacity={isVisible ? 1 : 0}
            transform={isVisible ? 'translateY(0)' : 'translateY(60px)'}
            transition='all 1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s'
          >
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
            opacity={isVisible ? 1 : 0}
            transform={
              isVisible
                ? 'translateY(0) rotate(0deg)'
                : 'translateY(80px) rotate(4deg)'
            }
            transition='all 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.2s'
          />
        </Box>

      </Box>
    </Box>
  );
}