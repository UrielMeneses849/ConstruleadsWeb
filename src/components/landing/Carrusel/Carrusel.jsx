import { Box, Flex, Image } from "@chakra-ui/react";
import { carruselContainer, carruselTrack, carruselItem } from "./styles";

// 📦 Logos del carrusel
// Guarda tus imágenes dentro de:
// public/assets/logos/

const logos = [
  `${import.meta.env.BASE_URL}logos/helvex.png`,
  `${import.meta.env.BASE_URL}logos/TheHomeDepot.png`,
  `${import.meta.env.BASE_URL}logos/holcim.png`,
  `${import.meta.env.BASE_URL}logos/whirpool.png`,
  `${import.meta.env.BASE_URL}logos/urrea.svg`,

  `${import.meta.env.BASE_URL}logos/berel.png`,
  `${import.meta.env.BASE_URL}logos/castel.webp`,
  `${import.meta.env.BASE_URL}logos/ae.svg`,
  `${import.meta.env.BASE_URL}logos/cemposa.png`,

  `${import.meta.env.BASE_URL}logos/helvex.png`,
  `${import.meta.env.BASE_URL}logos/TheHomeDepot.png`,
  `${import.meta.env.BASE_URL}logos/holcim.png`,
  `${import.meta.env.BASE_URL}logos/whirpool.png`,
  `${import.meta.env.BASE_URL}logos/urrea.svg`,
];
// duplicamos el array para lograr el efecto infinito
const duplicatedLogos = [...logos, ...logos];

export default function Carrusel() {
  return (
    <Box {...carruselContainer}>
      <Flex {...carruselTrack}>
        {duplicatedLogos.map((logo, index) => (
          <Flex key={index} {...carruselItem}>
            <Image
              src={logo}
              alt={`logo-${index}`}
              objectFit="contain"
              width="100%"
              height="100%"
              maxH="80px"
              maxW="180px"
              transition="transform 0.25s ease"
              _hover={{
                transform: "scale(1.15)",
              }}
            />
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}