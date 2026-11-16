import { SelectGroup, SelectItem, SelectLabel } from '@/components/ui/select'
import { bookingRoomFilterLabel, roomsGroupedByKind } from '@/lib/accommodation-labels'
import type { RoomTypeKind } from '@/types'

export function AccommodationSelectGroups({
  rooms,
  roomTypes,
}: {
  rooms: readonly { id: string; name: string | null; number: string; roomTypeId: string; active?: boolean }[]
  roomTypes: readonly { id: string; name: string; kind: RoomTypeKind }[]
}) {
  const typeName = (roomTypeId: string) => roomTypes.find((type) => type.id === roomTypeId)?.name
  return (
    <>
      {roomsGroupedByKind(rooms, roomTypes).map((group) => (
        <SelectGroup key={group.id}>
          <SelectLabel>{group.label}</SelectLabel>
          {group.items.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {bookingRoomFilterLabel(room, typeName(room.roomTypeId))}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </>
  )
}
