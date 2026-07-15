import { useState, useEffect } from 'react'
import { api } from '../api/client'
import AdCard from '../components/AdCard'

export default function Events() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/advertisements')
      .then((d) => setAds(d.ads || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold mb-2">Events</h1>
        <p className="text-gray-400">Discover and promote upcoming virtual events.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
                <div className="h-9 bg-gray-800 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 rounded-2xl">
          <div className="text-5xl mb-4">📣</div>
          <p className="text-gray-400 text-lg font-medium mb-1">No event advertisements yet</p>
          <p className="text-gray-600 text-sm">Check back soon — new events are promoted here regularly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ads.map((ad) => (
            <AdCard key={ad.id} {...ad} />
          ))}
        </div>
      )}
    </div>
  )
}
