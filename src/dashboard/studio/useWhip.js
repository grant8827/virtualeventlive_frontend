import { useRef, useState, useCallback } from 'react'

export function useWhip() {
  const pcRef = useRef(null)
  const audioCtxRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  const start = useCallback(async (canvasStream, ingestUrl, streamKey) => {
    setError('')
    try {
      // Create a silent audio track — IVS WHIP requires both video and audio tracks
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      gain.gain.value = 0
      osc.connect(gain)
      const dest = audioCtx.createMediaStreamDestination()
      gain.connect(dest)
      osc.start()

      const pc = new RTCPeerConnection({ iceServers: [] })
      pcRef.current = pc

      for (const track of canvasStream.getVideoTracks()) {
        pc.addTrack(track, canvasStream)
      }
      for (const track of dest.stream.getAudioTracks()) {
        pc.addTrack(track, dest.stream)
      }

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
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      setError(err.message)
      setStreaming(false)
    }
  }, [])

  const stop = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    setStreaming(false)
    setError('')
  }, [])

  return { streaming, error, start, stop }
}
