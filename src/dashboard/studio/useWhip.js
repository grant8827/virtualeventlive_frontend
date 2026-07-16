import { useRef, useState, useCallback } from 'react'

export function useWhip() {
  const pcRef = useRef(null)
  const audioCtxRef = useRef(null)
  const silentTrackRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  // IVS WHIP requires an audio track even when nothing real is being fed in —
  // lazily create one silent tone and reuse it for the life of the stream.
  function getSilentTrack() {
    if (silentTrackRef.current) return silentTrackRef.current
    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    gain.gain.value = 0
    osc.connect(gain)
    const dest = audioCtx.createMediaStreamDestination()
    gain.connect(dest)
    osc.start()
    silentTrackRef.current = dest.stream.getAudioTracks()[0]
    return silentTrackRef.current
  }

  const start = useCallback(async (canvasStream, ingestUrl, streamKey, initialAudioTrack) => {
    setError('')
    try {
      const audioTrack = initialAudioTrack || getSilentTrack()

      const pc = new RTCPeerConnection({ iceServers: [] })
      pcRef.current = pc

      for (const track of canvasStream.getVideoTracks()) {
        pc.addTrack(track, canvasStream)
      }
      pc.addTrack(audioTrack)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering to finish before sending the offer
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve()
          return
        }
        const handler = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', handler)
            resolve()
          }
        }
        pc.addEventListener('icegatheringstatechange', handler)
        setTimeout(resolve, 5000) // fallback
      })

      // Build WHIP URL: rtmps://abc.global-contribute.live-video.net:443/app/ →
      //                 https://abc.global-contribute.live-video.net/app/{key}/whip
      const host = ingestUrl.replace(/^rtmps?:\/\//i, '').replace(/:\d+.*$/, '')
      const whipUrl = `https://${host}/app/${streamKey}/whip`

      const res = await fetch(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription.sdp,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`WHIP ${res.status}: ${body || res.statusText}`)
      }

      const answerSdp = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      setStreaming(true)
    } catch (err) {
      pcRef.current?.close()
      pcRef.current = null
      setError(err.message)
      setStreaming(false)
    }
  }, [])

  // Hot-swaps the outgoing audio track on an already-live connection — used
  // when the operator changes what's on Program mid-stream. Passing no track
  // falls back to silence, so switching away from an audio channel doesn't
  // leave its mic hot on air.
  const replaceAudioTrack = useCallback((track) => {
    const pc = pcRef.current
    if (!pc) return
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio')
    if (!sender) return
    sender.replaceTrack(track || getSilentTrack()).catch(() => {})
  }, [])

  const stop = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    silentTrackRef.current = null
    setStreaming(false)
    setError('')
  }, [])

  return { streaming, error, start, stop, replaceAudioTrack }
}
