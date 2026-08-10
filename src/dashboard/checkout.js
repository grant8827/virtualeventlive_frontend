// Redirects the browser to a checkout target returned by the backend.
// Shared by the "Book Event" pay step and the "My Events" pay-to-activate
// button — both kick off the same venue-fee checkout flow.
export function startCheckout(data, navigate) {
  if (!data?.checkout_url) return

  if (data.checkout_method === 'POST') {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = data.checkout_url
    form.style.display = 'none'

    Object.entries(data.checkout_fields || {}).forEach(([key, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value ?? ''
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
    return
  }

  try {
    const url = new URL(data.checkout_url)
    if (url.hostname === window.location.hostname) {
      navigate(url.pathname + url.search)
      return
    }
  } catch {
    // Not a parseable/same-origin URL — fall through to the hard redirect below.
  }

  window.location.href = data.checkout_url
}
