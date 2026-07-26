const PHOTOS = [
  'photo-1587351021759-3e566b6af7cc',
  'photo-1519494026892-80bbd2d6fd0d',
  'photo-1580281658223-9b93f18ae9ae',
  'photo-1551076805-e1869033e561',
  'photo-1562774053-701939374585',
  'photo-1504439468489-c8920d796a29',
  'photo-1571019614242-c5c5dee9f50b',
  'photo-1523050854058-8df90110c9f1',
  'photo-1607237138185-eedd9c632b0b',
  'photo-1541339907198-e08756dedf3f',
  'photo-1613990907578-2f4d7e14dcb3',
  'photo-1559757148-5c350d0d3c56',
  'photo-1666214280557-f1b5022eb634',
  'photo-1584820927498-cfe5211fd8bf',
  'photo-1476231682828-37e571bc172f',
  'photo-1535982330050-f1c2fb79ff78',
].map((id) => `https://images.unsplash.com/${id}?w=160&h=160&fit=crop&auto=format`);

/** Deterministic Unsplash photo for a college — same name always gets the same photo. */
export function collegePhoto(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PHOTOS[h % PHOTOS.length];
}
