import {
  LayoutDashboard,
  Boxes,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  FileSpreadsheet,
  BookMarked,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
      { label: "Panel", href: "/", icon: LayoutDashboard, available: true },
      { label: "Inventario de activos", href: "/activos", icon: Boxes, available: true },
      { label: "Riesgos", href: "/riesgos", icon: ShieldAlert, available: false },
      { label: "Controles", href: "/controles", icon: ShieldCheck, available: false },
      { label: "Seguimiento", href: "/seguimiento", icon: ClipboardList, available: false },
    ],
  },
  {
    title: "Análisis",
    items: [
      { label: "Análisis y decisiones", href: "/analisis", icon: BarChart3, available: false },
      { label: "Reportes y Excel", href: "/reportes", icon: FileSpreadsheet, available: false },
      { label: "Fuentes y evidencias", href: "/fuentes", icon: BookMarked, available: false },
    ],
  },
  {
    title: "Administración",
    items: [{ label: "Configuración", href: "/configuracion", icon: Settings, available: true }],
  },
];
