import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ACCOMMODATION_IMAGE_MAX_BYTES,
  accommodationImageRejection,
  isSafeAccommodationImageUrl,
  makeImageMain,
  moveImage,
  nextImageSortOrder,
  sortRoomTypeImages,
  accommodationTypeSlug,
  accommodationUploadFailure,
  validateAccommodationImageFile,
} from './accommodation-editor.ts'
import { ApiError } from './api-error.ts'

const jpeg = validateAccommodationImageFile({ type: 'image/jpeg', size: 1200 })
const png = validateAccommodationImageFile({ type: 'image/png', size: 1200 })
const webp = validateAccommodationImageFile({ type: 'image/webp', size: 1200 })
assert(jpeg.ok && png.ok && webp.ok, 'jpg, png, and webp are accepted')

const gif = validateAccommodationImageFile({ type: 'image/gif', size: 1200 })
const svg = validateAccommodationImageFile({ type: 'image/svg+xml', size: 1200 })
assert(!gif.ok && gif.reason === 'type', 'gif is rejected')
assert(!svg.ok && svg.reason === 'type', 'svg is rejected')
const empty = validateAccommodationImageFile({ type: 'image/png', size: 0 })
assert(!empty.ok && empty.reason === 'empty', 'empty files are rejected')
assert(ACCOMMODATION_IMAGE_MAX_BYTES === 50 * 1024 * 1024, 'the picker allows 50 MiB')
const exact = validateAccommodationImageFile({ type: 'image/jpeg', size: ACCOMMODATION_IMAGE_MAX_BYTES })
assert(exact.ok, 'a file of exactly 50 MiB is accepted')
const below = validateAccommodationImageFile({ type: 'image/jpeg', size: ACCOMMODATION_IMAGE_MAX_BYTES - 1 })
assert(below.ok, 'a file below 50 MiB is accepted')
const huge = validateAccommodationImageFile({ type: 'image/webp', size: ACCOMMODATION_IMAGE_MAX_BYTES + 1 })
assert(!huge.ok && huge.reason === 'size', 'files over 50 MiB are rejected')
assert(accommodationImageRejection('size', 'large.jpg').includes('50 МБ'), 'oversized files use the Ukrainian limit')
assert(accommodationImageRejection('type', 'plan.gif').includes('JPG, PNG і WebP'), 'type errors name the allowed formats')
assert(
  accommodationUploadFailure(new ApiError('ignored', 503, 'IMAGE_STORAGE_UNAVAILABLE')) ===
    'Сховище фото не підключене. Файл не збережено.',
  'missing storage is not described as a saved upload',
)
assert(
  accommodationUploadFailure(new ApiError('ignored', 502, 'IMAGE_STORAGE_FAILED')).includes('Спробуйте ще раз'),
  'a storage failure can be retried',
)

assert(isSafeAccommodationImageUrl('https://cdn.example/photo.webp'), 'https images can render')
assert(isSafeAccommodationImageUrl('http://cdn.example/photo.jpg'), 'http images can render')
assert(!isSafeAccommodationImageUrl('javascript:alert(1)'), 'script urls are not rendered')
assert(!isSafeAccommodationImageUrl('data:image/png;base64,aaaa'), 'data urls are not stored as photos')

const images = [
  { id: 'b', sortOrder: 1, url: 'https://cdn.example/b.jpg' },
  { id: 'a', sortOrder: 0, url: 'https://cdn.example/a.jpg' },
  { id: 'c', sortOrder: 0, url: 'https://cdn.example/c.jpg' },
]
assert(
  sortRoomTypeImages(images).map((image) => image.id).join(',') === 'a,c,b',
  'gallery order matches public cover ordering',
)
assert(nextImageSortOrder(images) === 2, 'a new photo is appended after the highest order')
assert(makeImageMain(['a', 'c', 'b'], 'b')?.join(',') === 'b,a,c', 'setting the main photo moves it first')
assert(makeImageMain(['a', 'c', 'b'], 'a') === null, 'the current main photo is not reordered')
assert(moveImage(['a', 'c', 'b'], 'c', -1)?.join(',') === 'c,a,b', 'photos can move earlier')
assert(moveImage(['a', 'c', 'b'], 'c', 1)?.join(',') === 'a,b,c', 'photos can move later')
assert(moveImage(['a'], 'a', -1) === null, 'the only photo cannot move past the ends')

const router = readFileSync(new URL('../router/index.tsx', import.meta.url), 'utf8')
assert(router.includes("path: 'accommodations/new'"), 'create route exists')
assert(router.includes("path: 'accommodations/:id/edit'"), 'edit route exists')
assert(router.includes("path: 'bookings/new'"), 'booking creation route is unchanged')
assert(router.includes("path: 'bookings/:id/edit'"), 'booking edit route is unchanged')

const editor = readFileSync(new URL('../pages/accommodations/AccommodationEditorPage.tsx', import.meta.url), 'utf8')
const gallery = readFileSync(new URL('../components/accommodations/AccommodationPhotoGallery.tsx', import.meta.url), 'utf8')
const imageApi = readFileSync(new URL('../api/accommodations.ts', import.meta.url), 'utf8')
const bookings = readFileSync(new URL('../pages/bookings/BookingFormPage.tsx', import.meta.url), 'utf8')
assert(editor.includes('Основна інформація'), 'basic information is a separate section')
assert(editor.includes('Місткість і стан'), 'capacity and status are a separate section')
assert(editor.includes('AccommodationPhotoGallery'), 'edit page includes the photo gallery')
assert(editor.includes('data-accommodation-kind'), 'the editor chooses a kind')
assert(editor.includes("'Номер'") && editor.includes("'Котедж'"), 'kind choices are room and cottage')
assert(!editor.includes('RoomTypePicker'), 'the editor does not list other accommodation names')
assert(editor.includes('accommodationTypeSlug'), 'a new unit gets its own room type')
const slug = accommodationTypeSlug('COTTAGE', '14/3')
assert(/^cottage-[a-z0-9-]+$/.test(slug) && slug.length <= 80, 'generated slugs stay within the room-type contract')
assert(gallery.includes('data-photo-toolbar'), 'photo actions sit on the thumbnail')
assert(gallery.includes('aria-label="Перемістити вище"'), 'move earlier is an accessible icon')
assert(gallery.includes('aria-label="Видалити фото"'), 'delete is an accessible icon')
assert(editor.includes('useBlocker'), 'unsaved navigation is blocked')
assert(editor.includes('beforeunload'), 'unsaved refresh is warned')
assert(editor.includes('Зберегти') && editor.includes('Скасувати'), 'save and cancel stay available')
assert(!editor.includes('BookingFormPage'), 'accommodation editing does not touch booking forms')
assert(bookings.includes('useBlocker(submitting)'), 'booking unsaved guard stays tied to submission only')
assert(gallery.includes('data-photo-card'), 'photos render as cards')
assert(gallery.includes('Головне'), 'the main photo is labeled')
assert(gallery.includes('Зробити головним'), 'a photo can be set as the main one')
assert(gallery.includes('Прибрати фото?'), 'removal asks for confirmation')
assert(gallery.includes('Зовнішнє посилання лише зникне зі списку'), 'external files are not deleted')
assert(gallery.includes('accept="image/jpeg,image/png,image/webp"'), 'the picker limits file types')
assert(gallery.includes('до 50 МБ'), 'the picker states the 50 MB limit')
assert(gallery.includes('multiple'), 'several files can be selected')
assert(gallery.includes('data-photo-drop'), 'files can be dropped')
assert(gallery.includes('data-photo-upload-progress'), 'an upload shows progress before it is saved')
assert(gallery.includes('Повторити'), 'a failed upload can be retried')
assert(gallery.includes('useUploadAdminRoomTypeImage'), 'the picker uses the upload mutation')
assert(imageApi.includes('/images/upload'), 'the picker posts to the staff upload endpoint')
assert(imageApi.includes('new FormData()'), 'the upload sends the file as multipart')
assert(!gallery.includes('data-photo-local-preview'), 'selected files are not shown as gallery previews')
assert(!gallery.includes('createObjectURL'), 'selected files are not kept as local image urls')
assert(!gallery.includes('Додати за посиланням'), 'file upload does not fall back to pasting a url')
assert(!gallery.includes('readAsDataURL'), 'photos are not stored as base64')
assert(gallery.includes('url: values.url'), 'an existing image reference can still be replaced')
assert(gallery.includes('Спробувати ще раз'), 'a failed photo list can be retried')

console.log('PASS: accommodation pages and photo gallery')
