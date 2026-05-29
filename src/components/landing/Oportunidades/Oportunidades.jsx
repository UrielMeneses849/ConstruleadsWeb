import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import {
  section,
  container,
  title,
  highlight,
  subtitle,
  grid,
  card,
  overlay,
  benefitsSection,
  benefitsTitle,
  benefitsGrid,
  benefitCard,
} from './style';

const oportunidades = [
  {
    titulo: 'Casas',
    porcentaje: '72%',
    descripcion:
      'Concentración de proyectos residenciales de lujo, media y social.',
    imagen: '/assets/oportunidades/casas.jpg',
  },
  {
    titulo: 'Edificaciones',
    porcentaje: '13%',
    descripcion:
      'Desarrollos corporativos, comerciales, institucionales, educativos y salud.',
    imagen: '/assets/oportunidades/edificaciones.jpg',
  },
  {
    titulo: 'Desarrollos industriales',
    porcentaje: '16%',
    descripcion:
      'Crecimiento estratégico de desarrollos industriales y corporativos con alta actividad constructiva.',
    imagen: '/assets/oportunidades/industrial.jpg',
  },
  {
    titulo: 'Obras de infraestructura',
    porcentaje: '10%',
    descripcion:
      'Desarrollo de infraestructura pública y privada para movilidad, conectividad y servicios urbanos.',
    imagen: '/assets/oportunidades/infraestructura.jpg',
  },
];

const beneficios = [
  {
    titulo: 'Datos',
    highlight: 'de alto impacto.',
    descripcion:
      'Accede a información confiable para decisiones más precisas.',
  },
  {
    titulo: 'Anticipación',
    highlight: 'Estratégica.',
    descripcion:
      'Identifica proyectos antes que tu competencia y actúa a tiempo.',
  },
  {
    titulo: 'Contactos',
    highlight: 'Directos.',
    descripcion:
      'Llega a los tomadores de decisión sin intermediarios.',
  },
];

export default function Oportunidades() {
  return (
    <Box {...section}>
      <Box {...container}>
        <Heading {...title}>
          <Box as='span' {...highlight}>
            +10,000 oportunidades
          </Box>{' '}
          reales
          <br />
          detectadas en el último año
        </Heading>

        <Text {...subtitle}>
          Distribución de proyectos que puedes aprovechar con
          <Box as='span' {...highlight}> Construleads</Box>
        </Text>

        <Box {...grid}>
          {oportunidades.map((item) => (
            <Box
              key={item.titulo}
              {...card}
              backgroundImage={`url(${item.imagen})`}
            >
              <Box {...overlay}>
                <Flex justify='space-between' align='center' mb='16px'>
                  <Text
                    fontSize='36px'
                    fontWeight='700'
                    color='secondary.500'
                  >
                    {item.titulo}
                  </Text>

                  <Box textAlign='right'>
                    <Text
                      color='primary.500'
                      fontSize='40px'
                      fontWeight='700'
                    >
                      {item.porcentaje}
                    </Text>
                    <Text color='secondary.400'>
                      total de proyectos publicados
                    </Text>
                  </Box>
                </Flex>

                <Box
                  borderTop='1px solid'
                  borderColor='gray.300'
                  pt='16px'
                >
                  <Text
                    color='secondary.400'
                    textAlign='center'
                    fontSize='20px'
                  >
                    {item.descripcion}
                  </Text>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        <Box {...benefitsSection}>
          <Heading {...benefitsTitle}>
            ¿Por qué las empresas líderes
            <br />
            eligen <Box as='span' {...highlight}>Construleads?</Box>
          </Heading>

          <Box {...benefitsGrid}>
            {beneficios.map((item) => (
              <Box key={item.titulo} {...benefitCard}>
                <Flex align='flex-start' gap='20px'>
                  <Box
                    w='88px'
                    h='88px'
                    bg='primary.500'
                    borderRadius='20px'
                    flexShrink={0}
                  />

                  <Box>
                    <Text
                      fontSize='40px'
                      fontWeight='700'
                      color='secondary.500'
                      lineHeight='1.1'
                    >
                      {item.titulo}
                    </Text>

                    <Text
                      fontSize='28px'
                      fontWeight='600'
                      color='primary.500'
                      mb='16px'
                    >
                      {item.highlight}
                    </Text>

                    <Text
                      color='secondary.400'
                      fontSize='22px'
                      lineHeight='1.6'
                    >
                      {item.descripcion}
                    </Text>
                  </Box>
                </Flex>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}