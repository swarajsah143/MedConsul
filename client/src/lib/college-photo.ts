// Fallback thumbnails for a college that has no real `thumbnail` in the data.
//
// Every id below was visually verified to show a college/university BUILDING or campus premise —
// not people, medical equipment, books or scenery. The previous pool was mostly generic (an
// operating room, a gym, a graduation crowd, a brain model, a forest road) with two dead 404s,
// so a college with no photo could show something that clearly wasn't a college. Keep this list
// buildings-only; if you add an id, open the URL and confirm it depicts a building/campus first.
const PHOTOS = [
  'photo-1587351021759-3e566b6af7cc', // medical college building, emergency entrance
  'photo-1562774053-701939374585',    // classical academic building behind a lawn
  'photo-1607237138185-eedd9c632b0b', // red-brick campus building and walkway
  'photo-1527891751199-7225231a68dd', // ivy-clad academic block, bike racks, lawn
  'photo-1559135197-8a45ea74d367',    // columned campus building, tree-lined path
  'photo-1576495199011-eb94736d05d6', // modern campus building, students on the green
  'photo-1577985043696-8bd54d9f093f', // campus lawn framed by academic buildings
  'photo-1581362072978-14998d01fdaa', // historic university, tree-lined avenue
  'photo-1583373834259-46cc92173cb7', // long modern campus building at dusk
  'photo-1591123120675-6f7f1aae0e5b', // columned building, brick walk and lawn
  'photo-1592280771190-3e2e4d571952', // modern brick academic building and plaza
  'photo-1622604647545-0cada2f34470', // aerial view of a campus building and grounds
].map((id) => `https://images.unsplash.com/${id}?w=160&h=160&fit=crop&auto=format`);

/** Deterministic Unsplash photo for a college — same name always gets the same photo. */
export function collegePhoto(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PHOTOS[h % PHOTOS.length];
}
