'use client'

import type { TenantBranding } from '@/types/tenant'
import { Eye, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

interface TenantBrandingEditorProps {
  branding: TenantBranding
  onUpdateLogo: (file: File) => Promise<void>
  onUpdateColors: (
    colors: Partial<Pick<TenantBranding, 'primaryColor' | 'secondaryColor' | 'accentColor'>>
  ) => Promise<void>
  onPreview: () => Promise<string>
  onReset: () => Promise<void>
  isLoading?: boolean
}

export function TenantBrandingEditor({
  branding,
  onUpdateLogo,
  onUpdateColors,
  onPreview,
  onReset,
  isLoading,
}: TenantBrandingEditorProps) {
  const [colors, setColors] = useState({
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await onUpdateLogo(file)
    }
  }

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveColors = async () => {
    await onUpdateColors(colors)
  }

  const handlePreview = async () => {
    const url = await onPreview()
    setPreviewUrl(url)
  }

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <h3 className="mb-4 text-lg font-medium text-white">Logo</h3>
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-zinc-600 bg-zinc-900">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="h-20 w-20 object-contain" />
            ) : (
              <Upload className="h-8 w-8 text-zinc-500" />
            )}
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              Upload Logo
            </button>
            <p className="mt-2 text-xs text-zinc-500">PNG, JPG, or SVG. Max 2MB.</p>
          </div>
        </div>
      </div>

      {/* Colors Section */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <h3 className="mb-4 text-lg font-medium text-white">Brand Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          <ColorPicker
            label="Primary"
            value={colors.primaryColor}
            onChange={(v) => handleColorChange('primaryColor', v)}
          />
          <ColorPicker
            label="Secondary"
            value={colors.secondaryColor}
            onChange={(v) => handleColorChange('secondaryColor', v)}
          />
          <ColorPicker
            label="Accent"
            value={colors.accentColor}
            onChange={(v) => handleColorChange('accentColor', v)}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSaveColors}
            disabled={isLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Save Colors
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          <Eye className="h-4 w-4" /> Preview
        </button>
        <button
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          <RotateCcw className="h-4 w-4" /> Reset to Default
        </button>
      </div>

      {previewUrl && (
        <div className="rounded-lg border border-zinc-700 p-4">
          <iframe src={previewUrl} className="h-96 w-full rounded-lg" title="Branding Preview" />
        </div>
      )}
    </div>
  )
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-zinc-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}
