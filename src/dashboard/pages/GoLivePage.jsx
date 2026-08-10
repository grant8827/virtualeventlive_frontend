import GoLiveStudio from '../GoLiveStudio'
import { useDashboard } from '../DashboardContext'

export default function GoLivePage() {
  const { events } = useDashboard()
  return <GoLiveStudio events={events} />
}
