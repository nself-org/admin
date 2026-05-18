/**
 * Dashboard Library — re-exports the LokiJS-backed implementation.
 *
 * All dashboard state is persisted to nadmin.db via the real implementation
 * in ../dashboards.ts. This module exists as a convenience re-export.
 */

export {
  addWidget,
  cloneDashboard,
  createDashboard,
  deleteWidget,
  getDashboardStats,
  getWidgetTemplatesByCategory,
  removeWidget,
  updateDashboard,
  updateWidget,
} from '../dashboards'

export type {
  Dashboard,
  DashboardStats,
  Widget,
  WidgetConfig,
  WidgetTemplate,
} from '@/types/dashboard'
