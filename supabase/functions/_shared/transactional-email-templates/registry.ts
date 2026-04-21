/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export type TemplateData = Record<string, unknown>

export interface TemplateEntry {
  component: React.ComponentType<TemplateData>
  subject: string | ((data: TemplateData) => string)
  to?: string
  displayName?: string
  previewData?: TemplateData
}

import { template as reportPdfReady } from './report-pdf-ready.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'report-pdf-ready': reportPdfReady,
}
