import 'reflect-metadata'
import IVSBroadcastClient, {
  STANDARD_LANDSCAPE,
  isSupported,
} from 'amazon-ivs-web-broadcast'
import { useCallback, useEffect, useRef, useState } from 'react'

const VIDEO_INPUT = 'program-video'
const AUDIO_INPUT = 'program-audio'

export function useIvsBroadcast() {
  const clientRef = useRef(null)
  const audioCtxRef = useRef(null)
  const silentTrackRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  function getSilentTrack() {
    if (silentTrackRef.current) return silentTrackRef.current

    const audioCtx = new AudioContext()
    const oscillator = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const destination = audioCtx.createMediaStreamDestination()
    gain.gain.value = 0
    oscillator.connect(gain)
    gain.connect(destination)
    oscillator.start()

    audioCtxRef.current = audioCtx
    silentTrackRef.current = destination.stream.getAudioTracks()[0]
    return silentTrackRef.current
  }

  const stop = useCallback(() => {
    const client = clientRef.current
    if (client) {
      client.stopBroadcast()
      client.delete()
      clientRef.current = null
    }
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    silentTrackRef.current = null
    setStreaming(false)
    setError('')
  }, [])

  const start = useCallback(async (canvasStream, ingestEndpoint, streamKey, initialAudioTrack) => {
    setError('')
    try {
      if (!isSupported()) {
        throw new Error('This browser does not support Amazon IVS broadcasting. Use the latest Chrome or Edge.')
      }

      const client = IVSBroadcastClient.create({
        streamConfig: STANDARD_LANDSCAPE,
        ingestEndpoint,
      })
      clientRef.current = client

      await client.addVideoInputDevice(canvasStream, VIDEO_INPUT, {
        index: 0,
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
      })

      const audioTrack = initialAudioTrack || getSilentTrack()
      await client.addAudioInputDevice(new MediaStream([audioTrack]), AUDIO_INPUT)
      await client.startBroadcast(streamKey)
      setStreaming(true)
    } catch (err) {
      clientRef.current?.delete()
      clientRef.current = null
      setError(err?.details || err?.message || 'Unable to start Amazon IVS broadcast.')
      setStreaming(false)
    }
  }, [])

  const replaceAudioTrack = useCallback(async (track) => {
    const client = clientRef.current
    if (!client) return

    try {
      client.removeAudioInputDevice(AUDIO_INPUT)
      await client.addAudioInputDevice(
        new MediaStream([track || getSilentTrack()]),
        AUDIO_INPUT,
      )
    } catch (err) {
      setError(err?.details || err?.message || 'Unable to switch broadcast audio.')
    }
  }, [])

  useEffect(() => () => {
    const client = clientRef.current
    if (client) {
      client.stopBroadcast()
      client.delete()
    }
    audioCtxRef.current?.close().catch(() => {})
  }, [])

  return { streaming, error, start, stop, replaceAudioTrack }
}
