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
  const audioSourceTrackRef = useRef(null)
  const audioReplaceQueueRef = useRef(Promise.resolve())
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

  // The IVS SDK stops tracks when an input is removed. Always give it a
  // clone so switching inputs cannot stop the app-owned mic/screen track.
  function makeIvsAudioTrack(sourceTrack) {
    const liveSource = sourceTrack?.readyState === 'live' ? sourceTrack : getSilentTrack()
    const clone = liveSource.clone()
    clone.enabled = true
    return clone
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
    audioSourceTrackRef.current = null
    audioReplaceQueueRef.current = Promise.resolve()
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

      // Size the input to the broadcast canvas's actual dimensions (1920x1080
      // for STANDARD_LANDSCAPE) rather than assuming 1280x720 — a mismatch
      // here leaves the rest of the frame black, with the composited video
      // only filling that smaller top-left region.
      const {width: canvasWidth, height: canvasHeight} = client.getCanvasDimensions()
      await client.addVideoInputDevice(canvasStream, VIDEO_INPUT, {
        index: 0,
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
      })

      const sourceTrack = initialAudioTrack?.readyState === 'live' ? initialAudioTrack : null
      audioSourceTrackRef.current = sourceTrack
      await client.addAudioInputDevice(
        new MediaStream([makeIvsAudioTrack(sourceTrack)]),
        AUDIO_INPUT,
      )
      await client.startBroadcast(streamKey)
      setStreaming(true)
    } catch (err) {
      clientRef.current?.delete()
      clientRef.current = null
      audioSourceTrackRef.current = null
      setError(err?.details || err?.message || 'Unable to start Amazon IVS broadcast.')
      setStreaming(false)
    }
  }, [])

  const replaceAudioTrack = useCallback((track) => {
    const sourceTrack = track?.readyState === 'live' ? track : null

    // setStreaming(true) triggers the source effect after startup. Do not
    // remove and re-add the same source: IVS owns only its cloned copy.
    if (sourceTrack === audioSourceTrackRef.current) {
      return audioReplaceQueueRef.current
    }
    audioSourceTrackRef.current = sourceTrack

    const replace = async () => {
      const client = clientRef.current
      if (!client) return

      const ivsTrack = makeIvsAudioTrack(sourceTrack)
      try {
        client.removeAudioInputDevice(AUDIO_INPUT)
      } catch {
        // The input may already have been removed during shutdown.
      }

      try {
        await client.addAudioInputDevice(new MediaStream([ivsTrack]), AUDIO_INPUT)
      } catch (err) {
        ivsTrack.stop()
        // Keep a valid input in the broadcast even if the requested track
        // disappears while it is being switched.
        await client.addAudioInputDevice(
          new MediaStream([makeIvsAudioTrack(null)]),
          AUDIO_INPUT,
        )
        throw err
      }
    }

    audioReplaceQueueRef.current = audioReplaceQueueRef.current.then(replace, replace)
    return audioReplaceQueueRef.current.catch((err) => {
      setError(err?.details || err?.message || 'Unable to switch broadcast audio.')
    })
  }, [])

  useEffect(() => () => {
    const client = clientRef.current
    if (client) {
      client.stopBroadcast()
      client.delete()
    }
    audioCtxRef.current?.close().catch(() => {})
    audioSourceTrackRef.current = null
  }, [])

  return { streaming, error, start, stop, replaceAudioTrack }
}
