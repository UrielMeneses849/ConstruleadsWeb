import { Flex, VStack, Text } from "@chakra-ui/react";

import Carrusel from "./components/landing/Carrusel/Carrusel";
import LandingNavbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero/Hero";
import Testimonial from "./components/landing/Testimonial/Testimonial";
import Ventajas from "./components/landing/Ventajas/Ventajas";
import AppFicha from "./components/landing/AppFicha/AppFicha";
import Oportunidades from "./components/landing/Oportunidades/Oportunidades";
import Form from "./components/landing/Form/Form";
import Footer from "./components/landing/Footer/Footer";
function App() {
  return (
    
    <Flex
      direction="column"
    >
      <LandingNavbar />
      <Hero />
      <Carrusel />
      <Testimonial />
      <Ventajas />
      <AppFicha />
      <Oportunidades />
      <Form />
      <Footer />
    </Flex>
  );
}

export default App;