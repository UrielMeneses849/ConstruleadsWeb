import { copyFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const outputDirectory = resolve(process.argv[2] || 'dist');
const entryFile = join(outputDirectory, 'index.html');
const physicalRoutes = [
  'beneficios',
  'audiencia',
  'perfil',
  'laboratorio-obras',
  'construleads',
  join('construleads', 'proyectos'),
  join('construleads', 'proyectos', 'mapa'),
  join('construleads', 'proyectos', 'resultados'),
  join('construleads', 'proyectos', 'graficas'),
  join('construleads', 'companias'),
  join('construleads', 'licitaciones'),
  join('construleads', 'analytics-std'),
  join('construleads', 'perfil'),
  join('construleads', 'laboratorio-obras'),
];

await copyFile(entryFile, join(outputDirectory, '404.html'));

for (const route of physicalRoutes) {
  const routeDirectory = join(outputDirectory, route);
  await mkdir(routeDirectory, { recursive: true });
  await copyFile(entryFile, join(routeDirectory, 'index.html'));
}

console.log(`SPA fallbacks preparados en ${outputDirectory}`);
