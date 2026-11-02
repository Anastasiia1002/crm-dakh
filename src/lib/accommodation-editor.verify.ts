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
  validateAccommodationImageFile,
} from './accommodation-editor.ts'

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
const huge = validateAccommodationImageFile({ type: 'image/webp', size: ACCOMMODATION_IMAGE_MAX_BYTES + 1 })
assert(!huge.ok && huge.reason === 'size', 'files over 8 MB are rejected')
assert(accommodationImageRejection('type', 'plan.gif').includes('JPG, PNG і WebP'), 'type errors name the allowed formats')

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
const bookings = readFileSync(new URL('../pages/bookings/BookingFormPage.tsx', import.meta.url), 'utf8')
assert(editor.includes('Основна інформація'), 'basic information is a separate section')
assert(editor.includes('Місткість і стан'), 'capacity and status are a separate section')
assert(editor.includes('AccommodationPhotoGallery'), 'edit page includes the photo gallery')
assert(editor.includes('useBlocker'), 'unsaved navigation is blocked')
assert(editor.includes('beforeunload'), 'unsaved refresh is warned')
assert(editor.includes('Зберегти') && editor.includes('Скасувати'), 'save and cancel stay available')
assert(!editor.includes('BookingFormPage'), 'accommodation editing does not touch booking forms')
assert(bookings.includes('useBlocker(submitting)'), 'booking unsaved guard stays tied to submission only')
assert(gallery.includes('data-photo-card'), 'photos render as cards')
assert(gallery.includes('Головне'), 'the main photo is labeled')
assert(gallery.includes('Зробити головним'), 'a photo can be set as the main one')
assert(gallery.includes('Прибрати фото?'), 'removal asks for confirmation')
assert(gallery.includes('Файл за посиланням не видаляється'), 'external files are not deleted')
assert(gallery.includes('accept="image/jpeg,image/png,image/webp"'), 'the picker limits file types')
assert(gallery.includes('multiple'), 'several files can be selected')
assert(gallery.includes('data-photo-drop'), 'files can be dropped')
assert(gallery.includes('Попередній перегляд, не збережено'), 'local previews are not treated as saved')
assert(!gallery.includes('readAsDataURL'), 'photos are not stored as base64')
assert(!gallery.includes('FormData'), 'the browser does not post files to an unconfigured store')
assert(gallery.includes('url: values.url'), 'saved photos remain http links')
assert(gallery.includes('Спробувати ще раз'), 'a failed photo list can be retried')

console.log('PASS: accommodation pages and photo gallery')
