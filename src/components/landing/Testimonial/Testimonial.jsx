

import {
  Box,
  Flex,
  Heading,
  Image,
  Text,
} from "@chakra-ui/react";

import {
  testimonialSection,
  testimonialContainer,
  testimonialTitle,
  testimonialHighlight,
  testimonialWrapper,
  testimonialGrid,
  testimonialCard,
  testimonialAvatar,
  testimonialName,
  testimonialRole,
  testimonialText,
  testimonialQuote,
  arrowButton,
} from "./style";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const testimonials = [
  {
    name: "Adolfo Gutiérrez Álvarez",
    role: "Building & Infrastructure - Holcim",
    text: "Gracias a Construleads y BR Analytics entendimos mejor a nuestros clientes. Generamos propuestas más efectivas.",
    image: "/assets/testimonials/testimonial-1.png",
  },
  {
    name: "Omar Armas",
    role: "Gerente de Inteligencia de Mercados - Grupo Posadas",
    text: "Construleads nos brinda información clave para recomendaciones y nuevas oportunidades de negocio.",
    image: "/assets/testimonials/testimonial-2.png",
  },
  {
    name: "Ruben Reyes Torres",
    role: "Gerente Línea Adhesivos - CEMIX",
    text: "El acceso a Construleads nos acerca más a nuestros clientes y nos lleva a proyectos con mejores oportunidades.",
    image: "/assets/testimonials/testimonial-3.png",
  },
];

export default function Testimonial() {
  return (
    <Box {...testimonialSection}>
      <Flex {...testimonialContainer}>
        <Heading {...testimonialTitle}>
          Líderes de la industria ya
          <br />
          <Box as="span" {...testimonialHighlight}>
            prospectan con nosotros
          </Box>
        </Heading>

        <Flex {...testimonialWrapper}>
          <Flex {...arrowButton}>
            <FiChevronLeft boxSize={7} />
          </Flex>

          <Box {...testimonialGrid}>
            {testimonials.map((testimonial, index) => (
              <Flex key={index} {...testimonialCard}>
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  {...testimonialAvatar}
                />

                <Text {...testimonialName}>
                  {testimonial.name}
                </Text>

                <Text {...testimonialRole}>
                  {testimonial.role}
                </Text>

                <Text {...testimonialText}>
                  {testimonial.text}
                </Text>

                <Text {...testimonialQuote}>
                  ”
                </Text>
              </Flex>
            ))}
          </Box>

          <Flex {...arrowButton}>
            <FiChevronRight boxSize={7} />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}