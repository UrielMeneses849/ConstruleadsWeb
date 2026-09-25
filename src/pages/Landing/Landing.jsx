import { useEffect, useState } from 'react';
import { Box, Button, Flex, Grid, Heading, Image, Input, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react';
import { FiAlertCircle, FiArrowRight, FiBarChart2, FiBriefcase, FiCheckCircle, FiFileText, FiHome, FiInstagram, FiLinkedin, FiMail, FiMapPin, FiMenu, FiPhone, FiTool, FiUsers, FiX } from 'react-icons/fi';
import Carrusel from '../../components/landing/Carrusel/Carrusel';
import LoginModal from '../../components/Login/LoginModal';
import { enviarContacto } from '../../api/contacto';
import './landing-redesign.css';

const base = import.meta.env.BASE_URL;
const testimonials = [
  ['Bimsa Reports es una herramienta clave en nuestra estrategia comercial. Nos permite identificar oportunidades y llegar a nuestros clientes en el momento correcto.', 'logos/cemex.svg', 'CEMEX', 'Equipo Comercial'],
  ['La información de Bimsa nos ha ayudado a enfocar mejor nuestros esfuerzos y a generar más negocio.', 'logos/pg.svg', 'P&G', 'Director Comercial'],
  ['La calidad y el detalle de la información marcan una gran diferencia en nuestro día a día.', 'logos/holcim.png', 'Holcim', 'Gerente de Ventas'],
];
const solutions = [
  [FiBriefcase, 'Proyectos', 'Conoce qué se está construyendo.', ['Tipo de obra', 'Ubicación', 'Etapa de la obra', 'Fechas estimadas de inicio y término', 'Inversión estimada']],
  [FiUsers, 'Compañías', 'Conoce a las empresas detrás de cada proyecto.', ['Información general de la compañía', 'Tamaño y nivel de actividad', 'Tipos de proyectos en los que participa', 'Zonas donde tiene actividad constructiva', 'Contactos y datos de la empresa']],
  [FiFileText, 'Licitaciones y fallos', 'Encuentra oportunidades de contratación relevantes para tu negocio.', ['Licitaciones y contrataciones del sector construcción', 'Filtros por sector, tipo de obra y ubicación', 'Alertas según tus intereses', 'Encuentra oportunidades relevantes en menos tiempo', 'Sigue las oportunidades desde la convocatoria hasta el fallo']],
];
const sectors = [[FiHome, 'Vivienda', 'Proyectos de vivienda de interés social, nivel medio y residencial de lujo.'], [FiBriefcase, 'Edificación', 'Proyectos comerciales, educativos, institucionales, de salud y turísticos.'], [FiBarChart2, 'Industrial', 'Proyectos de logística, manufactura, energía e hidrocarburos.'], [FiTool, 'Infraestructura', 'Obras de transporte, infraestructura vial, hidráulica y redes.']];
const research = ['Demanda y pronósticos', 'Participación de mercado', 'Monitoreo de precios', 'Sistemas constructivos', 'Investigación con profesionales del sector'];
const researchCopy = ['Cuantificación del mercado por producto y región, con base en proyectos a futuro.', 'Análisis de marcas y competidores en el mercado.', 'Seguimiento de precios por producto, región y año.', 'Análisis de la ejecución de obra en condiciones reales y materiales utilizados.', 'Información directa con tomadores de decisión para generar insights estratégicos.'];
const matrixDots = Array.from({ length: 42 }, (_, index) => [(index % 6) * 18 + 4, Math.floor(index / 6) * 15 + 5]);
const mapDots = [[47, 24], [51, 30], [42, 38], [54, 43], [46, 50], [57, 57], [49, 63], [60, 67], [39, 57], [65, 48], [70, 73], [34, 45]];

function OrangeButton({ children, ...props }) { return <Button className="landing-orange-button" rightIcon={<FiArrowRight />} {...props}>{children}</Button>; }
function SectionTitle({ children, center = true, eyebrow }) { return <Box textAlign={center ? 'center' : 'left'} className="landing-section-heading">{eyebrow && <Text className="landing-eyebrow">{eyebrow}</Text>}<Heading>{children}</Heading></Box>; }
function OrbitDots({ side }) { return <Box className={`landing-orbit-dots landing-orbit-${side}`} aria-hidden="true">{matrixDots.map(([x, y], index) => <Box as="span" key={`${side}-${index}`} style={{ '--x': `${x}%`, '--y': `${y}%`, '--delay': `${(index % 8) * -0.46}s`, '--duration': `${4.6 + (index % 5) * 0.65}s` }} />)}</Box>; }

export default function Landing() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const scrollToContact = () => { document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' }); setIsMenuOpen(false); };
  const handleContactSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    const formData = new FormData(event.currentTarget);
    try {
      await enviarContacto({
        nombre: String(formData.get('nombre') || ''),
        empresa: String(formData.get('empresa') || ''),
        correo: String(formData.get('correo') || ''),
        telefono: String(formData.get('telefono') || ''),
        interes: String(formData.get('interes') || ''),
        comentarios: String(formData.get('comentarios') || ''),
      });
      setSubmitted(true);
    } catch (error) {
      console.error('No fue posible enviar el formulario de contacto.', error);
      setSubmitError('No pudimos enviar tu solicitud en este momento. Conservamos tus datos para que puedas intentarlo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-landing-reveal]');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return <Box className="landing-v2" overflow="hidden">
    <Box as="header" className="landing-nav"><Flex className="landing-nav-inner" align="center" justify="space-between">
      <Image className="landing-brand-logo" src={`${base}logo-construleads.svg`} alt="Bimsa Construleads" />
      <Box display={{ base: 'none', md: 'block' }} flex="1" />
      <Flex gap={3} align="center"><OrangeButton display={{ base: 'none', sm: 'inline-flex' }} onClick={() => setIsLoginOpen(true)}>Iniciar sesión</OrangeButton><Button display={{ base: 'inline-flex', md: 'none' }} variant="plain" p={1} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Abrir menú">{isMenuOpen ? <FiX /> : <FiMenu />}</Button></Flex>
    </Flex>{isMenuOpen && <Stack className="landing-mobile-menu" align="stretch"><Button variant="plain" onClick={scrollToContact}>Beneficios</Button><Button variant="plain" onClick={scrollToContact}>Soluciones</Button><OrangeButton onClick={() => setIsLoginOpen(true)}>Iniciar sesión</OrangeButton></Stack>}</Box>

    <Box as="main">
      <Box className="landing-hero"><OrbitDots side="left" /><OrbitDots side="right" /><Box className="landing-container landing-hero-content" textAlign="center" position="relative" zIndex={1}>
        <Heading className="landing-hero-title"><Text as="span" color="#ef4d22">INFORMACIÓN ESTRATÉGICA</Text><br />PARA HACER CRECER<br />TU NEGOCIO</Heading>
        <Text className="landing-hero-copy">Descubre dónde se está construyendo, quién está detrás de cada proyecto<br className="desktop-only" /> e identifica nuevas oportunidades en la industria de la construcción.</Text><OrangeButton onClick={scrollToContact}>Solicita información</OrangeButton><Text className="landing-trust-label">EMPRESAS LÍDERES YA CONFÍAN EN NOSOTROS</Text>
      </Box><Carrusel /></Box>

      <Box id="testimonios" className="landing-section landing-testimonials" data-landing-reveal><SectionTitle>LÍDERES DE LA INDUSTRIA<br /><Text as="span" color="#ef4d22">ya trabajan con Bimsa Reports.</Text></SectionTitle><Grid className="landing-testimonial-grid">{testimonials.map(([quote, logo, logoAlt, role]) => <Box className="landing-testimonial-card" key={logo}><Text className="landing-quote-mark">“</Text><Text className="landing-testimonial-copy">{quote}</Text><Box mt="auto"><Box className="landing-customer-logo-wrap"><Image className={`landing-customer-logo-image logo-${logoAlt.toLowerCase().replace(/[^a-z]/g, '')}`} src={`${base}${logo}`} alt={logoAlt} /></Box><Text className="landing-customer-role">{role}</Text></Box></Box>)}</Grid></Box>

      <Box className="landing-section landing-advantage" data-landing-reveal><Grid className="landing-advantage-grid" alignItems="center"><Box><SectionTitle center={false}>Tu ventaja competitiva<br /><Text as="span" color="#ef4d22">es nuestra información.</Text></SectionTitle><Text className="landing-body-copy">Construleads reúne información actualizada y estructurada sobre nuevos proyectos de construcción en México para ayudarte a entender el mercado, identificar oportunidades y tomar mejores decisiones comerciales.</Text><OrangeButton onClick={scrollToContact}>Solicita información</OrangeButton></Box><Box className="landing-map-scene"><Image src={`${base}mexico-project-map.png`} alt="Mapa de México con proyectos de construcción" />{mapDots.map(([left, top], index) => <Box key={index} className="landing-map-live-dot" style={{ left: `${left}%`, top: `${top}%`, '--delay': `${index * -.38}s` }} />)}<Box className="landing-location-card location-one"><FiMapPin /> Desarrollo residencial<br /><Text>Monterrey, NL.</Text></Box><Box className="landing-location-card location-two"><FiMapPin /> Parque industrial<br /><Text>Querétaro, Qro.</Text></Box><Box className="landing-location-card location-three"><FiMapPin /> Obra de infraestructura<br /><Text>Mérida, Yuc.</Text></Box></Box></Grid></Box>

      <Box className="landing-section landing-solutions" data-landing-reveal><OrbitDots side="left" /><OrbitDots side="right" /><Box className="landing-container" position="relative" zIndex={1}><SectionTitle>Proyectos, compañías y licitaciones,<br /><Text as="span" color="#ef4d22">en un solo lugar.</Text></SectionTitle><Text className="landing-section-copy">Bimsa Reports te da acceso a la información más completa y actualizada de la industria de la construcción en México, para que identifiques oportunidades, conozcas a los actores clave y hagas crecer tu negocio.</Text><SimpleGrid columns={{ base: 1, lg: 3 }} gap={5} mt={9}>{solutions.map(([Icon, title, intro, bullets]) => <Box className="landing-solution-card" key={title}><Flex align="center" gap={3}><Icon className="landing-card-icon" /><Box><Heading>{title}</Heading><Text>{intro}</Text></Box></Flex><Stack mt={5} gap={3}>{bullets.map((bullet) => <Flex key={bullet} gap={2} align="flex-start"><FiCheckCircle className="landing-check" /><Text>{bullet}</Text></Flex>)}</Stack></Box>)}</SimpleGrid></Box></Box>

      <Box className="landing-section landing-sectors" data-landing-reveal><SectionTitle>Más de <Text as="span" color="#ef4d22">15,000</Text><br />oportunidades reales detectadas<br />en el último año.</SectionTitle><Text className="landing-section-copy">Construleads te da acceso a proyectos en todo el país, en los principales segmentos<br className="desktop-only" /> de la industria de la construcción.</Text><SimpleGrid className="landing-sector-grid" columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>{sectors.map(([Icon, title, text]) => <Box className="landing-sector-card" key={title}><Icon /><Heading>{title}</Heading><Text>{text}</Text></Box>)}</SimpleGrid></Box>

      <Box id="contacto" className="landing-research" data-landing-reveal><Grid className="landing-research-grid" alignItems="start"><Box><Text className="landing-eyebrow">BIMSA RESEARCH</Text><SectionTitle center={false}>Inteligencia de mercado<br />para tomar <Text as="span" color="#ef4d22">mejores decisiones.</Text></SectionTitle><Text className="landing-body-copy">Estudios especializados para la industria de la construcción, basados en información propia de proyectos, análisis de mercado e investigación directa con profesionales del sector.</Text><Stack className="landing-research-list">{research.map((item, index) => <Flex key={item} gap={5}><Text>{index + 1}</Text><Box><Heading>{item}</Heading><Text>{researchCopy[index]}</Text></Box></Flex>)}</Stack></Box><Box className="landing-form-card"><Text className="landing-eyebrow">HABLEMOS</Text><Heading>Cuéntanos qué necesitas</Heading><Text>Uno de nuestros expertos te contactará para entender tus necesidades y compartirte más información.</Text>{submitted ? <Box className="landing-form-success" role="status"><FiCheckCircle /><Box><Heading>¡Solicitud enviada exitosamente!</Heading><Text>Gracias por contactarnos. Uno de nuestros expertos se pondrá en contacto contigo muy pronto.</Text></Box></Box> : <Box as="form" onSubmit={handleContactSubmit}><SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}><Input name="nombre" required placeholder="Nombre *" /><Input name="empresa" required placeholder="Empresa *" /></SimpleGrid><Input name="correo" required type="email" placeholder="Correo electrónico *" /><Input name="telefono" required type="tel" placeholder="Teléfono *" /><Box as="select" name="interes" className="landing-native-select" required defaultValue=""><option value="" disabled>¿En qué estás interesado? *</option><option>Proyectos</option><option>Compañías</option><option>Licitaciones</option><option>Bimsa Research</option></Box><Textarea name="comentarios" placeholder="Cuéntanos más sobre tus necesidades..." rows={4} />{submitError && <Flex className="landing-form-error" role="alert"><FiAlertCircle /><Text>{submitError}</Text></Flex>}<OrangeButton type="submit" w="100%" disabled={isSubmitting}>{isSubmitting ? 'Enviando solicitud…' : 'Enviar solicitud'}</OrangeButton></Box>}<Text className="landing-form-legal">Al enviar este formulario aceptas que Bimsa Reports se ponga en contacto contigo.</Text></Box></Grid></Box>
    </Box>
    <Box as="footer" id="pie-de-pagina" className="landing-footer">
      <Grid className="landing-footer-grid">
        <Box>
          <Image src={`${base}bimsa-logo.png`} alt="Bimsa Reports" maxW="190px" />
          <Text>Información estratégica<br />para hacer crecer tu negocio.</Text>
          <Flex className="landing-social-links" gap={3} mt={5}>
            <Box
              as="a"
              href="https://www.linkedin.com/company/bimsa-reports/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visitar LinkedIn de Bimsa Reports"
            >
              <FiLinkedin />
            </Box>
            <Box
              as="a"
              href="https://www.instagram.com/bimsareportsmx/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visitar Instagram de Bimsa Reports"
            >
              <FiInstagram />
            </Box>
            <Box as="a" href="mailto:correo@bimsa.com.mx" aria-label="Enviar correo a Bimsa Reports">
              <FiMail />
            </Box>
          </Flex>
        </Box>
        <Box>
          <Heading>CONTACTO</Heading>
          <Text><FiPhone /> Tel. 55 5627908412</Text>
          <Text><FiMail /> correo@bimsa.com.mx</Text>
          <Text>bimsareports.com</Text>
        </Box>
        <Box>
          <Heading>LEGAL</Heading>
          <Text>Términos y condiciones</Text>
          <Text>Aviso de privacidad</Text>
        </Box>
      </Grid>
      <Text className="landing-copyright">© 2026 Bimsa Reports. Todos los derechos reservados.</Text>
    </Box>
    <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
  </Box>;
}
