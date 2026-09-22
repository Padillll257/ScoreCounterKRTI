import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const KEY = 'krti-national-state'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await redis.get(KEY)
      return res.status(200).json({ data: data || null })
    }
    if (req.method === 'POST') {
      const body = req.body
      if (!body || !body.groups || !body.knockout) {
        return res.status(400).json({ error: 'Payload tidak valid' })
      }
      await redis.set(KEY, body)
      return res.status(200).json({ ok: true })
    }
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method tidak didukung' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}