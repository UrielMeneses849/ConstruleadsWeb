import { useEffect, useRef, useState } from 'react';
import LandingNavbar from '../../../components/landing/Navbar';
import { styles } from './styles';

import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  VStack,
  HStack,
  Image,
  Icon,
  Button,
} from '@chakra-ui/react';

import {
  FiHome,
  FiTool,
  FiUsers,
  FiBriefcase,
  FiMapPin,
  FiShoppingBag,
  FiFlag,
  FiCheckCircle,
} from 'react-icons/fi';

const AUDIENCIAS = [
  {
    titulo: 'Constructoras',
    descripcion: 'Encuentra proyectos activos y licitaciones en todo México.',
    icono: FiHome,
  },
  {
    titulo: 'Cementeras y Fabricantes',
    descripcion: 'Identifica obras y proyectos donde tus productos tienen demanda.',
    icono: FiTool,
  },
  {
    titulo: 'Desarrolladores e inversionistas',
    descripcion: 'Accede a información estratégica para evaluar y planear nuevas inversiones.',
    icono: FiUsers,
  },
  {
    titulo: 'Industria y Comercio',
    descripcion: 'Descubre proyectos industriales y de infraestructura para expandir tu negocio.',
    icono: FiBriefcase,
  },
  {
    titulo: 'Hotelería y Comercio',
    descripcion: 'Monitorea proyectos de hoteles, resorts y desarrollos turísticos en todo el país.',
    icono: FiMapPin,
  },
  {
    titulo: 'Proveedores y distribuidores',
    descripcion: 'Detecta oportunidades comerciales y conecta con tomadores de decisión.',
    icono: FiShoppingBag,
  },
  {
    titulo: 'Infraestructura y Gobierno',
    descripcion: 'Consulta obras públicas y proyectos prioritarios por región.',
    icono: FiFlag,
  },
];

const BENEFICIOS = [
  'Descubre proyectos en etapa temprana',
  'Identifica licitaciones y obras públicas',
  'Monitorea tu competencia y el mercado',
  'Conecta con tomadores de decisión',
];

export default function Audiencia() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      {
        threshold: 0.35,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <LandingNavbar />

      <Container
        {...styles.container}
        ref={sectionRef}
      >

        <Box
          opacity={visible ? 1 : 0}
          transform={visible ? 'translateY(0px)' : 'translateY(50px)'}
          transition='all .9s cubic-bezier(0.22, 1, 0.36, 1)'
        >
          <Flex {...styles.hero}>
            <Box flex="1">
              <Text {...styles.eyebrow}>
                ¿A quién va dirigido?
              </Text>

              <Heading {...styles.title}>
                Información estratégica para cada actor{' '}
                <Text as="span" color="#FF6600">
                  de la industria.
                </Text>
              </Heading>

              <Text {...styles.description}>
                Bimsa Construleads conecta oportunidades con decisiones inteligentes.
                Nuestra plataforma impulsa el crecimiento de empresas que construyen,
                proveen, invierten y desarrollan proyectos en todo México.
              </Text>
            </Box>

            <Box
              flex="1"
              opacity={visible ? 1 : 0}
              transform={visible ? 'translateX(0px) scale(1)' : 'translateX(80px) scale(.94)'}
              transition='all 1.1s cubic-bezier(0.22, 1, 0.36, 1)'
            >
              <Image
                {...styles.heroImage}
                src={`${import.meta.env.BASE_URL}audiencia.png`}
                alt="Audiencia Construleads"
              />
            </Box>
          </Flex>
        </Box>

        <Flex {...styles.cardsGrid}>
          {AUDIENCIAS.map((item, index) => (
            <Flex
              key={item.titulo}
              {...styles.card}
              opacity={visible ? 1 : 0}
              transform={visible ? 'translateY(0px)' : 'translateY(60px)'}
              transition={`all .8s cubic-bezier(0.22, 1, 0.36, 1) ${index * 120}ms`}
            >
              <Flex {...styles.iconWrapper}>
                <Icon as={item.icono} color="white" boxSize={6} />
              </Flex>

              <Box>
                <Text {...styles.cardTitle}>
                  {item.titulo}
                </Text>

                <Text {...styles.cardDescription}>
                  {item.descripcion}
                </Text>
              </Box>
            </Flex>
          ))}
        </Flex>

        <Flex {...styles.benefitsSection}>
          <Box
            flex="1"
            opacity={visible ? 1 : 0}
            transform={visible ? 'translateX(0px)' : 'translateX(-80px)'}
            transition='all 1s cubic-bezier(0.22, 1, 0.36, 1) .2s'
          >
            <Heading {...styles.benefitsTitle}>
              Más proyectos
              <br />
              Mejores decisiones
            </Heading>

            <Text {...styles.benefitsDescription} mb={8}>
              Accede a información actualizada de proyectos de construcción para planear,
              competir y ganar más obras.
            </Text>

            <VStack {...styles.checklist}>
              {BENEFICIOS.map((beneficio) => (
                <HStack key={beneficio} spacing={3}>
                  <Icon as={FiCheckCircle} color="#FF6600" boxSize={5} />
                  <Text {...styles.checklistText}>
                    {beneficio}
                  </Text>
                </HStack>
              ))}
            </VStack>

            <Button {...styles.ctaButton} size="lg">
              Ver proyectos
            </Button>
          </Box>

          <Box
            flex="1"
            opacity={visible ? 1 : 0}
            transform={visible ? 'translateX(0px) scale(1)' : 'translateX(80px) scale(.95)'}
            transition='all 1.1s cubic-bezier(0.22, 1, 0.36, 1) .3s'
          >
            <Image
              {...styles.sectionImage}
              src={`${import.meta.env.BASE_URL}proyectos.png`}
              alt="Más proyectos"
            />
          </Box>
        </Flex>

      </Container>

    </>
  );
}