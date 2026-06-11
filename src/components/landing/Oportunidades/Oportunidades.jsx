import { Box, Flex, Heading, Text, Image } from '@chakra-ui/react';
import { useInView } from 'react-intersection-observer';
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
    icono: `${import.meta.env.BASE_URL}vivienda.png`,
  },
  {
    titulo: 'Edificaciones',
    porcentaje: '13%',
    descripcion:
      'Desarrollos corporativos, comerciales, institucionales, educativos y salud.',
    icono: `${import.meta.env.BASE_URL}edificaciones.png`,
  },
  {
    titulo: 'Desarrollos industriales',
    porcentaje: '16%',
    descripcion:
      'Crecimiento estratégico de desarrollos industriales y corporativos con alta actividad constructiva.',
    icono: `${import.meta.env.BASE_URL}industriales.png`,
  },
  {
    titulo: 'Obras de infraestructura',
    porcentaje: '10%',
    descripcion:
      'Desarrollo de infraestructura pública y privada para movilidad, conectividad y servicios urbanos.',
    icono: `${import.meta.env.BASE_URL}infra.png`,
  },
];

const beneficios = [
  {
    titulo: 'Datos',
    highlight: 'de alto impacto.',
    descripcion:
      'Accede a información confiable para decisiones más precisas.',
      icono: `${import.meta.env.BASE_URL}datos.svg`,
  },
  {
    titulo: 'Anticipación',
    highlight: 'Estratégica.',
    descripcion:
      'Identifica proyectos antes que tu competencia y actúa a tiempo.',
      icono: `${import.meta.env.BASE_URL}ico1.svg`,
  },
  {
    titulo: 'Contactos',
    highlight: 'Directos.',
    descripcion:
      'Llega a los tomadores de decisión sin intermediarios.',
      icono: `${import.meta.env.BASE_URL}contacts.svg`,
  },
];

export default function Oportunidades() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });
  const {
    ref: benefitsRef,
    inView: benefitsInView,
  } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });
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

        <Box
          {...grid}
          ref={ref}
        >
          {oportunidades.map((item, index) => (
            <Box
              key={item.titulo}
              bg='white'
              borderRadius='18px'
              p='24px'
              textAlign='center'
              boxShadow='0px 4px 10px rgba(0,0,0,0.12)'
              borderBottom='3px solid'
              borderColor='primary.500'
              opacity={inView ? 1 : 0}
              transform={
                inView
                  ? 'translateY(0px) scale(1)'
                  : 'translateY(50px) scale(0.95)'
              }
              transition={`all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.12}s`}
            >
              <Image
                src={item.icono}
                alt={item.titulo}
                w='96px'
                h='96px'
                mx='auto'
                mb='16px'
              />

              <Text
                fontSize='24px'
                fontWeight='600'
                color='#041A46'
                mb='16px'
                minH='72px'
              >
                {item.titulo}
              </Text>

              <Box
                w='64px'
                h='2px'
                bg='primary.500'
                mx='auto'
                mb='16px'
              />

              <Text
                color='#FF6400'
                fontSize='48px'
                fontWeight='700'
                lineHeight='1'
              >
                {item.porcentaje}
              </Text>

              <Text
                color='#041A46'
                fontSize='16px'
                mb='16px'
              >
                de los proyectos destacados
              </Text>

              <Box borderTop='1px solid' borderColor='gray.300' pt='12px'>
                <Text
                  color='#041A46'
                  fontSize='16px'
                  fontWeight='600'
                  lineHeight='1.5'
                >
                  {item.descripcion}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          {...benefitsSection}
          ref={benefitsRef}
        >
          <Heading
            {...benefitsTitle}
            opacity={benefitsInView ? 1 : 0}
            transform={benefitsInView ? 'translateY(0px)' : 'translateY(40px)'}
            transition='all 0.9s cubic-bezier(0.22, 1, 0.36, 1)'
          >
            ¿Por qué las empresas líderes
            <br />
            eligen <Box as='span' {...highlight}>Construleads?</Box>
          </Heading>

          <Box {...benefitsGrid}>
            {beneficios.map((item, index) => (
              <Box
                key={item.titulo}
                {...benefitCard}
                opacity={benefitsInView ? 1 : 0}
                transform={
                  benefitsInView
                    ? 'translateY(0px) scale(1)'
                    : 'translateY(50px) scale(0.95)'
                }
                transition={`all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.2 + index * 0.15}s`}
              >
                <Flex align='flex-start' gap='14px'>
<Box
  w='64px'
  h='64px'
  bg='primary.500'
  borderRadius='16px'
  display='flex'
  alignItems='center'
  justifyContent='center'
  flexShrink={0}
>
  <Image
    src={item.icono}
    alt={item.titulo}
    w='32px'
    h='32px'
    objectFit='contain'
  />
</Box>

                  <Box>
                    <Text
                      fontSize='22px'
                      fontWeight='700'
                      color='#041A46'
                      lineHeight='1.1'
                    >
                      {item.titulo}
                    </Text>

                    <Text
                      fontSize='16px'
                      fontWeight='600'
                      color='primary.500'
                      mb='8px'
                    >
                      {item.highlight}
                    </Text>

                    <Text
                      color='#041A46'
                      fontSize='15px'
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