import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Button, Flex, Heading, HStack, Input, SimpleGrid, Spinner, Stack, Text,
} from '@chakra-ui/react';
import {
  FiActivity, FiAlertTriangle, FiBell, FiCalendar, FiCheck, FiCheckCircle,
  FiChevronRight, FiClock, FiCpu, FiCreditCard, FiDownload, FiEdit2,
  FiFileText, FiGlobe, FiKey, FiLayers, FiLock, FiLogOut, FiMapPin, FiMonitor,
  FiPlus, FiRefreshCw, FiSearch, FiSettings, FiShield, FiSliders,
  FiTrendingUp, FiUser, FiUsers, FiX, FiZap,
} from 'react-icons/fi';
import ConstruleadsNavbar from './ConstruleadsNavbar';
import { iniciarDescargaReporte } from '../../api/reportes';
import { getDownloadHistory } from '../../utils/downloadHistory';
import {
  obtenerUsuariosAdministrador,
  validarUsuarioAdministrador,
} from '../../api/perfil';
import { RADAR_PREFERENCE_DEFAULTS, persistRadarPreferences } from '../../utils/radarNotifications';

const ACCENT = '#FF653F';
const NAVY = 'var(--pf-text)';
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
const PREFERENCE_DEFAULTS = RADAR_PREFERENCE_DEFAULTS;
const PREFERENCE_REGIONS = ['Centro', 'Noreste', 'Noroeste', 'Occidente', 'Sureste'];
const PREFERENCE_GENRES = ['Vivienda', 'Edificación', 'Infraestructura', 'Industrial'];
const PREFERENCE_SECTORS = PROFILE_GROUPS.sectores;
const PREFERENCE_STAGES = PROFILE_GROUPS.etapas;
const EMPTY_CRITERIA = Object.freeze({
  regions: [],
  genres: [],
  sectors: [],
  stages: [],
  minimumInvestment: '',
});

function normalizeCriteria(criteria = {}) {
  return {
    ...EMPTY_CRITERIA,
    ...criteria,
    regions: Array.isArray(criteria.regions) ? criteria.regions : [],
    genres: Array.isArray(criteria.genres) ? criteria.genres : [],
    sectors: Array.isArray(criteria.sectors) ? criteria.sectors : [],
    stages: Array.isArray(criteria.stages) ? criteria.stages : [],
  };
}

function hydratePreferences(saved = {}) {
  const legacyCriteria = normalizeCriteria(saved);
  return {
    ...PREFERENCE_DEFAULTS,
    ...saved,
    projectCriteria: normalizeCriteria(saved.projectCriteria || legacyCriteria),
    tenderCriteria: normalizeCriteria(saved.tenderCriteria || legacyCriteria),
  };
}

function criteriaLabel(values) {
  return Array.isArray(values) && values.length ? values.join(', ') : 'Todas';
}

function formatDateTime(value) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function getBrowserLabel() {
  if (typeof navigator === 'undefined') return 'Este dispositivo';
  const agent = navigator.userAgent;
  if (/Edg\//.test(agent)) return 'Microsoft Edge';
  if (/Chrome\//.test(agent)) return 'Google Chrome';
  if (/Safari\//.test(agent)) return 'Safari';
  if (/Firefox\//.test(agent)) return 'Firefox';
  return 'Navegador actual';
}

function MetricCard({ icon: Icon, label, value, helper, accent = ACCENT }) {
  return (
    <Box p={4} minH="108px" border="1px solid var(--pf-border)" borderRadius="15px" bg="var(--pf-surface-subtle)">
      <Flex align="center" gap={2.5} color={accent}>
        <Flex w="29px" h="29px" borderRadius="9px" bg="var(--pf-accent-soft)" align="center" justify="center"><Icon size={15} /></Flex>
        <Text fontSize="10px" fontWeight="700" color="var(--pf-text-muted)" textTransform="uppercase" letterSpacing=".06em">{label}</Text>
      </Flex>
      <Text mt={3} fontSize="18px" lineHeight="1.05" fontWeight="600" color="var(--pf-text-strong)">{value}</Text>
      {helper && <Text mt={1.5} fontSize="11px" color="var(--pf-text-muted)">{helper}</Text>}
    </Box>
  );
}

function ToggleRow({ icon: Icon, title, detail, checked, onChange }) {
  return (
    <Flex align="center" gap={3} p={4} border="1px solid var(--pf-border)" borderRadius="14px" bg="var(--pf-surface-subtle)">
      <Flex w="35px" h="35px" borderRadius="10px" bg="var(--pf-accent-soft)" color={ACCENT} align="center" justify="center" flexShrink="0"><Icon size={17} /></Flex>
      <Box flex="1" minW="0">
        <Text fontSize="13px" fontWeight="600">{title}</Text>
        <Text fontSize="11px" mt={.5} color="var(--pf-text-muted)">{detail}</Text>
      </Box>
      <Box as="button" type="button" role="switch" aria-checked={checked} aria-label={title} onClick={onChange}
        w="42px" h="24px" p="3px" borderRadius="full" bg={checked ? ACCENT : 'var(--pf-border-strong)'} transition="background .18s ease" flexShrink="0">
        <Box w="18px" h="18px" borderRadius="full" bg="white" transform={checked ? 'translateX(18px)' : 'translateX(0)'} transition="transform .18s ease" boxShadow="0 1px 3px rgba(0,0,0,.28)" />
      </Box>
    </Flex>
  );
}

function ChoiceChips({ icon: Icon, title, detail, options, selected = [], onToggle }) {
  return (
    <Box p={5} border="1px solid var(--pf-border)" borderRadius="16px" bg="var(--pf-surface-subtle)">
      <Flex gap={2} align="center">
        <Icon color={ACCENT} />
        <Text fontSize="13px" fontWeight="700">{title}</Text>
      </Flex>
      <Text mt={1} fontSize="11px" color="var(--pf-text-muted)">{detail}</Text>
      <Flex mt={4} gap={2} flexWrap="wrap">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Box
              key={option}
              as="button"
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={isSelected}
              px={3}
              py={1.5}
              borderRadius="full"
              fontSize="11px"
              fontWeight="600"
              bg={isSelected ? 'var(--pf-accent-soft)' : 'var(--pf-surface)'}
              color={isSelected ? ACCENT : NAVY}
              border={`1px solid ${isSelected ? 'var(--pf-accent-border)' : 'var(--pf-border)'}`}
              _hover={{ borderColor: 'var(--pf-accent-border)', color: ACCENT }}
            >
              {option}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}

function InterestSummary({ label, value }) {
  return (
    <Box p={2} borderRadius="9px" bg="var(--pf-surface)" border="1px solid var(--pf-border)" minW="0">
      <Text fontSize="9px" color="var(--pf-text-muted)" fontWeight="700" textTransform="uppercase" letterSpacing=".04em">{label}</Text>
      <Text mt={.5} fontSize="10px" fontWeight="600" lineClamp={1}>{value}</Text>
    </Box>
  );
}

function NotificationPreferenceCard({ icon: Icon, title, detail, checked, onChange, criteria, onConfigure }) {
  return (
    <Box p={4} border="1px solid var(--pf-border)" borderRadius="15px" bg="var(--pf-surface-subtle)" minW="0">
      <Flex gap={3} align="center">
        <Flex w="34px" h="34px" borderRadius="10px" bg="var(--pf-accent-soft)" color={ACCENT} align="center" justify="center" flexShrink="0"><Icon size={17} /></Flex>
        <Box flex="1" minW="0">
          <Text fontSize="13px" fontWeight="700">{title}</Text>
          <Text mt={.5} fontSize="10px" color="var(--pf-text-muted)" lineClamp={1}>{detail}</Text>
        </Box>
        <Box as="button" type="button" role="switch" aria-checked={checked} aria-label={title} onClick={onChange}
          w="40px" h="23px" p="3px" borderRadius="full" bg={checked ? ACCENT : 'var(--pf-border-strong)'} transition="background .18s ease" flexShrink="0">
          <Box w="17px" h="17px" borderRadius="full" bg="white" transform={checked ? 'translateX(17px)' : 'translateX(0)'} transition="transform .18s ease" />
        </Box>
      </Flex>
      <SimpleGrid columns={2} gap={2} mt={3}>
        <InterestSummary label="Zonas de interés" value={criteriaLabel(criteria.regions)} />
        <InterestSummary label="Géneros de interés" value={criteriaLabel(criteria.genres)} />
        <InterestSummary label="Sectores" value={criteriaLabel(criteria.sectors)} />
        <InterestSummary label="Etapas" value={criteriaLabel(criteria.stages)} />
      </SimpleGrid>
      <Button mt={3} size="sm" variant="outline" borderColor="var(--pf-accent-border)" color={ACCENT}
        _hover={{ bg: 'var(--pf-accent-soft)' }} onClick={onConfigure} w="100%">
        <FiSliders /> Configurar preferencias
      </Button>
    </Box>
  );
}

function CriteriaModal({ title, icon: Icon, initialCriteria, onClose, onSave }) {
  const [criteria, setCriteria] = useState(() => normalizeCriteria(initialCriteria));
  const toggle = (key, value) => {
    setCriteria((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  return (
    <Modal onClose={onClose} wide>
      <Flex p={{ base: 5, md: 6 }} borderBottom="1px solid var(--pf-border)" justify="space-between" align="start" gap={4}>
        <Flex gap={3} align="center">
          <Flex w="40px" h="40px" borderRadius="12px" bg="var(--pf-accent-soft)" color={ACCENT} align="center" justify="center"><Icon size={19} /></Flex>
          <Box>
            <Text color={ACCENT} fontSize="10px" fontWeight="800" letterSpacing=".12em">PREFERENCIAS DE NOTIFICACIÓN</Text>
            <Heading fontSize={{ base: '20px', md: '25px' }} mt={.5}>{title}</Heading>
            <Text fontSize="11px" color="var(--pf-text-muted)" mt={.5}>Elige qué coincidencias recibirás en la campana.</Text>
          </Box>
        </Flex>
        <Button aria-label="Cerrar" variant="ghost" color={NAVY} onClick={onClose}><FiX size={21} /></Button>
      </Flex>
      <Box p={{ base: 5, md: 6 }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <ChoiceChips icon={FiGlobe} title="Zonas de interés" detail="Dónde quieres encontrar oportunidades." options={PREFERENCE_REGIONS} selected={criteria.regions} onToggle={(value) => toggle('regions', value)} />
          <ChoiceChips icon={FiLayers} title="Géneros de interés" detail="Los mercados constructivos que te interesan." options={PREFERENCE_GENRES} selected={criteria.genres} onToggle={(value) => toggle('genres', value)} />
          <ChoiceChips icon={FiCreditCard} title="Sectores" detail="Quién impulsa los proyectos." options={PREFERENCE_SECTORS} selected={criteria.sectors} onToggle={(value) => toggle('sectors', value)} />
          <ChoiceChips icon={FiCalendar} title="Etapas" detail="El momento de avance que buscas." options={PREFERENCE_STAGES} selected={criteria.stages} onToggle={(value) => toggle('stages', value)} />
        </SimpleGrid>
        <Box mt={4} maxW="320px">
          <Text fontSize="12px" fontWeight="700">Inversión mínima</Text>
          <Input mt={2} type="number" min="0" placeholder="Sin mínimo" value={criteria.minimumInvestment || ''}
            onChange={(event) => setCriteria((current) => ({ ...current, minimumInvestment: event.target.value }))}
            h="40px" bg="var(--pf-surface)" borderColor="var(--pf-border-strong)" />
          <Text mt={1.5} fontSize="10px" color="var(--pf-text-muted)">Monto en MDP; déjalo vacío para no limitar.</Text>
        </Box>
      </Box>
      <Flex px={{ base: 5, md: 6 }} pb={{ base: 5, md: 6 }} gap={3} justify="flex-end">
        <Button variant="outline" borderColor="var(--pf-border-strong)" onClick={onClose}>Cancelar</Button>
        <Button bg={ACCENT} color="white" _hover={{ bg: '#E95734' }} onClick={() => onSave(criteria)}><FiCheck /> Guardar preferencias</Button>
      </Flex>
    </Modal>
  );
}

function EmptyAudit({ icon: Icon, children }) {
  return (
    <Flex minH="150px" border="1px dashed var(--pf-border-strong)" borderRadius="15px" align="center" justify="center" direction="column" textAlign="center" px={6} color="var(--pf-text-muted)">
      <Flex w="38px" h="38px" borderRadius="12px" bg="var(--pf-surface-muted)" align="center" justify="center" mb={3}><Icon size={18} /></Flex>
      <Text fontSize="12px">{children}</Text>
    </Flex>
  );
}

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
      <Box role="dialog" aria-modal="true" bg="var(--pf-surface)" color={NAVY} w="100%" maxW={wide ? '1120px' : '680px'}
        maxH="92vh" overflowY="auto" border="1px solid var(--pf-border)" borderRadius="24px" boxShadow="var(--pf-shadow-modal)"
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
            <Text fontSize="11px" color="var(--pf-text-muted)">{(access[group] || []).length}/{options.length}</Text>
          </Flex>
          <Stack gap={2}>
            {options.map((option) => {
              const active = (access[group] || []).includes(option);
              return (
                <Flex key={option} as="button" type="button" onClick={() => toggle(group, option)}
                  align="center" gap={2.5} p={2.5} borderRadius="10px"
                  bg={active ? 'var(--pf-accent-soft)' : 'var(--pf-surface-muted)'} color={active ? ACCENT : NAVY}
                  border={`1px solid ${active ? 'var(--pf-accent-border)' : 'var(--pf-border)'}`} textAlign="left">
                  <Flex w="19px" h="19px" borderRadius="5px" border={`1.5px solid ${active ? ACCENT : 'var(--pf-text-muted)'}`}
                    bg={active ? ACCENT : 'var(--pf-surface)'} color="white" align="center" justify="center" flexShrink="0">
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
        h="48px" bg="var(--pf-surface)" borderColor="var(--pf-border-strong)" borderRadius="11px" _focus={{ borderColor: ACCENT, boxShadow: '0 0 0 1px #FF653F' }} />
    </Box>
  );
  const canContinue = form.name.trim() && form.email.trim() && form.company.trim();
  return (
    <Modal onClose={onClose} wide={step === 2}>
      <Flex p={{ base: 5, md: 7 }} borderBottom="1px solid var(--pf-border)" align="start" justify="space-between">
        <Box>
          <Text color={ACCENT} fontWeight="700" fontSize="12px" textTransform="uppercase" letterSpacing=".12em">
            Paso {step} de 2
          </Text>
          <Heading fontSize={{ base: '22px', md: '27px' }} mt={1}>
            {step === 1 ? (initial ? 'Editar usuario' : 'Nuevo usuario') : 'Configurar visibilidad'}
          </Heading>
          <Text color="var(--pf-text-muted)" mt={1} fontSize="13px">
            {step === 1 ? 'Datos de acceso y perfil de la cuenta.' : 'Solo la información marcada se incluirá en la respuesta XML de este usuario.'}
          </Text>
        </Box>
        <Button aria-label="Cerrar" variant="ghost" onClick={onClose} color={NAVY} _hover={{ bg: 'var(--pf-surface-muted)' }}><FiX size={23} /></Button>
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
                w="100%" h="48px" border="1px solid var(--pf-border-strong)" borderRadius="11px" px={3} bg="var(--pf-surface)">
                <option>Consultor</option><option>Administrador</option><option>Solo lectura</option>
              </Box>
            </Box>
            <Box>
              <Text fontSize="12px" fontWeight="700" mb={2}>Estatus</Text>
              <Box as="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}
                w="100%" h="48px" border="1px solid var(--pf-border-strong)" borderRadius="11px" px={3} bg="var(--pf-surface)">
                <option>Activo</option><option>Suspendido</option>
              </Box>
            </Box>
          </SimpleGrid>
        ) : <AccessEditor access={form.access} onChange={(access) => setForm({ ...form, access })} />}
      </Box>
      <Flex px={{ base: 5, md: 7 }} pb={{ base: 5, md: 7 }} gap={3} justify="flex-end">
        <Button variant="outline" borderColor="var(--pf-border-strong)" color={NAVY} onClick={step === 1 ? onClose : () => setStep(1)}
          _hover={{ bg: 'var(--pf-surface-muted)' }}>
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

export default function Perfil({ embedded = false, isDarkMode: inheritedDarkMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = localStorage.getItem('cl_authenticated') === 'true';
  const [localDarkMode, setLocalDarkMode] = useState(() => sessionStorage.getItem('cl_color_mode') === 'dark');
  const isDarkMode = inheritedDarkMode ?? localDarkMode;
  const sessionUser = useMemo(() => loadLocal('construleadsUser', {}), []);
  const [isAdmin, setIsAdmin] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [active, setActive] = useState(() => location.state?.activeTab || 'cuenta');
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const profileId = sessionUser.idUsuario || sessionUser.email || 'local';
  const preferencesStorageKey = `construleads-profile-preferences-${profileId}`;
  const activityStorageKey = `construleads-profile-activity-${profileId}`;
  const lastAccessStorageKey = `construleads-profile-last-access-${profileId}`;
  const [downloads, setDownloads] = useState(getDownloadHistory);
  const [preferences, setPreferences] = useState(() => hydratePreferences(loadLocal(preferencesStorageKey, {})));
  const [activityLog, setActivityLog] = useState(() => loadLocal(activityStorageKey, []));
  const [lastAccess] = useState(() => localStorage.getItem(lastAccessStorageKey) || new Date().toISOString());
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [criteriaEditor, setCriteriaEditor] = useState(null);
  const [confirmCloseSessions, setConfirmCloseSessions] = useState(false);
  const [brief, setBrief] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(undefined);
  const profileTheme = isDarkMode
    ? {
        '--pf-page-bg': '#111111',
        '--pf-surface': '#181818',
        '--pf-surface-muted': '#222222',
        '--pf-surface-subtle': '#1F1F1F',
        '--pf-profile-gradient': 'linear-gradient(135deg, #252321 0%, #1D1D1D 100%)',
        '--pf-control-gradient': 'linear-gradient(145deg, #202020, #191919)',
        '--pf-border': '#333333',
        '--pf-border-strong': '#454545',
        '--pf-text': '#E5E7EB',
        '--pf-text-strong': '#F5F5F5',
        '--pf-text-muted': '#A3A3A3',
        '--pf-hover': '#262626',
        '--pf-accent-soft': 'rgba(255,101,63,.14)',
        '--pf-accent-border': 'rgba(255,141,110,.45)',
        '--pf-avatar': '#4B4B49',
        '--pf-avatar-border': '#656561',
        '--pf-success-soft': 'rgba(22,163,74,.16)',
        '--pf-success-text': '#86EFAC',
        '--pf-danger-soft': 'rgba(220,38,38,.16)',
        '--pf-danger-text': '#FCA5A5',
        '--pf-shadow': '0 16px 42px rgba(0,0,0,.30)',
        '--pf-shadow-modal': '0 30px 80px rgba(0,0,0,.52)',
        '--pf-scrollbar': '#4A4A4A',
      }
    : {
        '--pf-page-bg': '#F3F3F1',
        '--pf-surface': '#FFFFFF',
        '--pf-surface-muted': '#F7F7F7',
        '--pf-surface-subtle': '#FCFCFB',
        '--pf-profile-gradient': 'linear-gradient(135deg, #F7F6F4 0%, #EFEDE9 100%)',
        '--pf-control-gradient': 'linear-gradient(145deg, #FBFAF8, #F6F4F1)',
        '--pf-border': '#E5E3DF',
        '--pf-border-strong': '#DDDDDD',
        '--pf-text': '#252525',
        '--pf-text-strong': '#202020',
        '--pf-text-muted': '#777777',
        '--pf-hover': '#F7F7F5',
        '--pf-accent-soft': '#FFF0EA',
        '--pf-accent-border': '#FFD0BF',
        '--pf-avatar': '#666662',
        '--pf-avatar-border': '#555551',
        '--pf-success-soft': '#EAF8EF',
        '--pf-success-text': '#15803D',
        '--pf-danger-soft': '#FDECEC',
        '--pf-danger-text': '#B91C1C',
        '--pf-shadow': '0 14px 38px rgba(20,20,20,.05)',
        '--pf-shadow-modal': '0 30px 80px rgba(20,20,20,.24)',
        '--pf-scrollbar': '#D5D2CE',
      };

  useEffect(() => { document.title = 'Mi cuenta | Construleads'; }, []);
  useEffect(() => {
    const refreshDownloads = () => setDownloads(getDownloadHistory());
    refreshDownloads();
    window.addEventListener('construleads-download-history-updated', refreshDownloads);
    window.addEventListener('storage', refreshDownloads);
    return () => {
      window.removeEventListener('construleads-download-history-updated', refreshDownloads);
      window.removeEventListener('storage', refreshDownloads);
    };
  }, []);
  useEffect(() => {
    const now = new Date().toISOString();
    localStorage.setItem(lastAccessStorageKey, now);
  }, [lastAccessStorageKey]);
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
  const subscription = {
    plan: sessionUser.plan || sessionUser.planContratado || '',
    startedAt: sessionUser.fechaInicioSuscripcion || sessionUser.fechaInicio || '',
    endsAt: sessionUser.fechaFinSuscripcion || sessionUser.fechaFin || '',
    seats: sessionUser.usuariosContratados || sessionUser.limiteUsuarios || '',
    downloadsLimit: sessionUser.limiteDescargas || '',
    downloadsUsed: sessionUser.descargasConsumidas || '',
  };
  const hasSubscriptionServiceData = Boolean(subscription.plan || subscription.startedAt || subscription.endsAt);
  const filteredUsers = users.filter((item) =>
    `${item.userId} ${item.name} ${item.email} ${item.phone} ${item.company}`
      .toLowerCase().includes(query.toLowerCase()));
  const tabs = [
    { id: 'cuenta', label: 'Mi perfil', icon: FiUser },
    { id: 'suscripcion', label: 'Suscripción y consumo', icon: FiCreditCard },
    { id: 'seguridad', label: 'Seguridad y sesión', icon: FiShield },
    { id: 'actividad', label: 'Actividad y auditoría', icon: FiActivity },
    { id: 'preferencias', label: 'Preferencias', icon: FiSliders },
    { id: 'insights', label: 'BIMSA Pulse', icon: FiZap },
    ...(isAdmin ? [{ id: 'usuarios', label: 'Usuarios y permisos', icon: FiUsers }] : []),
    { id: 'descargas', label: 'Historial de descargas', icon: FiDownload },
  ];
  const toggleColorMode = () => {
    setLocalDarkMode((current) => {
      const nextIsDark = !current;
      sessionStorage.setItem('cl_color_mode', nextIsDark ? 'dark' : 'light');
      return nextIsDark;
    });
  };
  const handleLogout = () => {
    localStorage.removeItem('cl_authenticated');
    localStorage.removeItem('construleadsUser');
    navigate('/', { replace: true });
  };
  const saveUser = (form) => {
    const serializedForm = { ...form, accessXml: accessToXml(form.access) };
    if (editing?.id) setUsers((current) => current.map((item) => item.id === editing.id ? { ...item, ...serializedForm } : item));
    else setUsers((current) => [{ ...serializedForm, id: Date.now(), lastAccess: 'Invitación pendiente' }, ...current]);
    setEditing(undefined);
  };
  const addActivity = (title, description, icon = 'activity') => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      description,
      icon,
      date: new Date().toISOString(),
    };
    setActivityLog((current) => {
      const next = [entry, ...current].slice(0, 80);
      localStorage.setItem(activityStorageKey, JSON.stringify(next));
      return next;
    });
  };
  const savePreferences = () => {
    persistRadarPreferences(preferences);
    setPreferencesSaved(true);
    addActivity(
      'Radar semanal actualizado',
      'Se guardaron las señales y criterios del Radar semanal de oportunidades.',
      'preferences',
    );
    window.setTimeout(() => setPreferencesSaved(false), 2200);
  };
  const saveNotificationCriteria = (key, criteria) => {
    const next = { ...preferences, [key]: normalizeCriteria(criteria) };
    setPreferences(next);
    persistRadarPreferences(next);
    setPreferencesSaved(true);
    setCriteriaEditor(null);
    window.setTimeout(() => setPreferencesSaved(false), 2200);
  };
  const closeAllSessions = () => {
    addActivity('Cierre de sesión solicitado', 'A la espera de Web Service.', 'security');
    setConfirmCloseSessions(false);
    handleLogout();
  };
  const generateRadarPreview = () => {
    const signals = [
      preferences.newProjects && 'obras nuevas',
      preferences.newTenders && 'licitaciones nuevas',
      preferences.relevantChanges && 'cambios relevantes',
      preferences.companyActivity && 'actividad de empresas y contactos',
    ].filter(Boolean);
    const projectCriteria = preferences.projectCriteria || EMPTY_CRITERIA;
    const tenderCriteria = preferences.tenderCriteria || EMPTY_CRITERIA;
    const criteria = [
      preferences.newProjects && projectCriteria.regions?.length && `obras en ${projectCriteria.regions.join(', ')}`,
      preferences.newTenders && tenderCriteria.regions?.length && `licitaciones en ${tenderCriteria.regions.join(', ')}`,
      projectCriteria.genres?.length && `géneros de obras: ${projectCriteria.genres.join(', ')}`,
      tenderCriteria.genres?.length && `géneros de licitaciones: ${tenderCriteria.genres.join(', ')}`,
    ].filter(Boolean);
    const amount = Math.min(Math.max(Number(preferences.maxResults) || 10, 1), 25);
    const message = signals.length
      ? `Vista previa V1: el Radar revisará ${signals.join(', ')}${criteria.length ? ` con ${criteria.join(' · ')}` : ''}. Mostrará hasta ${amount} oportunidades y explicará por qué aparece cada una.`
      : 'Activa al menos una señal para preparar una vista previa del Radar.';
    setBrief(message);
    addActivity(
      'Vista previa del Radar generada',
      'Se generó una lectura local a partir de los criterios configurados.',
      'insight',
    );
  };

  const radarCriteriaCount = [
    preferences.projectCriteria?.regions?.length || 0,
    preferences.projectCriteria?.genres?.length || 0,
    preferences.projectCriteria?.sectors?.length || 0,
    preferences.projectCriteria?.stages?.length || 0,
    preferences.projectCriteria?.minimumInvestment ? 1 : 0,
    preferences.tenderCriteria?.regions?.length || 0,
    preferences.tenderCriteria?.genres?.length || 0,
    preferences.tenderCriteria?.sectors?.length || 0,
    preferences.tenderCriteria?.stages?.length || 0,
    preferences.tenderCriteria?.minimumInvestment ? 1 : 0,
  ].filter(Boolean).length;
  const radarSignalsCount = [
    preferences.newProjects,
    preferences.newTenders,
    preferences.relevantChanges,
    preferences.companyActivity,
  ].filter(Boolean).length;

  const profileView = (
    <Box h="100%" minH="0" bg="var(--pf-page-bg)" color={NAVY} overflow="hidden" style={profileTheme}>
      <style>{`
        @keyframes cl-profile-enter {
          from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.992); }
          to { opacity: 1; transform: none; }
        }
        @keyframes cl-profile-panel {
          from { opacity: 0; transform: translate3d(10px, 0, 0); }
          to { opacity: 1; transform: none; }
        }
        .cl-profile-shell { animation: cl-profile-enter 420ms cubic-bezier(.22, 1, .36, 1) both; }
        .cl-profile-panel { animation: cl-profile-panel 300ms cubic-bezier(.22, 1, .36, 1) both; }
        .cl-profile-scroll { scrollbar-width: thin; scrollbar-color: var(--pf-scrollbar) transparent; }
        .cl-profile-scroll::-webkit-scrollbar { width: 7px; }
        .cl-profile-scroll::-webkit-scrollbar-track { background: transparent; }
        .cl-profile-scroll::-webkit-scrollbar-thumb { background: var(--pf-scrollbar); border-radius: 999px; }
        @media (prefers-reduced-motion: reduce) {
          .cl-profile-shell, .cl-profile-panel { animation: none; }
        }
      `}</style>
      <Flex className="cl-profile-shell"
        h="100%" minH="0" direction="column">
        {!embedded && (
          <ConstruleadsNavbar
            activeModule="perfil"
            isDarkMode={isDarkMode}
            userName={name}
            onProjects={() => navigate('/construleads/proyectos/mapa')}
            onLicitaciones={() => navigate('/construleads/licitaciones')}
            onProfile={() => undefined}
            onPreferences={() => setActive('preferencias')}
            onToggleTheme={toggleColorMode}
            onLogout={handleLogout}
          />
        )}

        <Flex gap={3} align="stretch" direction={{ base: 'column', lg: 'row' }}
          flex="1" minH="0" overflow="hidden">
          <Box bg="var(--pf-surface)" color={NAVY} border="1px solid var(--pf-border)" w={{ base: '100%', lg: '260px' }}
            borderRadius={{ base: 0, md: '20px' }} p={5} flexShrink="0" boxShadow="var(--pf-shadow)"
            h={{ base: 'auto', lg: '100%' }} overflowY={{ base: 'visible', lg: 'auto' }} className="cl-profile-scroll">
            <Text color={ACCENT} fontSize="10px" fontWeight="800" letterSpacing=".16em">MI CUENTA</Text>
            <Heading fontSize="24px" mt={2} letterSpacing="-.035em">Hola, {name.split(' ')[0]}</Heading>
            <Text fontSize="12px" color="var(--pf-text-muted)" mt={1}>Gestiona tu cuenta y accesos.</Text>
            <Stack mt={6} gap={1.5}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Flex key={tab.id} as="button" onClick={() => setActive(tab.id)} align="center" gap={3} p={3}
                    borderRadius="12px" bg={active === tab.id ? 'var(--pf-accent-soft)' : 'transparent'}
                    color={active === tab.id ? ACCENT : NAVY}
                    border={`1px solid ${active === tab.id ? 'var(--pf-accent-border)' : 'transparent'}`}
                    boxShadow={active === tab.id ? '0 8px 20px rgba(255,101,63,.08)' : 'none'}
                    _hover={{ bg: active === tab.id ? 'var(--pf-accent-soft)' : 'var(--pf-hover)', transform: 'translateX(2px)' }}
                    transition="all .2s ease" textAlign="left">
                    <Icon size={17} /><Text fontSize="12px" fontWeight="600">{tab.label}</Text>
                  </Flex>
                );
              })}
            </Stack>
            {adminError && <Text mt={5} fontSize="10px" color="var(--pf-danger-text)">{adminError}</Text>}
            <Box mt={6} p={4} border="1px solid var(--pf-border)" bg="var(--pf-control-gradient)" borderRadius="14px">
              <FiShield color={ACCENT} />
              <Text fontSize="11px" fontWeight="700" mt={2}>Control de datos</Text>
              <Text color="var(--pf-text-muted)" fontSize="10px" mt={1}>Los permisos definen qué campos recibe cada usuario.</Text>
            </Box>
          </Box>

          <Box bg="var(--pf-surface)" border="1px solid var(--pf-border)" borderRadius={{ base: 0, md: '20px' }}
            p={{ base: 5, md: 7 }} flex="1" minH="0" overflowY={{ base: 'auto', lg: active === 'preferencias' ? 'hidden' : 'auto' }} overscrollBehavior="contain"
            className="cl-profile-scroll" boxShadow="var(--pf-shadow)">
            <Box key={active} className="cl-profile-panel">
            {active === 'usuarios' && (
              <>
                <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
                  <Box>
                    <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">ADMINISTRACIÓN</Text>
                    <Heading fontSize={{ base: '24px', md: '30px' }} mt={1}>Usuarios y accesos</Heading>
                    <Text color="var(--pf-text-muted)" fontSize="13px" mt={1}>Consulta las cuentas asociadas a tu administración.</Text>
                  </Box>
                  <Button bg={ACCENT} color="white" _hover={{ bg: '#E95734' }} onClick={() => setEditing(null)}><FiPlus /> Nuevo usuario</Button>
                </Flex>
                <Flex mt={7} bg="var(--pf-surface-muted)" border="1px solid var(--pf-border)" borderRadius="12px" align="center" px={4} maxW="440px">
                  <FiSearch color="var(--pf-text-muted)" /><Input value={query} onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por ID, usuario, correo o empresa" border="0" _focus={{ boxShadow: 'none' }} fontSize="12px" />
                </Flex>
                <Stack mt={5} gap={2}>
                  {isLoadingUsers && (
                    <Flex minH="220px" align="center" justify="center" direction="column" gap={3} color="var(--pf-text-muted)">
                      <Spinner color={ACCENT} thickness="3px" />
                      <Text fontSize="12px">Consultando usuarios y permisos…</Text>
                    </Flex>
                  )}
                  {!isLoadingUsers && usersError && (
                    <Flex minH="180px" align="center" justify="center" direction="column" gap={2}
                      bg="var(--pf-accent-soft)" border="1px solid var(--pf-accent-border)" borderRadius="16px" color="var(--pf-danger-text)">
                      <FiUsers size={22} />
                      <Text fontSize="12px" fontWeight="700">{usersError}</Text>
                    </Flex>
                  )}
                  {!isLoadingUsers && !usersError && filteredUsers.map((item) => (
                    <Box key={item.id} p={4} border="1px solid var(--pf-border)" borderRadius="15px" bg="var(--pf-surface-subtle)"
                      display="grid"
                      gridTemplateColumns={{ base: '1fr', xl: 'minmax(250px, 1.15fr) 90px minmax(150px, .7fr) minmax(140px, .7fr) 82px 36px' }}
                      columnGap={{ base: 3, lg: 4 }} rowGap={3} alignItems="center"
                      _hover={{ borderColor: 'var(--pf-accent-border)', boxShadow: 'var(--pf-shadow)', transform: 'translateY(-1px)' }}
                      transition="all .2s ease">
                      <Flex align="center" gap={3} minW="0">
                        <Flex w="44px" h="44px" bg="var(--pf-surface-muted)" borderRadius="12px" align="center"
                          justify="center" fontWeight="700" flexShrink="0">{initials(item.name)}</Flex>
                        <Box minW="0">
                          <Text fontSize="13px" fontWeight="700" truncate>{item.name}</Text>
                          <Text fontSize="11px" color="var(--pf-text-muted)" truncate>{item.email}</Text>
                        </Box>
                      </Flex>
                      <Box pl={{ base: '56px', xl: 0 }}>
                        <Text fontSize="9px" color="var(--pf-text-muted)" fontWeight="700" letterSpacing=".06em">ID USUARIO</Text>
                        <Text fontSize="12px" fontWeight="700">{item.userId || '—'}</Text>
                      </Box>
                      <Box pl={{ base: '56px', xl: 0 }}>
                        <Text fontSize="9px" color="var(--pf-text-muted)" fontWeight="700" letterSpacing=".06em">EMPRESA</Text>
                        <Text fontSize="12px" fontWeight="700" truncate>{item.company}</Text>
                      </Box>
                      <Box pl={{ base: '56px', xl: 0 }}>
                        <Text fontSize="9px" color="var(--pf-text-muted)" fontWeight="700" letterSpacing=".06em">TELÉFONO</Text>
                        <Text fontSize="12px" fontWeight="600">{item.phone || 'Sin teléfono'}</Text>
                      </Box>
                      <Text fontSize="10px" px={2.5} py={1} borderRadius="full" color={item.status === 'Activo' ? 'var(--pf-success-text)' : 'var(--pf-danger-text)'}
                        bg={item.status === 'Activo' ? 'var(--pf-success-soft)' : 'var(--pf-danger-soft)'} justifySelf={{ base: 'start', lg: 'center' }}
                        ml={{ base: '56px', xl: 0 }}>{item.status}</Text>
                      <Button size="sm" variant="ghost" justifySelf={{ base: 'end', lg: 'center' }}
                        aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}><FiSettings /></Button>
                    </Box>
                  ))}
                  {!isLoadingUsers && !usersError && !filteredUsers.length && (
                    <Flex minH="180px" align="center" justify="center" direction="column" gap={2} color="var(--pf-text-muted)">
                      <FiSearch size={22} />
                      <Text fontSize="12px">No encontramos usuarios con esa búsqueda.</Text>
                    </Flex>
                  )}
                </Stack>
                {!isLoadingUsers && !usersError && (
                  <Text fontSize="11px" color="var(--pf-text-muted)" mt={4}>{filteredUsers.length} usuarios mostrados</Text>
                )}
              </>
            )}

            {active === 'cuenta' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">INFORMACIÓN PERSONAL</Text>
                <Heading fontSize={{ base: '28px', md: '34px' }} mt={1} letterSpacing="-.04em">Mi perfil</Heading>
                <Text color="var(--pf-text-muted)" fontSize="13px" mt={1}>Información asociada a tu cuenta Construleads.</Text>
                <Flex mt={7} p={{ base: 5, md: 7 }} bg="var(--pf-profile-gradient)"
                  color={NAVY} border="1px solid var(--pf-border)" borderLeft="4px solid #FF653F" borderRadius="20px"
                  align="center" gap={5} position="relative" overflow="hidden" boxShadow="var(--pf-shadow)">
                  <Box position="absolute" right="-70px" top="-100px" w="240px" h="240px" borderRadius="full"
                    border="38px solid rgba(255,101,63,.07)" />
                  <Flex w={{ base: '64px', md: '78px' }} h={{ base: '64px', md: '78px' }}
                    bg="var(--pf-avatar)" border="1px solid var(--pf-avatar-border)" color="white" borderRadius="19px"
                    align="center" justify="center" fontSize="22px" fontWeight="700" flexShrink="0">
                    {initials(name)}
                  </Flex>
                  <Box position="relative">
                    <Heading fontSize={{ base: '18px', md: '23px' }} letterSpacing="-.025em">{name}</Heading>
                    <HStack mt={1.5} gap={2}>
                      <Box w="7px" h="7px" borderRadius="full" bg={isAdmin === null ? '#A3A39F' : ACCENT} />
                      <Text color="var(--pf-text-muted)" fontSize="12px">
                        {isAdmin === null ? 'Validando acceso…' : isAdmin ? 'Administrador BIMSA' : 'Cliente Construleads'}
                      </Text>
                    </HStack>
                  </Box>
                  <Button ml="auto" variant="outline" bg="var(--pf-surface)" borderColor="var(--pf-accent-border)" color={ACCENT}
                    _hover={{ bg: 'var(--pf-accent-soft)', borderColor: ACCENT }} display={{ base: 'none', md: 'flex' }} position="relative">
                    <FiEdit2 /> Editar
                  </Button>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={5}>
                  {[
                    ['Correo electrónico', sessionUser.email || sessionUser.correo || 'usuario@empresa.com'],
                    ['Tipo de acceso', isAdmin === null ? 'Validando…' : isAdmin ? 'Administrador' : 'Consultor'],
                    ['Estado de cuenta', 'Activo'],
                  ].map(([label, value]) => (
                    <Box key={label} border="1px solid var(--pf-border)" borderRadius="15px" p={5} bg="var(--pf-surface-subtle)"
                      _hover={{ borderColor: 'var(--pf-accent-border)', transform: 'translateY(-1px)' }} transition="all .2s ease">
                      <Text color="var(--pf-text-muted)" fontSize="10px" fontWeight="700">{label.toUpperCase()}</Text>
                      <Text fontWeight="600" fontSize="13px" mt={1}>{value}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mt={4}>
                  <Flex p={5} border="1px solid var(--pf-border)" borderRadius="16px" bg="var(--pf-surface-subtle)" gap={4} align="center">
                    <Flex w="39px" h="39px" borderRadius="12px" bg="var(--pf-accent-soft)" color={ACCENT} align="center" justify="center" flexShrink="0"><FiCreditCard size={18} /></Flex>
                    <Box flex="1"><Text fontSize="12px" fontWeight="700">Suscripción y consumo</Text><Text fontSize="11px" color="var(--pf-text-muted)" mt={1}>{hasSubscriptionServiceData ? subscription.plan : 'A la espera de Web Service.'}</Text></Box>
                    <Button size="sm" variant="ghost" color={ACCENT} onClick={() => setActive('suscripcion')}>Ver</Button>
                  </Flex>
                  <Flex p={5} border="1px solid var(--pf-border)" borderRadius="16px" bg="var(--pf-surface-subtle)" gap={4} align="center">
                    <Flex w="39px" h="39px" borderRadius="12px" bg="var(--pf-success-soft)" color="var(--pf-success-text)" align="center" justify="center" flexShrink="0"><FiShield size={18} /></Flex>
                    <Box flex="1"><Text fontSize="12px" fontWeight="700">Seguridad de cuenta</Text><Text fontSize="11px" color="var(--pf-text-muted)" mt={1}>Sesión local activa · {formatDateTime(lastAccess)}</Text></Box>
                    <Button size="sm" variant="ghost" color={ACCENT} onClick={() => setActive('seguridad')}>Revisar</Button>
                  </Flex>
                </SimpleGrid>
              </>
            )}

            {active === 'suscripcion' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">CUENTA Y CONTRATO</Text>
                <Heading fontSize={{ base: '28px', md: '34px' }} mt={1} letterSpacing="-.04em">Suscripción y consumo</Heading>
                <Text color="var(--pf-text-muted)" fontSize="13px" mt={1}>Consulta lo contratado, su vigencia y el uso de tu cuenta.</Text>
                {!hasSubscriptionServiceData && <Text mt={5} fontSize="12px" color="var(--pf-text-muted)">A la espera de Web Service.</Text>}
                <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={4} mt={6}>
                  <MetricCard icon={FiCreditCard} label="Plan contratado" value={subscription.plan || 'A la espera de Web Service.'} helper={hasSubscriptionServiceData ? 'Información de contrato' : undefined} />
                  <MetricCard icon={FiCalendar} label="Vigencia" value={subscription.endsAt ? formatDateTime(subscription.endsAt).split(',')[0] : 'A la espera de Web Service.'} helper={subscription.startedAt ? `Inicio: ${formatDateTime(subscription.startedAt).split(',')[0]}` : undefined} />
                  <MetricCard icon={FiUsers} label="Usuarios" value={subscription.seats || 'A la espera de Web Service.'} helper={subscription.seats ? 'Capacidad contratada' : undefined} />
                  <MetricCard icon={FiDownload} label="Descargas" value={subscription.downloadsUsed || downloads.length} helper={subscription.downloadsLimit ? `de ${subscription.downloadsLimit} contratadas` : 'Historial local de reportes'} />
                </SimpleGrid>
                <Box mt={5} p={{ base: 5, md: 6 }} border="1px solid var(--pf-border)" borderRadius="18px" bg="var(--pf-surface-subtle)">
                  <Flex justify="space-between" align="start" gap={4} direction={{ base: 'column', md: 'row' }}>
                    <Box><Text fontSize="14px" fontWeight="700">Detalle de contratación</Text>{!hasSubscriptionServiceData && <Text fontSize="11px" color="var(--pf-text-muted)" mt={1}>A la espera de Web Service.</Text>}</Box>
                    <Text fontSize="10px" px={2.5} py={1} borderRadius="full" bg={hasSubscriptionServiceData ? 'var(--pf-success-soft)' : 'var(--pf-accent-soft)'} color={hasSubscriptionServiceData ? 'var(--pf-success-text)' : ACCENT}>{hasSubscriptionServiceData ? 'Datos sincronizados' : 'A la espera de Web Service.'}</Text>
                  </Flex>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={5}>
                    {[
                      ['Inicio de suscripción', subscription.startedAt ? formatDateTime(subscription.startedAt).split(',')[0] : 'A la espera de Web Service.'],
                      ['Fin de suscripción', subscription.endsAt ? formatDateTime(subscription.endsAt).split(',')[0] : 'A la espera de Web Service.'],
                      ['Empresa titular', sessionUser.empresa || 'A la espera de Web Service.'],
                    ].map(([label, value]) => <Box key={label} p={4} borderRadius="13px" bg="var(--pf-surface)" border="1px solid var(--pf-border)"><Text fontSize="10px" fontWeight="700" color="var(--pf-text-muted)" textTransform="uppercase">{label}</Text><Text fontSize="12px" fontWeight="600" mt={1.5}>{value}</Text></Box>)}
                  </SimpleGrid>
                </Box>
              </>
            )}

            {active === 'seguridad' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">PROTECCIÓN DE CUENTA</Text>
                <Heading fontSize={{ base: '28px', md: '34px' }} mt={1} letterSpacing="-.04em">Seguridad y sesión</Heading>
                <Text color="var(--pf-text-muted)" fontSize="13px" mt={1}>Revisa el acceso de esta cuenta y toma acciones sobre tu sesión actual.</Text>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={6}>
                  <MetricCard icon={FiClock} label="Último acceso" value={formatDateTime(lastAccess)} helper="Registro local del navegador" />
                  <MetricCard icon={FiMonitor} label="Sesión actual" value={getBrowserLabel()} helper="Este dispositivo · activa ahora" />
                  <MetricCard icon={FiAlertTriangle} label="Actividad inusual" value="A la espera de Web Service." accent="#D97706" />
                </SimpleGrid>
                <Box mt={5} p={{ base: 5, md: 6 }} border="1px solid var(--pf-border)" borderRadius="18px" bg="var(--pf-surface-subtle)">
                  <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
                    <Flex gap={3} align="center"><Flex w="42px" h="42px" borderRadius="12px" bg="var(--pf-success-soft)" color="var(--pf-success-text)" align="center" justify="center"><FiCheckCircle size={20} /></Flex><Box><Text fontSize="13px" fontWeight="700">Este dispositivo</Text><Text fontSize="11px" color="var(--pf-text-muted)">{getBrowserLabel()} · Sesión activa</Text></Box></Flex>
                    <Text fontSize="10px" px={2.5} py={1} borderRadius="full" bg="var(--pf-success-soft)" color="var(--pf-success-text)">ACTIVA AHORA</Text>
                  </Flex>
                  <Flex mt={5} pt={5} borderTop="1px solid var(--pf-border)" gap={3} justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                    <Box><Text fontSize="12px" fontWeight="600">Cerrar sesiones</Text><Text fontSize="11px" color="var(--pf-text-muted)" mt={1}>A la espera de Web Service.</Text></Box>
                    <Button colorScheme="red" variant="outline" borderColor="var(--pf-danger-text)" color="var(--pf-danger-text)" onClick={() => setConfirmCloseSessions(true)}><FiLogOut /> Cerrar sesiones</Button>
                  </Flex>
                  {confirmCloseSessions && <Flex mt={4} p={4} borderRadius="13px" bg="var(--pf-danger-soft)" gap={3} align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }}><Text flex="1" fontSize="12px" color="var(--pf-danger-text)">Se cerrará tu sesión en este navegador y volverás al acceso.</Text><HStack><Button size="sm" variant="ghost" onClick={() => setConfirmCloseSessions(false)}>Cancelar</Button><Button size="sm" bg="#DC2626" color="white" _hover={{ bg: '#B91C1C' }} onClick={closeAllSessions}>Cerrar ahora</Button></HStack></Flex>}
                </Box>
                <Flex mt={4} p={4} bg="var(--pf-surface-muted)" borderRadius="13px" gap={3} align="center"><FiKey color={ACCENT} /><Text fontSize="11px" color="var(--pf-text-muted)">A la espera de Web Service.</Text></Flex>
              </>
            )}

            {active === 'preferencias' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">CONFIGURACIÓN DE ALERTAS</Text>
                <Heading fontSize={{ base: '25px', md: '30px' }} mt={1} letterSpacing="-.04em">Preferencias de notificaciones</Heading>
                <Text color="var(--pf-text-muted)" fontSize="12px" mt={1}>Todo se entrega en la campana de la barra superior.</Text>

                <SimpleGrid columns={{ base: 1, lg: 3 }} gap={3} mt={4}>
                  <NotificationPreferenceCard icon={FiBell} title="Nuevas obras" detail="Obras que coincidan con tu mercado." checked={preferences.newProjects}
                    onChange={() => setPreferences((current) => ({ ...current, newProjects: !current.newProjects }))}
                    criteria={preferences.projectCriteria || EMPTY_CRITERIA} onConfigure={() => setCriteriaEditor('projects')} />
                  <NotificationPreferenceCard icon={FiFileText} title="Licitaciones nuevas" detail="Convocatorias que coincidan con tu mercado." checked={preferences.newTenders}
                    onChange={() => setPreferences((current) => ({ ...current, newTenders: !current.newTenders }))}
                    criteria={preferences.tenderCriteria || EMPTY_CRITERIA} onConfigure={() => setCriteriaEditor('tenders')} />
                  <Box p={4} border="1px solid var(--pf-border)" borderRadius="15px" bg="var(--pf-surface-subtle)">
                    <Flex gap={3} align="center">
                      <Flex w="34px" h="34px" borderRadius="10px" bg="var(--pf-accent-soft)" color={ACCENT} align="center" justify="center"><FiDownload size={17} /></Flex>
                      <Box flex="1"><Text fontSize="13px" fontWeight="700">Resumen de consumo mensual</Text><Text mt={.5} fontSize="10px" color="var(--pf-text-muted)">Corte de descargas y reportes del mes.</Text></Box>
                      <Box as="button" type="button" role="switch" aria-checked={preferences.monthlyUsageSummary} aria-label="Resumen de consumo mensual"
                        onClick={() => setPreferences((current) => ({ ...current, monthlyUsageSummary: !current.monthlyUsageSummary }))} w="40px" h="23px" p="3px" borderRadius="full" bg={preferences.monthlyUsageSummary ? ACCENT : 'var(--pf-border-strong)'}>
                        <Box w="17px" h="17px" borderRadius="full" bg="white" transform={preferences.monthlyUsageSummary ? 'translateX(17px)' : 'translateX(0)'} transition="transform .18s ease" />
                      </Box>
                    </Flex>
                    <Box mt={3} p={3} borderRadius="10px" bg="var(--pf-surface)"><Text fontSize="10px" color="var(--pf-text-muted)">En la campana verás el total de descargas del mes.</Text><Text mt={1} fontSize="11px" color="var(--pf-text-muted)">Incluye reportes de obras y licitaciones.</Text></Box>
                  </Box>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, lg: 3 }} gap={3} mt={3}>
                  <ToggleRow icon={FiTrendingUp} title="Radar semanal" detail="Resumen de coincidencias." checked={preferences.weeklyBrief} onChange={() => setPreferences((current) => ({ ...current, weeklyBrief: !current.weeklyBrief }))} />
                  <ToggleRow icon={FiActivity} title="Cambios relevantes" detail="Inversión, etapa, fecha y ubicación." checked={preferences.relevantChanges} onChange={() => setPreferences((current) => ({ ...current, relevantChanges: !current.relevantChanges }))} />
                  <ToggleRow icon={FiUsers} title="Actividad de empresas" detail="Nuevos movimientos y contactos." checked={preferences.companyActivity} onChange={() => setPreferences((current) => ({ ...current, companyActivity: !current.companyActivity }))} />
                </SimpleGrid>

                <Flex mt={4} align="center" justify="space-between" gap={3}>
                  <Text fontSize="11px" color={preferencesSaved ? 'var(--pf-success-text)' : 'var(--pf-text-muted)'}>{preferencesSaved ? 'Preferencias guardadas.' : 'Guarda para actualizar la campana.'}</Text>
                  <Button bg={ACCENT} color="white" _hover={{ bg: '#E95734' }} onClick={savePreferences}><FiCheck /> Guardar configuración</Button>
                </Flex>
              </>
            )}

            {active === 'actividad' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">TRAZABILIDAD</Text>
                <Heading fontSize={{ base: '28px', md: '34px' }} mt={1} letterSpacing="-.04em">Actividad y auditoría</Heading>
                <Text color="var(--pf-text-muted)" fontSize="13px" mt={1}>Una vista clara de cambios y acciones realizadas desde esta cuenta.</Text>
                <Flex mt={6} p={4} gap={3} borderRadius="14px" bg="var(--pf-surface-muted)" align="center"><FiLock color={ACCENT} /><Text fontSize="11px" color="var(--pf-text-muted)">A la espera de Web Service.</Text></Flex>
                <Box mt={5} border="1px solid var(--pf-border)" borderRadius="17px" overflow="hidden" bg="var(--pf-surface-subtle)">
                  <Flex p={4} borderBottom="1px solid var(--pf-border)" justify="space-between" align="center"><Text fontSize="13px" fontWeight="700">Actividad reciente</Text><Text fontSize="11px" color="var(--pf-text-muted)">{activityLog.length + downloads.length} eventos disponibles</Text></Flex>
                  <Stack p={4} gap={0}>
                    <Flex py={3} gap={3} borderBottom={activityLog.length || downloads.length ? '1px solid var(--pf-border)' : '0'}><Flex w="31px" h="31px" borderRadius="10px" bg="var(--pf-accent-soft)" color={ACCENT} align="center" justify="center" flexShrink="0"><FiClock size={15} /></Flex><Box><Text fontSize="12px" fontWeight="600">Acceso a Perfil</Text><Text fontSize="11px" color="var(--pf-text-muted)">Último acceso local: {formatDateTime(lastAccess)}</Text></Box></Flex>
                    {activityLog.map((item) => <Flex key={item.id} py={3} gap={3} borderBottom="1px solid var(--pf-border)"><Flex w="31px" h="31px" borderRadius="10px" bg="var(--pf-surface-muted)" color={ACCENT} align="center" justify="center" flexShrink="0">{item.icon === 'security' ? <FiShield size={15} /> : item.icon === 'insight' ? <FiCpu size={15} /> : <FiSettings size={15} />}</Flex><Box><Text fontSize="12px" fontWeight="600">{item.title}</Text><Text fontSize="11px" color="var(--pf-text-muted)">{item.description} · {formatDateTime(item.date)}</Text></Box></Flex>)}
                    {downloads.slice(0, 6).map((item) => <Flex key={`download-${item.id}`} py={3} gap={3} borderBottom="1px solid var(--pf-border)"><Flex w="31px" h="31px" borderRadius="10px" bg="var(--pf-success-soft)" color="var(--pf-success-text)" align="center" justify="center" flexShrink="0"><FiDownload size={15} /></Flex><Box><Text fontSize="12px" fontWeight="600">Reporte descargado</Text><Text fontSize="11px" color="var(--pf-text-muted)">{item.name} · {item.date}</Text></Box></Flex>)}
                    {!activityLog.length && !downloads.length && <EmptyAudit icon={FiActivity}>Aún no hay actividad para mostrar. Tus acciones de cuenta y descargas aparecerán aquí.</EmptyAudit>}
                  </Stack>
                </Box>
              </>
            )}

            {active === 'insights' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">ANALÍTICA DE CUENTA</Text>
                <Heading fontSize={{ base: '28px', md: '34px' }} mt={1} letterSpacing="-.04em">BIMSA Pulse</Heading>
                <Text color="var(--pf-text-muted)" fontSize="13px" mt={1}>La capa de lectura que resume las señales de tu cuenta y prepara el Radar semanal de oportunidades.</Text>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={6}>
                  <MetricCard icon={FiDownload} label="Reportes locales" value={downloads.length} helper="En tu historial disponible" />
                  <MetricCard icon={FiSliders} label="Criterios configurados" value={radarCriteriaCount || 'Sin definir'} helper={radarCriteriaCount ? 'El Radar aplicará estas reglas' : 'Configúralos en Radar semanal'} />
                  <MetricCard icon={FiBell} label="Señales activas" value={radarSignalsCount} helper="Obras, licitaciones, cambios y empresas" />
                </SimpleGrid>
                <Box mt={5} p={{ base: 5, md: 6 }} borderRadius="18px" bg="linear-gradient(135deg, #293B60 0%, #354B77 100%)" color="white" position="relative" overflow="hidden">
                  <Box position="absolute" right="-28px" bottom="-45px" opacity=".12"><FiCpu size={180} /></Box>
                  <Flex position="relative" justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
                    <Box>
                      <Flex gap={2} align="center" color="#FFC0AC"><FiZap /><Text fontSize="11px" fontWeight="700" letterSpacing=".1em">VISTA PREVIA DEL RADAR</Text></Flex>
                      <Text mt={3} fontSize="15px" lineHeight="1.55">{brief || 'Genera una vista previa local para comprobar qué señales y criterios usaría el Radar semanal.'}</Text>
                    </Box>
                    <Button bg="white" color="#273959" _hover={{ bg: '#F5F7FB' }} onClick={generateRadarPreview} flexShrink="0"><FiRefreshCw /> Generar vista previa</Button>
                  </Flex>
                </Box>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mt={4}>
                  <Box p={5} border="1px solid var(--pf-border)" borderRadius="16px" bg="var(--pf-surface-subtle)"><Flex gap={2} align="center"><FiTrendingUp color={ACCENT} /><Text fontSize="13px" fontWeight="700">Radar semanal de oportunidades · V1</Text></Flex><Text mt={2} fontSize="11px" color="var(--pf-text-muted)">Un resumen regido por reglas visibles: novedades, cambios, actividad de empresas y contactos. Cada resultado explicará por qué coincide y ofrecerá acciones directas para revisarlo o compartirlo.</Text></Box>
                  <Box p={5} border="1px solid var(--pf-border)" borderRadius="16px" bg="var(--pf-surface-subtle)"><Flex gap={2} align="center"><FiCpu color={ACCENT} /><Text fontSize="13px" fontWeight="700">Evolución con IA</Text></Flex><Text mt={2} fontSize="11px" color="var(--pf-text-muted)">A la espera de Web Service.</Text></Box>
                </SimpleGrid>
                <Text mt={4} fontSize="10px" color="var(--pf-text-muted)">A la espera de Web Service.</Text>
              </>
            )}

            {active === 'descargas' && (
              <>
                <Text color={ACCENT} fontSize="11px" fontWeight="700" letterSpacing=".12em">ACTIVIDAD</Text>
                <Heading fontSize="30px" mt={1}>Historial de descargas</Heading>
                <Text color="var(--pf-text-muted)" fontSize="13px" mt={1}>Consulta y vuelve a abrir los reportes disponibles en esta cuenta.</Text>
                <Stack mt={7} gap={2}>
                  {downloads.length ? downloads.map((item) => (
                    <Flex key={item.id} p={4} border="1px solid var(--pf-border)" bg="var(--pf-surface-subtle)" borderRadius="14px" align="center" gap={4}>
                      <Flex w="42px" h="42px" bg={item.type === 'PDF' ? 'var(--pf-accent-soft)' : 'var(--pf-success-soft)'} color={item.type === 'PDF' ? ACCENT : 'var(--pf-success-text)'}
                        borderRadius="12px" align="center" justify="center"><FiFileText /></Flex>
                      <Box flex="1"><Text fontSize="13px" fontWeight="700">{item.name}</Text><Text fontSize="11px" color="var(--pf-text-muted)">{item.date}</Text></Box>
                      {item.size && item.size !== 'Generado' && (
                        <Text fontSize="11px" color="var(--pf-text-muted)" display={{ base: 'none', md: 'block' }}>{item.size}</Text>
                      )}
                      <Text fontSize="10px" px={2.5} py={1} bg="var(--pf-surface-muted)" borderRadius="full">{item.type}</Text>
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
                  )) : <Text color="var(--pf-text-muted)">Todavía no hay descargas registradas.</Text>}
                </Stack>
                <Flex mt={5} p={4} bg="var(--pf-surface-muted)" borderRadius="12px" gap={3} align="center">
                  <FiMapPin color={ACCENT} /><Text fontSize="11px" color="var(--pf-text-muted)">El historial se guarda durante 12 meses y se actualiza al generar un reporte.</Text>
                </Flex>
              </>
            )}
            </Box>
          </Box>
        </Flex>
      </Flex>
      {editing !== undefined && <UserModal initial={editing} onClose={() => setEditing(undefined)} onSave={saveUser} />}
      {criteriaEditor === 'projects' && (
        <CriteriaModal title="Nuevas obras" icon={FiBell} initialCriteria={preferences.projectCriteria}
          onClose={() => setCriteriaEditor(null)}
          onSave={(criteria) => saveNotificationCriteria('projectCriteria', criteria)} />
      )}
      {criteriaEditor === 'tenders' && (
        <CriteriaModal title="Licitaciones nuevas" icon={FiFileText} initialCriteria={preferences.tenderCriteria}
          onClose={() => setCriteriaEditor(null)}
          onSave={(criteria) => saveNotificationCriteria('tenderCriteria', criteria)} />
      )}
    </Box>
  );

  if (embedded) return profileView;

  return (
    <Box h="100dvh" bg="var(--pf-page-bg)" color={NAVY} p={3} overflow="hidden" style={profileTheme}>
      {profileView}
    </Box>
  );
}
