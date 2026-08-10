import ChatModeration from '../ChatModeration'
import { useDashboard } from '../DashboardContext'

export default function ChatPage() {
  const { events } = useDashboard()
  return <ChatModeration events={events} />
}
