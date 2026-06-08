import { useEffect, useRef, useState } from 'react';
import * as styles from './styles';

import LandingNavbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer/Footer';

import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  VStack,
  HStack,
  Image,
  Button,
  Icon,
} from '@chakra-ui/react';

import {
  FiTrendingUp,
  FiUsers,
  FiShield,
  FiMap,
  FiBarChart2,
  FiMonitor,
} from 'react-icons/fi';

export default function Beneficios() {
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

  const beneficios = [
    {
      titulo: 'Anticipación estratégica',
      descripcion:
        'Conoce proyectos y obras desde etapas tempranas para actuar antes que tu competencia.',
      icon: FiTrendingUp,
    },
    {
      titulo: 'Contactos clave',
      descripcion:
        'Accede a datos de desarrolladores, constructoras y tomadores de decisión.',
      icon: FiUsers,
    },
    {
      titulo: 'Información verificada',
      descripcion:
        'Consulta datos actualizados y monitoreados constantemente por especialistas BIMSA.',
      icon: FiShield,
    },
    {
      titulo: 'Cobertura nacional',
      descripcion:
        'Explora oportunidades en cualquier región de México desde una sola plataforma.',
      icon: FiMap,
    },
    {
      titulo: 'Inteligencia comercial',
      descripcion:
        'Identifica sectores con mayor actividad, inversión y crecimiento.',
      icon: FiBarChart2,
    },
    {
      titulo: 'Acceso multiplataforma',
      descripcion:
        'Consulta proyectos desde desktop o móvil con mapas interactivos y filtros avanzados.',
      icon: FiMonitor,
    },
  ];

  return (
    <Box
      ref={sectionRef}
      bg="#F8F8F8"
      minH="100vh"
    >
      <LandingNavbar />
      <Container
        maxW="1400px"
        pt={{ base: 24, lg: 32 }}
        pb={{ base: 8, lg: 12 }}
      >
        <VStack
          align="start"
          spacing={4}
          mb={12}
          opacity={visible ? 1 : 0}
          transform={visible ? 'translateY(0px)' : 'translateY(40px)'}
          transition='all .9s cubic-bezier(0.22, 1, 0.36, 1)'
        >
          <Heading
            maxW="900px"
            fontSize={{ base: '40px', md: '48px' }}
            lineHeight="1.05"
            color="#071B52"
          >
            Inteligencia estratégica para detectar{' '}
            <Text as="span" color="#FF6600">
              oportunidades
            </Text>{' '}
            antes que nadie
          </Heading>

          <Text
            maxW="850px"
            fontSize={{ base: '16px', md: '20px' }}
            color="#071B52"
          >
            Obtén acceso a proyectos estratégicos, contactos clave e
            información actualizada para prospectar de manera más inteligente.
          </Text>
        </VStack>

        <Flex
          gap={{ base: 10, xl: 6 }}
          align="center"
          direction={{ base: 'column', xl: 'row' }}
        >
          <VStack
            flex="0.9"
            spacing={3}
            w="100%"
            maxW="620px"
          >
            {beneficios.map((item, index) => (
              <HStack
                key={item.titulo}
                w="100%"
                bg="white"
                p={4}
                borderRadius="18px"
                borderLeft="4px solid #FF6600"
                boxShadow="0 8px 30px rgba(0,0,0,.08)"
                align="start"
                spacing={5}
                opacity={visible ? 1 : 0}
                transform={visible ? 'translateX(0px)' : 'translateX(-60px)'}
                transition={`all .8s cubic-bezier(0.22, 1, 0.36, 1) ${index * 120}ms`}
              >
                <Flex
                  minW="48px"
                  h="48px"
                  borderRadius="full"
                  bg="#F5F5F5"
                  align="center"
                  justify="center"
                >
                  <Icon
                    as={item.icon}
                    boxSize={5}
                    color="#FF6600"
                  />
                </Flex>

                <Box>
                  <Text
                    fontWeight="700"
                    fontSize="16px"
                    lineHeight="1.2"
                    color="#071B52"
                    mb={2}
                  >
                    {item.titulo}
                  </Text>

                  <Text
                    color="#071B52"
                    fontSize="14px"
                    lineHeight="1.5"
                    opacity={0.85}
                  >
                    {item.descripcion}
                  </Text>
                </Box>
              </HStack>
            ))}
          </VStack>

          <Box
            flex="1.2"
            w="100%"
            mt={{ base: 0, xl: '-80px' }}
            opacity={visible ? 1 : 0}
            transform={visible ? 'translateX(0px) scale(1)' : 'translateX(80px) scale(.94)'}
            transition='all 1.1s cubic-bezier(0.22, 1, 0.36, 1)'
          >
            <Image
              src={`${import.meta.env.BASE_URL}beneficios.png`}
              alt="Dashboard"
              w="100%"
              objectFit="contain"
            />
          </Box>
        </Flex>

        <Flex
          mt={12}
          opacity={visible ? 1 : 0}
          transform={visible ? 'translateY(0px)' : 'translateY(50px)'}
          transition='all 1s cubic-bezier(0.22, 1, 0.36, 1) .4s'
          bg="white"
          borderRadius="20px"
          p={6}
          justify="space-between"
          align="center"
          direction={{ base: 'column', md: 'row' }}
          gap={6}
          boxShadow="0 8px 30px rgba(0,0,0,.08)"
        >
          <Box>
            <Heading size="md" color="#071B52" mb={2}>
              Convierte datos en ventajas competitivas
            </Heading>
            <Text color="#071B52">
              BIMSA te da la información que necesitas para crecer.
            </Text>
          </Box>

          <HStack spacing={4}>
            <Button variant="outline">Conocer beneficios</Button>
            <Button bg="#FF6600" color="white">
              Solicitar Demo
            </Button>
          </HStack>
        </Flex>
      </Container>

      <Footer />
    </Box>
  );
}