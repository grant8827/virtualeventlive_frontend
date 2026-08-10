import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

// Shared across every dashboard page: the host's event list. Each page
// fetches/mutates its own local state for everything else (forms, payouts,
// tickets…) — this context exists purely so "My Events", "Go Live",
// "Chat", "Book Event" and "Tickets/Flyer" don't each need their own copy.
const DashboardContext = createContext(null)

export function DashboardProvider({ children }) {
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setEventsLoading(true)
    try {
      const data = await api.get('/events')
      setEvents(data.events || [])
    } catch {
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  const currentEvents = events.filter((event) => !event.expired)
  const activeEventCount = currentEvents.filter((event) => event.venue_paid).length

  const value = { events, eventsLoading, fetchEvents, currentEvents, activeEventCount }
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within a DashboardProvider')
  return ctx
}
