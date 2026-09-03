import { Flex, Grid } from '@chakra-ui/react';
import {
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiStar,
  FiUsers,
} from 'react-icons/fi';
import { SummaryMetricCard } from '../../pages/App/PanelResumen';

export default function LicitacionesSummary({ metrics, dateLabel }) {
  const cards = [
    ['Registros', new Intl.NumberFormat('es-MX').format(metrics.records), FiBriefcase, '#2854C5', 'rgba(40, 84, 197, .11)'],
    ['Monto contratado', new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
    }).format(metrics.amount), FiDollarSign, '#D95B27', 'rgba(217, 91, 39, .11)'],
    ['Instituciones', new Intl.NumberFormat('es-MX').format(metrics.institutions), FiUsers, '#16835B', 'rgba(22, 131, 91, .11)'],
    ['Contrato verificado', `${metrics.verifiedPercent}%`, FiCheckCircle, '#2854C5', 'rgba(40, 84, 197, .11)'],
    ['Criterio de fecha', dateLabel, FiCalendar, '#536174', 'rgba(83, 97, 116, .11)'],
    ['Seguidas', new Intl.NumberFormat('es-MX').format(metrics.followed), FiStar, '#A16207', 'rgba(217, 165, 20, .14)'],
  ];

  return (
    <Flex minW={0} w="100%" overflowX="auto">
      <Grid
        minW="900px"
        w="100%"
        templateColumns="132px minmax(205px, 1.35fr) 142px 160px minmax(190px, 1.1fr) 132px"
        gap={2}
      >
        {cards.map(([label, value, icon, iconColor, iconBackground]) => (
          <SummaryMetricCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            iconColor={iconColor}
            iconBackground={iconBackground}
          />
        ))}
      </Grid>
    </Flex>
  );
}
