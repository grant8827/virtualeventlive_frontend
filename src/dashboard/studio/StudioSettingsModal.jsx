import { useRef } from 'react'

const CORNERS = [
  ['top-left', 'Top Left'],
  ['top-right', 'Top Right'],
  ['bottom-left', 'Bottom Left'],
  ['bottom-right', 'Bottom Right'],
]

// A tabbed settings dialog for the studio — logo/watermark is the first tab,
// with room to add more (overlays, output settings, etc.) alongside it later.
export default function StudioSettingsModal({
  activeTab,
  onTabChange,
  onClose,
  logoEnabled,
  logoPosition,
  logoPreviewUrl,
  onToggleLogo,
  onChangeLogoPosition,
  onUploadLogo,
  onRemoveLogo,
}) {
  const fileInputRef = useRef(null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-black text-white tracking-tight">Studio Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-5">
          <button
            onClick={() => onTabChange('logo')}
            className={`text-xs font-semibold px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'logo'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            🖼 Logo / Watermark
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'logo' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Upload a logo to overlay on the Program output. It's baked into the actual
                  broadcast frame, not just the local preview.
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg bg-black border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="Logo preview" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-700 text-2xl">🖼</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      {logoPreviewUrl ? 'Replace Image' : 'Upload Image'}
                    </button>
                    {logoPreviewUrl && (
                      <button
                        onClick={onRemoveLogo}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium text-left"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    onUploadLogo(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {logoPreviewUrl && (
                <>
                  <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                    <span className="text-xs text-gray-400 font-medium">Show on Program</span>
                    <button
                      onClick={onToggleLogo}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        logoEnabled ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {logoEnabled ? 'Visible' : 'Hidden'}
                    </button>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Position</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CORNERS.map(([pos, label]) => (
                        <button
                          key={pos}
                          onClick={() => onChangeLogoPosition(pos)}
                          className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all duration-300 ${
                            logoPosition === pos
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
