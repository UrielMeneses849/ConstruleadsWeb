import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { keyframes } from "@emotion/react";

import { heroStyles } from "./styles";

const textReveal = keyframes`
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const imageReveal = keyframes`
  from {
    opacity: 0;
    transform: translateX(120px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const imageFloat = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

export default function Hero() {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const x = (window.innerWidth / 2 - clientX) * 0.015;
    const y = (window.innerHeight / 2 - clientY) * 0.015;

    setParallax({ x, y });
  };

  return (
    <Box
      {...heroStyles.wrapper}
      onMouseMove={handleMouseMove}
    >
      <Container maxW="90%">
        <Flex {...heroStyles.container}>

          {/* LEFT CONTENT */}
          <VStack
            {...heroStyles.content}
            animation={`${textReveal} 0.9s ease-out`}
          >

            <Heading {...heroStyles.title}>
              <Text as="span" color="primary.500">
                INFORMACIÓN ESTRATÉGICA
              </Text>

              <br />

              PARA HACER CRECER TU NEGOCIO
            </Heading>

            <Text {...heroStyles.description}>
              Descubre proyectos, conecta con tomadores de decisión y
              encuentra nuevas oportunidades en la industria de la
              construcción.
            </Text>

          </VStack>

          {/* RIGHT IMAGE */}
          <Box
            {...heroStyles.imageWrapper}
            animation={`${imageReveal} 1s ease-out`}
            transition="transform 0.15s linear"
            transform={`translate(${parallax.x}px, ${parallax.y}px)`}
          >
            <Image
              src={`${import.meta.env.BASE_URL}hero-city.png`}
              alt="Construleads Hero"
              {...heroStyles.image}
              animation={`${imageFloat} 8s ease-in-out infinite`}
            />
          </Box>

        </Flex>
      </Container>
    </Box>
  );
}