const POWER_AUTOMATE_URL =
  'https://default8bcff1709979491e8683d8ced0850b.ad.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c28f126eeee24dc1afb49f20bc202486/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=zF5Ct-A5ufvCEnnt9JoasP54J2f7PXhDet8a0u1Kdqk'

export async function loggerPost(
  action: string,
  body: Record<string, unknown>,
  apiKey: string
): Promise<unknown> {
  const timeoutMs = action === 'get_opp_aisummary_by_id' ? 60_000 : 30_000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(POWER_AUTOMATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        headers: { id: apiKey },
        body,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}
