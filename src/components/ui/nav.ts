// Datos de navegación (solo datos planos, sin componentes)
// Los íconos se resuelven en el Client Component

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Nombre del ícono de Lucide
  /** false => módulo pendiente de implementación; se muestra deshabilitado */
  available: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { label: "Panel", href: "/", icon: "LayoutDashboard", available: true },
      { label: "Inventario de activos", href: "/activos", icon: "Boxes", available: true },
      { label: "Riesgos", href: "/riesgos", icon: "ShieldAlert", available: true },
      { label: "Controles", href: "/controles", icon: "ShieldCheck", available: false },
      { label: "Seguimiento", href: "/seguimiento", icon: "ClipboardList", available: false },
    ],
  },
  {
    title: "Análisis",
    items: [
      { label: "Análisis y decisiones", href: "/analisis", icon: "BarChart3", available: false },
      { label: "Reportes y Excel", href: "/reportes", icon: "FileSpreadsheet", available: false },
      { label: "Fuentes y evidencias", href: "/fuentes", icon: "BookMarked", available: false },
    ],
  },
  {
    title: "Administración",
    items: [{ label: "Configuración", href: "/configuracion", icon: "Settings", available: true }],
  },
];
