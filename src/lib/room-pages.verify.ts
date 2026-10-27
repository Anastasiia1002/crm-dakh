/**
 * Room catalog pagination. Run: npx --yes tsx src/lib/room-pages.verify.ts
 */
import { collectPagedRooms, RoomPageError } from './room-pages'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function pageOf(items: { id: string }[], page: number, total: number, totalPages: number, limit: number) {
  return { items, pagination: { page, limit, total, totalPages } }
}

async function main() {
  const loaded = await collectPagedRooms(
    async (page, limit) => {
      assert(limit === 2, 'page size is the requested limit')
      if (page === 1) return pageOf([{ id: 'a' }, { id: 'b' }], 1, 3, 2, limit)
      if (page === 2) return pageOf([{ id: 'b' }, { id: 'c' }], 2, 3, 2, limit)
      throw new Error('unexpected page')
    },
    { limit: 2 },
  )
  assert(loaded.map((room) => room.id).join(',') === 'a,b,c', 'pages combine and a repeated room is kept once')
  console.log('PASS: multi-page room loading')

  let failed = false
  try {
    await collectPagedRooms(async () => {
      throw new Error('network')
    })
  } catch (error) {
    failed = error instanceof Error && error.message === 'network'
  }
  assert(failed, 'a failed page is not treated as an empty catalog')
  console.log('PASS: pagination failure')

  let incomplete = false
  try {
    await collectPagedRooms(
      async (page, limit) => {
        if (page === 1) return pageOf([{ id: 'a' }, { id: 'a' }], 1, 2, 1, limit)
        throw new Error('no second page')
      },
      { limit: 2 },
    )
  } catch (error) {
    incomplete = error instanceof RoomPageError && error.code === 'ROOMS_PAGE_INCOMPLETE'
  }
  assert(incomplete, 'duplicate records that do not cover the total are incomplete')
  console.log('PASS: duplicate page records')

  console.log('All room page checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
