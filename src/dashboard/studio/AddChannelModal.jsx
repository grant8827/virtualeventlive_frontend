import { useState, useEffect, useRef } from 'react'

const TYPES = [
  { id: 'camera', label: 'Camera', icon: '📷' },
  { id: 'screen', label: 'Screen Share', icon: '🖥' },
  { id: 'image', label: 'Image', icon: '🖼' },
  { id: 'audio', label: 'Audio Only', icon: '🎤' },
]

// Live preview of a captured screen-share stream, shown before it's
// committed as a channel.
function ScreenPreview({ stream }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])
  return <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
}

// A sidebar-tabbed "add a channel" flow — each source type gets its own
// setup panel (label + a device picker or capture step) instead of a flat
// list of buttons, so every type is configured and (where possible) previewed
// before it's actually added.
export default function AddChannelModal({ hasAudioSource, adding, onAddCamera, onAddScreen, onAddImage, onAddAudio, onClose }) {
  const [activeType, setActiveType] = useState('camera')
  const [label, setLabel] = useState('')
  const [videoDevices, setVideoDevices] = useState([])
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('')
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [screenStream, setScreenStream] = useState(null)
  const [screenError, setScreenError] = useState('')
  const fileInputRef = useRef(null)

  // Mirrors screenStream so the unmount cleanup below always sees the latest
  // value without needing to be listed as an effect dependency itself.
  const screenStreamRef = useRef(null)
  const committedRef = useRef(false)
  useEffect(() => {
    screenStreamRef.current = screenStream
  }, [screenStream])

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((list) => {
      setVideoDevices(list.filter((d) => d.kind === 'videoinput'))
      setAudioDevices(list.filter((d) => d.kind === 'audioinput'))
    })
  }, [])

  // Revoke the previous preview URL whenever it's replaced or the modal closes
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  // If a screen was captured but never actually added, stop it so the
  // browser's "you're sharing your screen" indicator doesn't stay live.
  useEffect(() => {
    return () => {
      if (screenStreamRef.current && !committedRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  async function handleCaptureScreen() {
    setScreenError('')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      if (screenStream) screenStream.getTracks().forEach((t) => t.stop())
      setScreenStream(stream)
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setScreenError(err.message)
      }
    }
  }

  function handleAdd() {
    if (activeType === 'camera') onAddCamera(label, selectedVideoDevice)
    else if (activeType === 'screen') {
      if (!screenStream) return
      committedRef.current = true
      onAddScreen(label, screenStream)
    } else if (activeType === 'image') {
      if (!imageFile) return
      onAddImage(imageFile, label)
    } else if (activeType === 'audio') onAddAudio(label, selectedAudioDevice)
    onClose()
  }

  const audioBlocked = activeType === 'audio' && hasAudioSource
  const canAdd =
    !audioBlocked &&
    (activeType !== 'image' || !!imageFile) &&
    (activeType !== 'screen' || !!screenStream)

  const labelPlaceholder = {
    camera: 'Main Studio Cam',
    screen: 'Screen Share',
    image: 'Image',
    audio: 'Main Audio Source',
  }[activeType]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex"
        style={{ minHeight: '380px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-40 shrink-0 bg-gray-950/60 border-r border-gray-800 py-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveType(t.id); setLabel('') }}
              disabled={t.id === 'audio' && hasAudioSource}
              className={`w-full flex items-center gap-2 text-xs font-semibold px-4 py-3 transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed ${
                activeType === t.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-black text-white tracking-tight">Add Input Channel</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-4">
            {audioBlocked ? (
              <p className="text-xs text-gray-500 leading-relaxed">
                Only one audio source is allowed at a time, and one has already been added.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Channel name</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={labelPlaceholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {activeType === 'camera' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Camera</label>
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => setSelectedVideoDevice(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="">Default camera</option>
                      {videoDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeType === 'screen' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Screen / window</label>
                    <div className="rounded-lg bg-black border border-gray-700 overflow-hidden mb-2" style={{ aspectRatio: '16/9' }}>
                      {screenStream ? (
                        <ScreenPreview stream={screenStream} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700 text-xl">🖥</div>
                      )}
                    </div>
                    <button
                      onClick={handleCaptureScreen}
                      className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      {screenStream ? 'Change Screen' : 'Select Screen to Share'}
                    </button>
                    {screenError && <p className="text-xs text-red-400 mt-2">{screenError}</p>}
                  </div>
                )}

                {activeType === 'image' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Image file</label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-black border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                        {imagePreviewUrl ? (
                          <img src={imagePreviewUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-gray-700 text-xl">🖼</span>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        {imageFile ? 'Replace Image' : 'Choose Image'}
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                )}

                {activeType === 'audio' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Microphone</label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="">Default microphone</option>
                      {audioDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Microphone ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="mt-auto pt-2">
              <button
                onClick={handleAdd}
                disabled={!canAdd || !!adding}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold transition-colors text-sm"
              >
                {adding ? `Adding ${adding}…` : '+ Add Channel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
