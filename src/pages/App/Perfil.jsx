import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Box, Button, Flex, Heading, HStack, Input, SimpleGrid, Spinner, Stack, Text,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiCheck, FiChevronRight, FiDownload, FiEdit2, FiFileText,
  FiMapPin, FiPlus, FiSearch, FiSettings, FiShield, FiUser, FiUsers, FiX,
} from 'react-icons/fi';
import { iniciarDescargaReporte } from '../../api/reportes';
import { getDownloadHistory } from '../../utils/downloadHistory';
import {
  obtenerUsuariosAdministrador,
  validarUsuarioAdministrador,
} from '../../api/perfil';

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

export default function Perfil() {
  const navigate = useNavigate();
  const authenticated = localStorage.getItem('cl_authenticated') === 'true';
  const sessionUser = useMemo(() => loadLocal('construleadsUser', {}), []);
  const [isAdmin, setIsAdmin] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [active, setActive] = useState('cuenta');
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [downloads] = useState(getDownloadHistory);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => { document.title = 'Mi cuenta | Construleads'; }, []);
  useEffect(() => {
    const controller = new AbortController();

    async function loadAdminAccess() {
      try {
        const result = await validarUsuarioAdministrador({ signal: controller.signal });
        setIsAdmin(result.isAdmin);
        if (!result.isAdmin) setActive('cuenta');
      } catch (error) {
        if (error?.name === 'AbortError') return;
        setIsAdmin(false);
        setAdminError('No pudimos validar los permisos administrativos en este momento.');
        setActive('cuenta');
      }
    }

    void loadAdminAccess();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const controller = new AbortController();

    async function loadUsers() {
      try {
        setIsLoadingUsers(true);
        setUsersError('');
        setUsers(await obtenerUsuariosAdministrador({ signal: controller.signal }));
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setUsersError('No fue posible cargar los usuarios. Intenta nuevamente.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingUsers(false);
      }
    }

    void loadUsers();
    return () => controller.abort();
  }, [isAdmin]);
  if (!authenticated) return <Navigate to="/" replace />;

  const name = sessionUser.nombreUsuario || 'Adriana Osorio';
  const filteredUsers = users.filter((item) =>
    `${item.userId} ${item.name} ${item.email} ${item.phone} ${item.company}`
      .toLowerCase().includes(query.toLowerCase()));
  const tabs = [
    { id: 'cuenta', label: 'Mi perfil', icon: FiUser },
    ...(isAdmin ? [{ id: 'usuarios', label: 'Usuarios y permisos', icon: FiUsers }] : []),
    { id: 'descargas', label: 'Historial de descargas', icon: FiDownload },
  ];
  const goBack = () => {
    setIsLeaving(true);
    window.setTimeout(() => navigate('/construleads'), 220);
  };
  const saveUser = (form) => {
    const serializedForm = { ...form, accessXml: accessToXml(form.access) };
    if (editing?.id) setUsers((current) => current.map((item) => item.id === editing.id ? { ...item, ...serializedForm } : item));
    else setUsers((current) => [{ ...serializedForm, id: Date.now(), lastAccess: 'Invitación pendiente' }, ...current]);
    setEditing(undefined);
  };

  return (
    <Box h="100vh" bg="#F3F3F1" color={NAVY} p={{ base: 0, md: 4 }} overflow="hidden">
      <style>{`
        @keyframes cl-profile-enter {
          from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.992); }
          to { opacity: 1; transform: none; }
        }
        @keyframes cl-profile-leave {
          from { opacity: 1; transform: none; }
          to { opacity: 0; transform: translate3d(0, 10px, 0) scale(.994); }
        }
        @keyframes cl-profile-panel {
          from { opacity: 0; transform: translate3d(10px, 0, 0); }
          to { opacity: 1; transform: none; }
        }
        .cl-profile-shell { animation: cl-profile-enter 420ms cubic-bezier(.22, 1, .36, 1) both; }
        .cl-profile-shell.is-leaving { animation: cl-profile-leave 220ms ease both; }
        .cl-profile-panel { animation: cl-profile-panel 300ms cubic-bezier(.22, 1, .36, 1) both; }
        .cl-profile-scroll { scrollbar-width: thin; scrollbar-color: #D5D2CE transparent; }
        .cl-profile-scroll::-webkit-scrollbar { width: 7px; }
        .cl-profile-scroll::-webkit-scrollbar-track { background: transparent; }
        .cl-profile-scroll::-webkit-scrollbar-thumb { background: #D5D2CE; border-radius: 999px; }
        @media (prefers-reduced-motion: reduce) {
          .cl-profile-shell, .cl-profile-shell.is-leaving, .cl-profile-panel { animation: none; }
        }
      `}</style>
      <Flex className={`cl-profile-shell${isLeaving ? ' is-leaving' : ''}`} maxW="1520px" mx="auto"
        h="100%" minH="0" direction="column">
        <Flex bg="rgba(255,255,255,.92)" backdropFilter="blur(18px)" border="1px solid rgba(25,25,25,.08)"
          borderRadius={{ base: 0, md: '22px' }} px={{ base: 4, md: 6 }} h="76px" align="center"
          justify="space-between" boxShadow="0 14px 42px rgba(20,20,20,.06)" flexShrink="0">
          <HStack gap={4}>
            <Button size="sm" variant="ghost" onClick={goBack} color={NAVY} borderRadius="full"
              _hover={{ bg: '#F1F1EF', transform: 'translateX(-2px)' }} transition="all .2s ease">
              <FiArrowLeft /> Volver
            </Button>
            <Box h="28px" w="1px" bg="#E6E6E6" display={{ base: 'none', md: 'block' }} />
            <Text fontWeight="750" letterSpacing="-.02em">Construleads <Box as="span" color={ACCENT}>BIMSA</Box></Text>
          </HStack>
          <HStack gap={3}>
            <Box textAlign="right" display={{ base: 'none', sm: 'block' }}>
              <Text fontSize="12px" fontWeight="700">{name}</Text>
              <Text fontSize="10px" color="#888888">
                {isAdmin === null ? 'Validando acceso…' : isAdmin ? 'Administrador' : 'Cliente'}
              </Text>
            </Box>
            <Flex w="40px" h="40px" bg="#5E5E5B" color="white" borderRadius="13px" border="1px solid #4C4C49"
              align="center" justify="center" fontWeight="700" boxShadow="0 8px 18px rgba(20,20,20,.12)">{initials(name)}</Flex>
          </HStack>
        </Flex>

        <Flex mt={{ base: 0, md: 5 }} gap={5} align="stretch" direction={{ base: 'column', lg: 'row' }}
          flex="1" minH="0" overflow="hidden">
          <Box bg="rgba(255,255,255,.94)" color={NAVY} border="1px solid rgba(25,25,25,.08)" w={{ base: '100%', lg: '260px' }}
            borderRadius={{ base: 0, md: '20px' }} p={5} flexShrink="0" boxShadow="0 14px 38px rgba(20,20,20,.035)"
            h={{ base: 'auto', lg: '100%' }} overflow="hidden">
            <Text color={ACCENT} fontSize="10px" fontWeight="800" letterSpacing=".16em">MI CUENTA</Text>
            <Heading fontSize="24px" mt={2} letterSpacing="-.035em">Hola, {name.split(' ')[0]}</Heading>
            <Text fontSize="12px" color="#777777" mt={1}>Gestiona tu cuenta y accesos.</Text>
            <Stack mt={7} gap={2}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Flex key={tab.id} as="button" onClick={() => setActive(tab.id)} align="center" gap={3} p={3}
                    borderRadius="12px" bg={active === tab.id ? '#FFF0EA' : 'transparent'}
                    color={active === tab.id ? ACCENT : '#555555'}
                    border={`1px solid ${active === tab.id ? '#FFD8CB' : 'transparent'}`}
                    boxShadow={active === tab.id ? '0 8px 20px rgba(255,101,63,.08)' : 'none'}
                    _hover={{ bg: active === tab.id ? '#FFF0EA' : '#F7F7F5', transform: 'translateX(2px)' }}
                    transition="all .2s ease" textAlign="left">
                    <Icon /><Text fontSize="12px" fontWeight="600">{tab.label}</Text>
                  </Flex>
                );
              })}
            </Stack>
            {adminError && <Text mt={5} fontSize="10px" color="#A0442E">{adminError}</Text>}
            <Box mt={8} p={4} border="1px solid #EAE7E3" bg="linear-gradient(145deg, #FBFAF8, #F6F4F1)" borderRadius="14px">
              <FiShield color={ACCENT} />
              <Text fontSize="11px" fontWeight="700" mt={2}>Control de datos</Text>
              <Text color="#999999" fontSize="10px" mt={1}>Los permisos definen qué campos recibe cada usuario.</Text>
            </Box>
          </Box>

          <Box bg="rgba(255,255,255,.96)" border="1px solid rgba(25,25,25,.08)" borderRadius={{ base: 0, md: '20px' }}
            p={{ base: 5, md: 7 }} flex="1" minH="0" overflowY="auto" overscrollBehavior="contain"
            className="cl-profile-scroll" boxShadow="0 18px 46px rgba(20,20,20,.04)">
            <Box key={active} className="cl-profile-panel">
            {active === 'usuarios' && (
              <>
                <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
                  <Box>
                    <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">ADMINISTRACIÓN</Text>
                    <Heading fontSize={{ base: '24px', md: '30px' }} mt={1}>Usuarios y accesos</Heading>
                    <Text color="#777777" fontSize="13px" mt={1}>Consulta las cuentas asociadas a tu administración.</Text>
                  </Box>
                  <Button bg={ACCENT} color="white" _hover={{ bg: '#E95734' }} onClick={() => setEditing(null)}><FiPlus /> Nuevo usuario</Button>
                </Flex>
                <Flex mt={7} bg="#F7F7F7" border="1px solid #E7E7E7" borderRadius="12px" align="center" px={4} maxW="440px">
                  <FiSearch color="#999999" /><Input value={query} onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por ID, usuario, correo o empresa" border="0" _focus={{ boxShadow: 'none' }} fontSize="12px" />
                </Flex>
                <Stack mt={5} gap={2}>
                  {isLoadingUsers && (
                    <Flex minH="220px" align="center" justify="center" direction="column" gap={3} color="#777777">
                      <Spinner color={ACCENT} thickness="3px" />
                      <Text fontSize="12px">Consultando usuarios y permisos…</Text>
                    </Flex>
                  )}
                  {!isLoadingUsers && usersError && (
                    <Flex minH="180px" align="center" justify="center" direction="column" gap={2}
                      bg="#FFF7F4" border="1px solid #FFD8CB" borderRadius="16px" color="#8D3B27">
                      <FiUsers size={22} />
                      <Text fontSize="12px" fontWeight="700">{usersError}</Text>
                    </Flex>
                  )}
                  {!isLoadingUsers && !usersError && filteredUsers.map((item) => (
                    <Box key={item.id} p={4} border="1px solid #ECEAE7" borderRadius="15px" bg="#FFFFFF"
                      display="grid"
                      gridTemplateColumns={{ base: '1fr', xl: 'minmax(250px, 1.15fr) 90px minmax(150px, .7fr) minmax(140px, .7fr) 82px 36px' }}
                      columnGap={{ base: 3, lg: 4 }} rowGap={3} alignItems="center"
                      _hover={{ borderColor: '#FFC9B8', boxShadow: '0 10px 24px rgba(20,20,20,.055)', transform: 'translateY(-1px)' }}
                      transition="all .2s ease">
                      <Flex align="center" gap={3} minW="0">
                        <Flex w="44px" h="44px" bg="linear-gradient(145deg, #F3F2F0, #E9E7E4)" borderRadius="12px" align="center"
                          justify="center" fontWeight="700" flexShrink="0">{initials(item.name)}</Flex>
                        <Box minW="0">
                          <Text fontSize="13px" fontWeight="700" truncate>{item.name}</Text>
                          <Text fontSize="11px" color="#888888" truncate>{item.email}</Text>
                        </Box>
                      </Flex>
                      <Box pl={{ base: '56px', xl: 0 }}>
                        <Text fontSize="9px" color="#999999" fontWeight="700" letterSpacing=".06em">ID USUARIO</Text>
                        <Text fontSize="12px" fontWeight="700">{item.userId || '—'}</Text>
                      </Box>
                      <Box pl={{ base: '56px', xl: 0 }}>
                        <Text fontSize="9px" color="#999999" fontWeight="700" letterSpacing=".06em">EMPRESA</Text>
                        <Text fontSize="12px" fontWeight="700" truncate>{item.company}</Text>
                      </Box>
                      <Box pl={{ base: '56px', xl: 0 }}>
                        <Text fontSize="9px" color="#999999" fontWeight="700" letterSpacing=".06em">TELÉFONO</Text>
                        <Text fontSize="12px" fontWeight="600">{item.phone || 'Sin teléfono'}</Text>
                      </Box>
                      <Text fontSize="10px" px={2.5} py={1} borderRadius="full" color={item.status === 'Activo' ? '#15803D' : '#B91C1C'}
                        bg={item.status === 'Activo' ? '#EAF8EF' : '#FDECEC'} justifySelf={{ base: 'start', lg: 'center' }}
                        ml={{ base: '56px', xl: 0 }}>{item.status}</Text>
                      <Button size="sm" variant="ghost" justifySelf={{ base: 'end', lg: 'center' }}
                        aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}><FiSettings /></Button>
                    </Box>
                  ))}
                  {!isLoadingUsers && !usersError && !filteredUsers.length && (
                    <Flex minH="180px" align="center" justify="center" direction="column" gap={2} color="#888888">
                      <FiSearch size={22} />
                      <Text fontSize="12px">No encontramos usuarios con esa búsqueda.</Text>
                    </Flex>
                  )}
                </Stack>
                {!isLoadingUsers && !usersError && (
                  <Text fontSize="11px" color="#8A8A8A" mt={4}>{filteredUsers.length} usuarios mostrados</Text>
                )}
              </>
            )}

            {active === 'cuenta' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">INFORMACIÓN PERSONAL</Text>
                <Heading fontSize={{ base: '28px', md: '34px' }} mt={1} letterSpacing="-.04em">Mi perfil</Heading>
                <Text color="#777777" fontSize="13px" mt={1}>Información asociada a tu cuenta Construleads.</Text>
                <Flex mt={7} p={{ base: 5, md: 7 }} bg="linear-gradient(135deg, #F7F6F4 0%, #EFEDE9 100%)"
                  color={NAVY} border="1px solid #E2DFDA" borderLeft="4px solid #FF653F" borderRadius="20px"
                  align="center" gap={5} position="relative" overflow="hidden" boxShadow="0 14px 34px rgba(40,40,36,.07)">
                  <Box position="absolute" right="-70px" top="-100px" w="240px" h="240px" borderRadius="full"
                    border="38px solid rgba(255,101,63,.07)" />
                  <Flex w={{ base: '64px', md: '78px' }} h={{ base: '64px', md: '78px' }}
                    bg="#666662" border="1px solid #555551" color="white" borderRadius="19px"
                    align="center" justify="center" fontSize="22px" fontWeight="700" flexShrink="0">
                    {initials(name)}
                  </Flex>
                  <Box position="relative">
                    <Heading fontSize={{ base: '18px', md: '23px' }} letterSpacing="-.025em">{name}</Heading>
                    <HStack mt={1.5} gap={2}>
                      <Box w="7px" h="7px" borderRadius="full" bg={isAdmin === null ? '#A3A39F' : ACCENT} />
                      <Text color="#73736F" fontSize="12px">
                        {isAdmin === null ? 'Validando acceso…' : isAdmin ? 'Administrador BIMSA' : 'Cliente Construleads'}
                      </Text>
                    </HStack>
                  </Box>
                  <Button ml="auto" variant="outline" bg="white" borderColor="#FF9D80" color={ACCENT}
                    _hover={{ bg: '#FFF0EA', borderColor: ACCENT }} display={{ base: 'none', md: 'flex' }} position="relative">
                    <FiEdit2 /> Editar
                  </Button>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={5}>
                  {[
                    ['Correo electrónico', sessionUser.email || sessionUser.correo || 'usuario@empresa.com'],
                    ['Tipo de acceso', isAdmin === null ? 'Validando…' : isAdmin ? 'Administrador' : 'Consultor'],
                    ['Estado de cuenta', 'Activo'],
                  ].map(([label, value]) => (
                    <Box key={label} border="1px solid #E8E6E3" borderRadius="15px" p={5} bg="#FCFCFB"
                      _hover={{ borderColor: '#FFD0C1', transform: 'translateY(-1px)' }} transition="all .2s ease">
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
                <Text color="#777777" fontSize="13px" mt={1}>Consulta y vuelve a abrir los reportes disponibles en esta cuenta.</Text>
                <Stack mt={7} gap={2}>
                  {downloads.length ? downloads.map((item) => (
                    <Flex key={item.id} p={4} border="1px solid #EDEDED" borderRadius="14px" align="center" gap={4}>
                      <Flex w="42px" h="42px" bg={item.type === 'PDF' ? '#FFF0EA' : '#EAF8EF'} color={item.type === 'PDF' ? ACCENT : '#15803D'}
                        borderRadius="12px" align="center" justify="center"><FiFileText /></Flex>
                      <Box flex="1"><Text fontSize="13px" fontWeight="700">{item.name}</Text><Text fontSize="11px" color="#888888">{item.date}</Text></Box>
                      {item.size && item.size !== 'Generado' && (
                        <Text fontSize="11px" color="#777777" display={{ base: 'none', md: 'block' }}>{item.size}</Text>
                      )}
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
          </Box>
        </Flex>
      </Flex>
      {editing !== undefined && <UserModal initial={editing} onClose={() => setEditing(undefined)} onSave={saveUser} />}
    </Box>
  );
}
