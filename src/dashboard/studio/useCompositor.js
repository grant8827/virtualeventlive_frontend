import { useRef, useEffect, useState, useCallback } from 'react'

export function useCompositor(pvwCanvasRef, pgmCanvasRef) {
  const pvwVideoRef = useRef(null)
  const pgmVideoRef = useRef(null)
  const labelsRef = useRef({ pvw: '', pgm: '' })

  // Animated fade transition state
  const fadeRef = useRef(null)
  // { fromVideo, toVideo, toLabel, startTime, duration }

  // Manual T-Bar state
  const tBarRef = useRef({ active: false, blend: 0, fromVideo: null, fromLabel: '' })

  // Ticker state
  const tickerRef = useRef({ text: '', active: false, x: 1280, color: '#ffffff', font: 'Arial, sans-serif', scroll: true })

  // Station watermark — a fixed logo overlay on Program, independent of any
  // channel or transition (unlike the ticker, it never travels or crossfades).
  const logoRef = useRef({ enabled: false, position: 'bottom-right', image: null })

  const rafRef = useRef(null)

  const [pvwLabel, setPvwLabel] = useState('')
  const [pgmLabel, setPgmLabel] = useState('')

  // ─── Draw helpers ─────────────────────────────────────────────────────────

  function drawBlack(ctx, w, h) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
  }

  function drawVideo(ctx, video, w, h) {
    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, w, h)
    }
  }

  function drawTicker(ctx, w, h) {
    const t = tickerRef.current
    if (!t.active || !t.text) return
    const barH = Math.max(28, Math.round(h * 0.08))
    const y = h - barH
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(0,0,0,0.82)'
    ctx.fillRect(0, y, w, barH)
    ctx.font = `bold ${Math.round(barH * 0.6)}px ${t.font}`
    ctx.fillStyle = t.color

    if (t.scroll) {
      ctx.textAlign = 'left'
      ctx.fillText(t.text, t.x, y + barH * 0.76)
      const tw = ctx.measureText(t.text).width
      t.x -= 2
      if (t.x < -tw) t.x = w
    } else {
      ctx.textAlign = 'center'
      ctx.fillText(t.text, w / 2, y + barH * 0.76)
    }
    ctx.textAlign = 'left'
  }

  const LOGO_ANCHORS = {
    'top-left': { x: 'left', y: 'top' },
    'top-right': { x: 'right', y: 'top' },
    'bottom-left': { x: 'left', y: 'bottom' },
    'bottom-right': { x: 'right', y: 'bottom' },
  }

  function drawLogo(ctx, w, h) {
    const logo = logoRef.current
    if (!logo.enabled || !logo.image) return
    const img = logo.image
    if (!img.complete || !img.naturalWidth) return

    const maxW = w * 0.18
    const maxH = h * 0.18
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
    const drawW = img.naturalWidth * scale
    const drawH = img.naturalHeight * scale
    const pad = w * 0.02

    const anchor = LOGO_ANCHORS[logo.position] || LOGO_ANCHORS['bottom-right']
    const x = anchor.x === 'left' ? pad : w - drawW - pad
    const y = anchor.y === 'top' ? pad : h - drawH - pad

    ctx.globalAlpha = 1
    ctx.drawImage(img, x, y, drawW, drawH)
  }

  function tickPvw() {
    const canvas = pvwCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas
    drawBlack(ctx, w, h)
    drawVideo(ctx, pvwVideoRef.current, w, h)
  }

  function tickPgm() {
    const canvas = pgmCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas

    const fade = fadeRef.current
    const tb = tBarRef.current

    drawBlack(ctx, w, h)

    if (fade) {
      // Animated crossfade
      const progress = Math.min((Date.now() - fade.startTime) / fade.duration, 1)

      if (fade.fromVideo && fade.fromVideo.readyState >= 2) {
        ctx.globalAlpha = 1 - progress
        ctx.drawImage(fade.fromVideo, 0, 0, w, h)
      }
      if (fade.toVideo && fade.toVideo.readyState >= 2) {
        ctx.globalAlpha = progress
        ctx.drawImage(fade.toVideo, 0, 0, w, h)
      }
      ctx.globalAlpha = 1

      if (progress >= 1) {
        // Commit fade
        if (pgmVideoRef.current && pgmVideoRef.current !== fade.toVideo) {
          pgmVideoRef.current.srcObject = null
        }
        pgmVideoRef.current = fade.toVideo
        pvwVideoRef.current = null
        labelsRef.current.pgm = fade.toLabel
        labelsRef.current.pvw = ''
        setPgmLabel(fade.toLabel)
        setPvwLabel('')
        fadeRef.current = null
      }
    } else if (tb.active && tb.blend > 0) {
      // Manual T-Bar blend
      if (tb.fromVideo && tb.fromVideo.readyState >= 2) {
        ctx.globalAlpha = 1 - tb.blend
        ctx.drawImage(tb.fromVideo, 0, 0, w, h)
      }
      if (pvwVideoRef.current && pvwVideoRef.current.readyState >= 2) {
        ctx.globalAlpha = tb.blend
        ctx.drawImage(pvwVideoRef.current, 0, 0, w, h)
      }
      ctx.globalAlpha = 1
    } else {
      ctx.globalAlpha = 1
      drawVideo(ctx, pgmVideoRef.current, w, h)
    }

    drawTicker(ctx, w, h)
    drawLogo(ctx, w, h)
  }

  useEffect(() => {
    function tick() {
      tickPvw()
      tickPgm()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [pvwCanvasRef, pgmCanvasRef])

  // ─── Source helpers ────────────────────────────────────────────────────────

  function makeVideoEl(stream) {
    const v = document.createElement('video')
    v.srcObject = stream
    v.autoplay = true
    v.muted = true
    v.playsInline = true
    v.play().catch(() => {})
    return v
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  const setPvwSource = useCallback((stream, label) => {
    if (pvwVideoRef.current) pvwVideoRef.current.srcObject = null
    pvwVideoRef.current = stream ? makeVideoEl(stream) : null
    labelsRef.current.pvw = label || ''
    setPvwLabel(label || '')
  }, [])

  const setPgmSource = useCallback((stream, label) => {
    fadeRef.current = null
    tBarRef.current = { active: false, blend: 0, fromVideo: null, fromLabel: '' }
    if (pgmVideoRef.current) pgmVideoRef.current.srcObject = null
    pgmVideoRef.current = stream ? makeVideoEl(stream) : null
    labelsRef.current.pgm = label || ''
    setPgmLabel(label || '')
  }, [])

  // Instant cut: PVW → PGM
  const cut = useCallback(() => {
    fadeRef.current = null
    tBarRef.current = { active: false, blend: 0, fromVideo: null, fromLabel: '' }
    if (pgmVideoRef.current && pgmVideoRef.current !== pvwVideoRef.current) {
      pgmVideoRef.current.srcObject = null
    }
    pgmVideoRef.current = pvwVideoRef.current
    pvwVideoRef.current = null
    const label = labelsRef.current.pvw
    labelsRef.current.pgm = label
    labelsRef.current.pvw = ''
    setPgmLabel(label)
    setPvwLabel('')
  }, [])

  // Animated fade: PVW → PGM over `duration` ms
  const fade = useCallback((duration = 1000) => {
    if (!pvwVideoRef.current) return
    fadeRef.current = {
      fromVideo: pgmVideoRef.current,
      toVideo: pvwVideoRef.current,
      toLabel: labelsRef.current.pvw,
      startTime: Date.now(),
      duration,
    }
    pvwVideoRef.current = null
    labelsRef.current.pvw = ''
    setPvwLabel('')
  }, [])

  // T-Bar: call on mousedown to snapshot current PGM as "from"
  const tBarStart = useCallback(() => {
    if (!pvwVideoRef.current) return false
    tBarRef.current = {
      active: true,
      blend: 0,
      fromVideo: pgmVideoRef.current,
      fromLabel: labelsRef.current.pgm,
    }
    return true
  }, [])

  // T-Bar: update blend (0–100)
  const tBarUpdate = useCallback((value) => {
    tBarRef.current.blend = value / 100
  }, [])

  // T-Bar: commit transition (T-Bar reached 100 or released at 100)
  const tBarCommit = useCallback(() => {
    // A dragged range input can fire onChange more than once at the boundary
    // value — without this guard, a second commit would find Preview already
    // cleared by the first and stomp Program with that emptiness too.
    if (!tBarRef.current.active) return
    const from = tBarRef.current.fromVideo
    const newPgm = pvwVideoRef.current
    if (from && from !== newPgm) from.srcObject = null
    pgmVideoRef.current = newPgm
    pvwVideoRef.current = null
    const label = labelsRef.current.pvw
    labelsRef.current.pgm = label
    labelsRef.current.pvw = ''
    setPgmLabel(label)
    setPvwLabel('')
    tBarRef.current = { active: false, blend: 0, fromVideo: null, fromLabel: '' }
  }, [])

  // T-Bar: cancel (user released before 100%)
  const tBarCancel = useCallback(() => {
    tBarRef.current = { active: false, blend: 0, fromVideo: null, fromLabel: '' }
  }, [])

  // Ticker — merges into the existing entry so settings changed mid-broadcast
  // (color, font, scroll) take effect immediately without needing a Stop/Start.
  function setTicker(patch) {
    const t = tickerRef.current
    Object.assign(t, patch)
    if (patch.active) t.x = pgmCanvasRef.current?.width ?? 1280
  }

  function getPgmStream() {
    return pgmCanvasRef.current?.captureStream(30) ?? null
  }

  // Station watermark
  const setLogo = useCallback((patch) => {
    logoRef.current = { ...logoRef.current, ...patch }
  }, [])

  return {
    pvwLabel,
    pgmLabel,
    setPvwSource,
    setPgmSource,
    cut,
    fade,
    tBarStart,
    tBarUpdate,
    tBarCommit,
    tBarCancel,
    setTicker,
    setLogo,
    getPgmStream,
  }
}
