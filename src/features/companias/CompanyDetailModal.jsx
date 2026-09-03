import { useEffect, useMemo } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import {
  FiBarChart2,
  FiBriefcase,
  FiExternalLink,
  FiGlobe,
  FiLayers,
  FiLinkedin,
  FiMail,
  FiMapPin,
  FiPhone,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi';

import { formatCompactInvestment, formatNumber } from './companyData';

const genreColors = ['#D95B27', '#D95B27', '#7350AC', '#279B91', '#4F7BC8'];

function getDistribution(items, field) {
  const total = items.length || 1;
  const counts = new Map();
  items.forEach((item) => {
    const value = String(item?.[field] || '').trim() || 'Sin especificar';
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value, percent: Math.round((value / total) * 100) }))
    .sort((first, second) => second.value - first.value)
    .slice(0, 4);
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <Flex className="company-detail-metric" align="center" gap={2}>
      <Flex className="company-detail-icon" align="center" justify="center"><Icon size={15} /></Flex>
      <Box minW={0}>
        <Text className="company-detail-metric-value">{value}</Text>
        <Text className="company-detail-metric-label">{label}{hint ? ` · ${hint}` : ''}</Text>
      </Box>
    </Flex>
  );
}

function Distribution({ title, icon: Icon, items, colorOffset = 0, emptyText }) {
  return (
    <Box className="company-detail-card company-detail-distribution">
      <Flex align="center" gap={2} mb={3}>
        <Flex className="company-detail-section-icon" align="center" justify="center"><Icon size={14} /></Flex>
        <Text className="company-detail-section-title">{title}</Text>
      </Flex>
      {items.length ? items.map((item, index) => (
        <Box key={item.label} className="company-detail-distribution-row" mb={index === items.length - 1 ? 0 : 2.5}>
          <Flex justify="space-between" gap={3} mb={1}>
            <Text className="company-detail-bar-label" lineClamp={1}>{item.label}</Text>
            <Text className="company-detail-bar-value">{item.value} · {item.percent}%</Text>
          </Flex>
          <progress
            className={`company-detail-progress company-detail-progress-${(index + colorOffset) % genreColors.length}`}
            value={item.percent}
            max="100"
            aria-label={`${item.label}: ${item.percent}%`}
          />
        </Box>
      )) : <Text className="company-detail-empty-copy">{emptyText}</Text>}
    </Box>
  );
}

function ContactEmpty({ icon: Icon }) {
  return (
    <Flex className="company-detail-contact-empty" align="center" justify="center" gap={2.5}>
      <Flex className="company-detail-empty-icon" align="center" justify="center"><Icon size={15} /></Flex>
      <Text className="company-detail-contact-pending">A la espera de Web Service.</Text>
    </Flex>
  );
}

function DatasetContact({ contact }) {
  const detail = [contact.role || 'Contacto registrado', contact.extension && `Ext. ${contact.extension}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box className="company-detail-contact-row">
      <Flex align="center" gap={2} minW={0}>
        <Flex className="company-detail-contact-avatar" align="center" justify="center">
          {contact.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}
        </Flex>
        <Box minW={0} flex="1">
          <Text className="company-detail-contact-name" lineClamp={1}>{contact.name}</Text>
          <Text className="company-detail-contact-role" lineClamp={1}>{detail}</Text>
        </Box>
      </Flex>
      <Flex className="company-detail-contact-actions" gap={1}>
        {contact.email && <Box as="a" href={`mailto:${contact.email}`} aria-label={`Enviar correo a ${contact.name}`}><FiMail size={13} /></Box>}
        {contact.phone && <Box as="a" href={`tel:${contact.phone}`} aria-label={`Llamar a ${contact.name}`}><FiPhone size={13} /></Box>}
      </Flex>
    </Box>
  );
}

function LinkedInContact({ contact }) {
  const content = (
    <>
      <Flex className="company-detail-linkedin-mark" align="center" justify="center"><FiLinkedin size={15} /></Flex>
      <Box minW={0} flex="1">
        <Text className="company-detail-contact-name" lineClamp={1}>{contact.name}</Text>
        <Text className="company-detail-contact-role" lineClamp={1}>{contact.role || 'Perfil profesional'}</Text>
      </Box>
      {contact.url && <FiExternalLink size={14} color="#0A66C2" />}
    </>
  );

  return contact.url ? (
    <Box as="a" href={contact.url} target="_blank" rel="noreferrer" className="company-detail-linkedin-row">{content}</Box>
  ) : <Flex className="company-detail-linkedin-row">{content}</Flex>;
}

export default function CompanyDetailModal({ company, onClose }) {
  const genreDistribution = useMemo(() => getDistribution(company?.projects || [], 'genero'), [company]);
  const regionDistribution = useMemo(() => getDistribution(company?.projects || [], 'region'), [company]);
  const stageDistribution = useMemo(() => getDistribution(company?.projects || [], 'etapa'), [company]);
  const representativeProject = company?.projects?.[0];
  const companyAddress = company?.addresses?.[0]?.formatted || representativeProject?.localizacion || representativeProject?.estado || 'Sin domicilio registrado';
  const companyPhones = company?.phones || [];
  const companyRoles = company?.roles?.join(' · ') || 'Sin rol registrado';
  const companyIdentifiers = [
    company?.rfc && `RFC ${company.rfc}`,
    company?.clave && `Clave ${company.clave}`,
  ].filter(Boolean).join(' · ');
  const hasManyDatasetContacts = company?.datasetContacts?.length > 5;

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (!company) return null;

  return (
    <Flex className="company-detail-overlay" align="center" justify="center" p={{ base: 2, lg: 5 }} onMouseDown={onClose}>
      <Box
        className="company-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Flex className="company-detail-header" align="center" gap={4}>
          <Flex className="company-detail-company-mark" align="center" justify="center"><FiBriefcase size={22} /></Flex>
          <Box minW={0} flex="1">
            <Flex align="center" gap={2}>
              <Text id="company-detail-title" className="company-detail-title" lineClamp={1}>{company.name}</Text>
              <Box className="company-detail-status">Perfil de empresa</Box>
            </Flex>
            <Text className="company-detail-id">{companyIdentifiers || 'Sin identificadores registrados'}</Text>
          </Box>
          <Box as="button" type="button" className="company-detail-close" onClick={onClose} aria-label="Cerrar detalle de compañía"><FiX size={20} /></Box>
        </Flex>

        <Box className="company-detail-body">
          <Flex className="company-detail-metrics" gap={2.5}>
            <Metric icon={FiLayers} label="Proyectos" value={formatNumber(company.projectCount)} />
            <Metric icon={FiTrendingUp} label="Inversión total" value={formatCompactInvestment(company.totalInvestment)} />
            <Metric icon={FiMapPin} label="Estados" value={formatNumber(company.stateCount)} />
            <Metric icon={FiBarChart2} label="Superficie" value={formatNumber(company.totalSurface)} hint="m²" />
          </Flex>

          <Box className="company-detail-main-grid">
            <Box className="company-detail-analysis">
              <Flex className="company-detail-insight" align="center" gap={3}>
                <Flex className="company-detail-insight-icon" align="center" justify="center"><FiTrendingUp size={17} /></Flex>
                <Text className="company-detail-insight-text" lineClamp={2}>
                  {company.projectCount} proyectos activos en {company.stateCount || 1} {company.stateCount === 1 ? 'estado' : 'estados'}, con mayor presencia en {regionDistribution[0]?.label || 'la región disponible'}.
                </Text>
              </Flex>

              <Box className="company-detail-card company-detail-profile-card">
                <Flex align="center" gap={2} mb={3}><Flex className="company-detail-section-icon" align="center" justify="center"><FiBriefcase size={14} /></Flex><Text className="company-detail-section-title">Perfil de compañía</Text></Flex>
                <Flex className="company-detail-profile-list" direction="column" gap={2}>
                  <Flex justify="space-between" gap={3}><Text>Rol</Text><Text lineClamp={1} title={companyRoles}>{companyRoles}</Text></Flex>
                  <Flex justify="space-between" gap={3}><Text>Domicilio</Text><Text lineClamp={1} title={companyAddress}>{companyAddress}</Text></Flex>
                  {!!companyPhones.length && <Flex justify="space-between" gap={3}><Text>Teléfonos</Text><Text lineClamp={1} title={companyPhones.join(' · ')}>{companyPhones.join(' · ')}</Text></Flex>}
                  {company.websites[0] && <Flex justify="space-between" gap={3}><Text>Sitio web</Text><Box as="a" href={company.websites[0]} target="_blank" rel="noreferrer" className="company-detail-website"><FiGlobe size={12} /> Visitar</Box></Flex>}
                </Flex>
                {!!company.states?.length && <>
                  <Flex className="company-detail-profile-coverage" justify="space-between" gap={3}>
                    <Text>Cobertura</Text><Text>{company.stateCount} {company.stateCount === 1 ? 'estado' : 'estados'}</Text>
                  </Flex>
                  <Flex className="company-detail-state-list" wrap="wrap">
                    {company.states.slice(0, 4).map((state) => <Text key={state} className="company-detail-state-pill">{state}</Text>)}
                    {company.states.length > 4 && <Text className="company-detail-state-pill">+{company.states.length - 4}</Text>}
                  </Flex>
                </>}
              </Box>

              <Box className="company-detail-charts-grid">
                <Distribution title="Especialización por género" icon={FiBarChart2} items={genreDistribution} emptyText="Sin género registrado." />
                <Distribution title="Cobertura por región" icon={FiMapPin} items={regionDistribution} colorOffset={2} emptyText="Sin región registrada." />
              </Box>

              <Box className="company-detail-card company-detail-stages">
                <Flex align="center" gap={2} mb={2.5}>
                  <Flex className="company-detail-section-icon" align="center" justify="center"><FiLayers size={14} /></Flex>
                  <Text className="company-detail-section-title">Pipeline por etapa</Text>
                </Flex>
                <Flex className="company-detail-stages-grid">
                  {stageDistribution.length ? stageDistribution.map((stage, index) => (
                    <Box key={stage.label} className={`company-detail-stage company-detail-stage-${index % genreColors.length}`} flex="1">
                      <Text className="company-detail-stage-count">{stage.value}</Text>
                      <Text className="company-detail-stage-label" lineClamp={2}>{stage.label}</Text>
                    </Box>
                  )) : <Text className="company-detail-empty-copy">Sin etapa registrada.</Text>}
                </Flex>
              </Box>
            </Box>

            <Box className="company-detail-contacts-column">
              <Box className={`company-detail-card company-detail-contacts-card company-detail-dataset-card${hasManyDatasetContacts ? ' company-detail-contacts-card-scrollable' : ''}`}>
                <Flex align="center" justify="space-between" mb={2.5}>
                  <Flex align="center" gap={2}><Flex className="company-detail-section-icon" align="center" justify="center"><FiUsers size={14} /></Flex><Text className="company-detail-section-title">Contactos del dataset</Text></Flex>
                  <Text className="company-detail-count">{company.datasetContacts.length}</Text>
                </Flex>
                <Box className="company-detail-contact-list">
                  {company.datasetContacts.length
                    ? company.datasetContacts.map((contact) => <DatasetContact key={contact.key} contact={contact} />)
                    : <ContactEmpty icon={FiUsers} />}
                </Box>
              </Box>

              <Box className="company-detail-card company-detail-contacts-card company-detail-linkedin-card">
                <Flex align="center" justify="space-between" mb={2.5}>
                  <Flex align="center" gap={2}><Flex className="company-detail-section-icon company-detail-linkedin-icon" align="center" justify="center"><FiLinkedin size={14} /></Flex><Text className="company-detail-section-title">Contactos en LinkedIn</Text></Flex>
                  <Text className="company-detail-count company-detail-linkedin-count">{company.linkedinContacts.length}</Text>
                </Flex>
                <Box className="company-detail-contact-list">
                  {company.linkedinContacts.length
                    ? company.linkedinContacts.map((contact) => <LinkedInContact key={contact.key} contact={contact} />)
                    : <ContactEmpty icon={FiLinkedin} />}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}
