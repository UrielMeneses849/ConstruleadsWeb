import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Box, Button, Flex, Heading, HStack, Input, SimpleGrid, Stack, Text,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiCheck, FiChevronRight, FiDownload, FiEdit2, FiFileText,
  FiMapPin, FiPlus, FiSearch, FiSettings, FiShield, FiUser, FiUsers, FiX,
} from 'react-icons/fi';
import { iniciarDescargaReporte } from '../../api/reportes';

const ACCENT = '#FF653F';
const NAVY = '#252525';
const PROFILE_GROUPS = {
  zonas: ['Centro', 'Noreste', 'Noroeste', 'Occidente', 'Sureste'],
  tiposObra: ['Vivienda', 'Edificación', 'Infraestructura', 'Industrial'],
  sectores: ['Privado', 'Gobierno'],
  etapas: ['Pre-plan', 'Proyecto', 'Plan', 'Construcción'],
  desarrollos: ['Ampliación', 'Demolición', 'Adecuación', 'Remodelación'],
};
const GROUP_LABELS = {
  zonas: 'Zonas',
  tiposObra: 'Tipos de obra',
  sectores: 'Sectores',
  etapas: 'Etapas',
  desarrollos: 'Desarrollos',
};
const DEFAULT_USERS = [
  {
    id: 1, name: 'María Fernanda López', email: 'maria.lopez@cemix.com',
    company: 'CEMIX', role: 'Consultor', status: 'Activo', lastAccess: 'Hoy, 09:15',
    access: { zonas: ['Centro'], tiposObra: ['Industrial'], sectores: ['Privado'], etapas: ['Proyecto'], desarrollos: ['Ampliación'] },
  },
  {
    id: 2, name: 'Jorge Ramírez Ponce', email: 'jorge.ramirez@posadas.com',
    company: 'POSADAS', role: 'Consultor', status: 'Activo', lastAccess: 'Ayer, 16:40',
    access: { zonas: ['Centro', 'Sureste'], tiposObra: ['Edificación'], sectores: ['Privado'], etapas: ['Proyecto', 'Construcción'], desarrollos: ['Remodelación'] },
  },
  {
    id: 3, name: 'Carolina Molina Ruíz', email: 'carolina@holcim.com',
    company: 'HOLCIM', role: 'Consultor', status: 'Suspendido', lastAccess: '05 jun, 09:15',
    access: { zonas: [], tiposObra: [], sectores: [], etapas: [], desarrollos: [] },
  },
];
const SAMPLE_DOWNLOADS = [
  { id: 1, date: '08 jun 2026 · 10:45', type: 'Excel', name: 'Reporte de obras — Centro', size: '12.4 MB', url: '' },
  { id: 2, date: '06 jun 2026 · 16:12', type: 'PDF', name: 'Ficha de proyecto — CL-24891', size: '2.8 MB', url: '' },
  { id: 3, date: '28 may 2026 · 09:30', type: 'Excel', name: 'Prospección industrial — Mayo', size: '8.1 MB', url: '' },
];

const emptyAccess = () => Object.fromEntries(Object.keys(PROFILE_GROUPS).map((key) => [key, []]));
const emptyForm = () => ({
  name: '', email: '', phone: '', company: '', role: 'Consultor', status: 'Activo', access: emptyAccess(),
});
const initials = (name = '') => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'US';

function accessToXml(access = {}) {
  const escapeXml = (value) => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const nodes = Object.entries(access)
    .filter(([, values]) => Array.isArray(values) && values.length)
    .map(([group, values]) => (
      `<${group}>${values.map((value) => `<valor>${escapeXml(value)}</valor>`).join('')}</${group}>`
    ));
  return `<perfil>${nodes.join('')}</perfil>`;
}

function loadLocal(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function Modal({ children, onClose, wide = false }) {
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onClose]);
  return (
    <Flex position="fixed" inset="0" bg="rgba(20,20,20,.58)" backdropFilter="blur(5px)"
      zIndex="100" align="center" justify="center" p={{ base: 3, md: 6 }} onMouseDown={onClose}>
      <Box role="dialog" aria-modal="true" bg="white" color={NAVY} w="100%" maxW={wide ? '1120px' : '680px'}
        maxH="92vh" overflowY="auto" borderRadius="24px" boxShadow="0 30px 80px rgba(20,20,20,.24)"
        onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </Box>
    </Flex>
  );
}

function AccessEditor({ access, onChange }) {
  const toggle = (group, value) => {
    const values = access[group] || [];
    onChange({ ...access, [group]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] });
  };
  return (
    <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} gap={5}>
      {Object.entries(PROFILE_GROUPS).map(([group, options]) => (
        <Box key={group}>
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="700">{GROUP_LABELS[group]}</Text>
            <Text fontSize="11px" color="#888888">{(access[group] || []).length}/{options.length}</Text>
          </Flex>
          <Stack gap={2}>
            {options.map((option) => {
              const active = (access[group] || []).includes(option);
              return (
                <Flex key={option} as="button" type="button" onClick={() => toggle(group, option)}
                  align="center" gap={2.5} p={2.5} borderRadius="10px"
                  bg={active ? '#FFF0EA' : '#F7F7F7'} color={active ? ACCENT : NAVY}
                  border={`1px solid ${active ? '#FFD0BF' : '#EDEDED'}`} textAlign="left">
                  <Flex w="19px" h="19px" borderRadius="5px" border={`1.5px solid ${active ? ACCENT : '#AAAAAA'}`}
                    bg={active ? ACCENT : 'white'} color="white" align="center" justify="center" flexShrink="0">
                    {active && <FiCheck size={13} />}
                  </Flex>
                  <Text fontSize="13px" fontWeight={active ? '600' : '500'}>{option}</Text>
                </Flex>
              );
            })}
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  );
}

function UserModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ? { ...initial, access: initial.access || emptyAccess() } : emptyForm());
  const [step, setStep] = useState(1);
  const field = (label, key, placeholder, type = 'text') => (
    <Box>
      <Text fontSize="12px" fontWeight="700" mb={2}>{label}</Text>
      <Input value={form[key]} type={type} placeholder={placeholder} onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        h="48px" borderColor="#DDDDDD" borderRadius="11px" _focus={{ borderColor: ACCENT, boxShadow: '0 0 0 1px #FF653F' }} />
    </Box>
  );
  const canContinue = form.name.trim() && form.email.trim() && form.company.trim();
  return (
    <Modal onClose={onClose} wide={step === 2}>
      <Flex p={{ base: 5, md: 7 }} borderBottom="1px solid #EDEDED" align="start" justify="space-between">
        <Box>
          <Text color={ACCENT} fontWeight="700" fontSize="12px" textTransform="uppercase" letterSpacing=".12em">
            Paso {step} de 2
          </Text>
          <Heading fontSize={{ base: '22px', md: '27px' }} mt={1}>
            {step === 1 ? (initial ? 'Editar usuario' : 'Nuevo usuario') : 'Configurar visibilidad'}
          </Heading>
          <Text color="#777777" mt={1} fontSize="13px">
            {step === 1 ? 'Datos de acceso y perfil de la cuenta.' : 'Solo la información marcada se incluirá en la respuesta XML de este usuario.'}
          </Text>
        </Box>
        <Button aria-label="Cerrar" variant="ghost" onClick={onClose} color={NAVY}><FiX size={23} /></Button>
      </Flex>
      <Box p={{ base: 5, md: 7 }}>
        {step === 1 ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            {field('Nombre completo *', 'name', 'Nombre y apellidos')}
            {field('Correo electrónico *', 'email', 'nombre@empresa.com', 'email')}
            {field('Empresa *', 'company', 'Nombre de la empresa')}
            {field('Teléfono', 'phone', '+52 55 0000 0000', 'tel')}
            <Box>
              <Text fontSize="12px" fontWeight="700" mb={2}>Rol</Text>
              <Box as="select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}
                w="100%" h="48px" border="1px solid #DDDDDD" borderRadius="11px" px={3} bg="white">
                <option>Consultor</option><option>Administrador</option><option>Solo lectura</option>
              </Box>
            </Box>
            <Box>
              <Text fontSize="12px" fontWeight="700" mb={2}>Estatus</Text>
              <Box as="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}
                w="100%" h="48px" border="1px solid #DDDDDD" borderRadius="11px" px={3} bg="white">
                <option>Activo</option><option>Suspendido</option>
              </Box>
            </Box>
          </SimpleGrid>
        ) : <AccessEditor access={form.access} onChange={(access) => setForm({ ...form, access })} />}
      </Box>
      <Flex px={{ base: 5, md: 7 }} pb={{ base: 5, md: 7 }} gap={3} justify="flex-end">
        <Button variant="outline" borderColor="#DDDDDD" color={NAVY} onClick={step === 1 ? onClose : () => setStep(1)}>
          {step === 1 ? 'Cancelar' : 'Volver'}
        </Button>
        <Button bg={ACCENT} color="white" _hover={{ bg: '#E95734' }} disabled={!canContinue}
          onClick={() => step === 1 ? setStep(2) : onSave(form)}>
          {step === 1 ? 'Continuar' : 'Guardar usuario'} <Box ml={2}><FiChevronRight /></Box>
        </Button>
      </Flex>
    </Modal>
  );
}

function ProfileSummary({ access }) {
  return (
    <Flex gap={1.5} wrap="wrap">
      {Object.entries(access || {}).flatMap(([group, values]) =>
        values.slice(0, 1).map((value) => (
          <Text key={`${group}-${value}`} fontSize="10px" px={2} py={1} bg="#F2F2F2" color="#666666" borderRadius="full">
            {value}
          </Text>
        )))}
    </Flex>
  );
}

export default function Perfil() {
  const navigate = useNavigate();
  const authenticated = localStorage.getItem('cl_authenticated') === 'true';
  const sessionUser = useMemo(() => loadLocal('construleadsUser', {}), []);
  const isAdmin = true;
  const [active, setActive] = useState('cuenta');
  const [users, setUsers] = useState(() => loadLocal('cl_admin_users', DEFAULT_USERS));
  const [downloads] = useState(() => loadLocal('cl_download_history', SAMPLE_DOWNLOADS));
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(undefined);

  useEffect(() => { document.title = 'Mi cuenta | Construleads'; }, []);
  useEffect(() => { localStorage.setItem('cl_admin_users', JSON.stringify(users)); }, [users]);
  if (!authenticated) return <Navigate to="/" replace />;

  const name = sessionUser.nombreUsuario || 'Adriana Osorio';
  const filteredUsers = users.filter((item) =>
    `${item.name} ${item.email} ${item.company}`.toLowerCase().includes(query.toLowerCase()));
  const tabs = [
    { id: 'cuenta', label: 'Mi perfil', icon: FiUser },
    { id: 'usuarios', label: 'Usuarios y permisos', icon: FiUsers },
    { id: 'descargas', label: 'Historial de descargas', icon: FiDownload },
  ];
  const saveUser = (form) => {
    const serializedForm = { ...form, accessXml: accessToXml(form.access) };
    if (editing?.id) setUsers((current) => current.map((item) => item.id === editing.id ? { ...item, ...serializedForm } : item));
    else setUsers((current) => [{ ...serializedForm, id: Date.now(), lastAccess: 'Invitación pendiente' }, ...current]);
    setEditing(undefined);
  };

  return (
    <Box minH="100vh" bg="#F5F5F5" color={NAVY} p={{ base: 0, md: 4 }}>
      <Box maxW="1480px" mx="auto">
        <Flex bg="white" border="1px solid #E8E8E8" borderRadius={{ base: 0, md: '18px' }} px={{ base: 4, md: 6 }}
          h="72px" align="center" justify="space-between" boxShadow="0 8px 28px rgba(20,20,20,.05)">
          <HStack gap={4}>
            <Button size="sm" variant="ghost" onClick={() => navigate('/construleads')} color={NAVY}><FiArrowLeft /> Volver</Button>
            <Box h="28px" w="1px" bg="#E6E6E6" display={{ base: 'none', md: 'block' }} />
            <Text fontWeight="700">Construleads <Box as="span" color={ACCENT}>BIMSA</Box></Text>
          </HStack>
          <HStack gap={3}>
            <Box textAlign="right" display={{ base: 'none', sm: 'block' }}>
              <Text fontSize="12px" fontWeight="700">{name}</Text>
              <Text fontSize="10px" color="#888888">{isAdmin ? 'Administrador' : 'Cliente'}</Text>
            </Box>
            <Flex w="38px" h="38px" bg={NAVY} color="white" borderRadius="12px" align="center" justify="center" fontWeight="700">{initials(name)}</Flex>
          </HStack>
        </Flex>

        <Flex mt={{ base: 0, md: 5 }} gap={5} align="stretch" direction={{ base: 'column', lg: 'row' }}>
          <Box bg="white" color={NAVY} border="1px solid #E8E8E8" w={{ base: '100%', lg: '245px' }}
            borderRadius={{ base: 0, md: '16px' }} p={4} flexShrink="0">
            <Text color="#999999" fontSize="10px" fontWeight="700" letterSpacing=".16em">ADMINISTRACIÓN</Text>
            <Heading fontSize="23px" mt={2}>Hola, {name.split(' ')[0]}</Heading>
            <Text fontSize="12px" color="#777777" mt={1}>Gestiona tu cuenta y accesos.</Text>
            <Stack mt={7} gap={2}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Flex key={tab.id} as="button" onClick={() => setActive(tab.id)} align="center" gap={3} p={3}
                    borderRadius="9px" bg={active === tab.id ? '#FFF0EA' : 'transparent'}
                    color={active === tab.id ? ACCENT : '#555555'}
                    borderLeft={`2px solid ${active === tab.id ? ACCENT : 'transparent'}`}
                    _hover={{ bg: '#F7F7F7' }} textAlign="left">
                    <Icon /><Text fontSize="12px" fontWeight="600">{tab.label}</Text>
                  </Flex>
                );
              })}
            </Stack>
            <Box mt={8} p={4} border="1px solid #EAEAEA" bg="#FAFAFA" borderRadius="11px">
              <FiShield color={ACCENT} />
              <Text fontSize="11px" fontWeight="700" mt={2}>Control de datos</Text>
              <Text color="#999999" fontSize="10px" mt={1}>Los permisos definen qué campos recibe cada usuario.</Text>
            </Box>
          </Box>

          <Box bg="white" border="1px solid #E8E8E8" borderRadius={{ base: 0, md: '18px' }} p={{ base: 5, md: 7 }} minH="680px" flex="1">
            {active === 'usuarios' && (
              <>
                <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
                  <Box>
                    <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">ADMINISTRACIÓN</Text>
                    <Heading fontSize={{ base: '24px', md: '30px' }} mt={1}>Usuarios y accesos</Heading>
                    <Text color="#777777" fontSize="13px" mt={1}>Crea cuentas y controla la información visible para cada una.</Text>
                  </Box>
                  <Button bg={ACCENT} color="white" _hover={{ bg: '#E95734' }} onClick={() => setEditing(null)}><FiPlus /> Nuevo usuario</Button>
                </Flex>
                <Flex mt={7} bg="#F7F7F7" border="1px solid #E7E7E7" borderRadius="12px" align="center" px={4} maxW="440px">
                  <FiSearch color="#999999" /><Input value={query} onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por usuario, correo o empresa" border="0" _focus={{ boxShadow: 'none' }} fontSize="12px" />
                </Flex>
                <Stack mt={5} gap={2}>
                  {filteredUsers.map((item) => (
                    <Box key={item.id} p={3} border="1px solid #EDEDED" borderRadius="13px"
                      display="grid"
                      gridTemplateColumns={{ base: '1fr', lg: 'minmax(280px, .85fr) 120px minmax(280px, 1.2fr) 86px 36px' }}
                      columnGap={{ base: 3, lg: 4 }} rowGap={3} alignItems="center"
                      _hover={{ borderColor: '#FFC9B8', boxShadow: '0 6px 18px rgba(20,20,20,.04)' }}>
                      <Flex align="center" gap={3} minW="0">
                        <Flex w="42px" h="42px" bg="#F0F0F0" borderRadius="11px" align="center"
                          justify="center" fontWeight="700" flexShrink="0">{initials(item.name)}</Flex>
                        <Box minW="0">
                          <Text fontSize="13px" fontWeight="700" truncate>{item.name}</Text>
                          <Text fontSize="11px" color="#888888" truncate>{item.email}</Text>
                        </Box>
                      </Flex>
                      <Box pl={{ base: '54px', lg: 0 }}>
                        <Text fontSize="9px" color="#999999" fontWeight="600" letterSpacing=".06em">EMPRESA</Text>
                        <Text fontSize="12px" fontWeight="700" truncate>{item.company}</Text>
                      </Box>
                      <Box pl={{ base: '54px', lg: 0 }} minW="0"><ProfileSummary access={item.access} /></Box>
                      <Text fontSize="10px" px={2.5} py={1} borderRadius="full" color={item.status === 'Activo' ? '#15803D' : '#B91C1C'}
                        bg={item.status === 'Activo' ? '#EAF8EF' : '#FDECEC'} justifySelf={{ base: 'start', lg: 'center' }}
                        ml={{ base: '54px', lg: 0 }}>{item.status}</Text>
                      <Button size="sm" variant="ghost" justifySelf={{ base: 'end', lg: 'center' }}
                        aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}><FiSettings /></Button>
                    </Box>
                  ))}
                </Stack>
                <Text fontSize="11px" color="#8A8A8A" mt={4}>{filteredUsers.length} usuarios mostrados</Text>
              </>
            )}

            {active === 'cuenta' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">INFORMACIÓN PERSONAL</Text>
                <Heading fontSize="30px" mt={1}>Mi perfil</Heading>
                <Text color="#777777" fontSize="13px" mt={1}>Información asociada a tu cuenta Construleads.</Text>
                <Flex mt={7} p={6} bg="#F8F8F8" borderRadius="18px" align="center" gap={5}>
                  <Flex w="76px" h="76px" bg={NAVY} color="white" borderRadius="20px" align="center" justify="center" fontSize="22px" fontWeight="700">{initials(name)}</Flex>
                  <Box><Heading fontSize="20px">{name}</Heading><Text color="#777777" fontSize="12px">{isAdmin ? 'Administrador BIMSA' : 'Cliente Construleads'}</Text></Box>
                  <Button ml="auto" variant="outline" borderColor="#FFB49D" color={ACCENT} display={{ base: 'none', md: 'flex' }}><FiEdit2 /> Editar</Button>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mt={5}>
                  {[
                    ['Correo electrónico', sessionUser.email || sessionUser.correo || 'usuario@empresa.com'],
                    ['Identificador', sessionUser.idUsuario || 'N/D'],
                    ['Tipo de acceso', isAdmin ? 'Administrador' : 'Consultor'],
                    ['Estado de cuenta', 'Activo'],
                  ].map(([label, value]) => (
                    <Box key={label} border="1px solid #E8E8E8" borderRadius="13px" p={4}>
                      <Text color="#8A8A8A" fontSize="10px" fontWeight="700">{label.toUpperCase()}</Text>
                      <Text fontWeight="600" fontSize="13px" mt={1}>{value}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </>
            )}

            {active === 'descargas' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">ACTIVIDAD</Text>
                <Heading fontSize="30px" mt={1}>Historial de descargas</Heading>
                <Text color="#777777" fontSize="13px" mt={1}>Consulta y vuelve a abrir los reportes generados en esta cuenta.</Text>
                <Stack mt={7} gap={2}>
                  {downloads.length ? downloads.map((item) => (
                    <Flex key={item.id} p={4} border="1px solid #EDEDED" borderRadius="14px" align="center" gap={4}>
                      <Flex w="42px" h="42px" bg={item.type === 'PDF' ? '#FFF0EA' : '#EAF8EF'} color={item.type === 'PDF' ? ACCENT : '#15803D'}
                        borderRadius="12px" align="center" justify="center"><FiFileText /></Flex>
                      <Box flex="1"><Text fontSize="13px" fontWeight="700">{item.name}</Text><Text fontSize="11px" color="#888888">{item.date}</Text></Box>
                      <Text fontSize="11px" color="#777777" display={{ base: 'none', md: 'block' }}>{item.size}</Text>
                      <Text fontSize="10px" px={2.5} py={1} bg="#F3F3F3" borderRadius="full">{item.type}</Text>
                      <Button
                        size="sm"
                        variant="ghost"
                        color={ACCENT}
                        disabled={!item.url}
                        aria-label="Descargar de nuevo"
                        onClick={() => {
                          if (item.url) {
                            void iniciarDescargaReporte(item.url, `reporte-${item.id}`);
                          }
                        }}
                      >
                        <FiDownload />
                      </Button>
                    </Flex>
                  )) : <Text color="#888888">Todavía no hay descargas registradas.</Text>}
                </Stack>
                <Flex mt={5} p={4} bg="#F7F7F7" borderRadius="12px" gap={3} align="center">
                  <FiMapPin color={ACCENT} /><Text fontSize="11px" color="#777777">El historial se guarda durante 12 meses y se actualiza al generar un reporte.</Text>
                </Flex>
              </>
            )}
          </Box>
        </Flex>
      </Box>
      {editing !== undefined && <UserModal initial={editing} onClose={() => setEditing(undefined)} onSave={saveUser} />}
    </Box>
  );
}
