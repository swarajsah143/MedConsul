// ────────────────────────────────────────────────────────────────
// Abroad Medical Universities — dataset for the Research Abroad feature
// Static/mock data (UI only). Tuition/living costs are indicative USD/year.
// ────────────────────────────────────────────────────────────────

export interface AbroadUniversity {
  id: string;
  name: string;
  country: string;
  flag: string;
  city: string;
  degree: string;
  durationYears: number;
  medium: string;
  tuitionPerYearUSD: number;
  livingCostPerYearUSD: number;
  rating: number; // out of 5
  recognitions: string[]; // e.g. NMC, WHO, ECFMG
  highlight: string;
  image: string;
}

const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=600&h=360&fit=crop',
];

function u(
  id: string, name: string, country: string, flag: string, city: string,
  degree: string, durationYears: number, tuitionPerYearUSD: number,
  livingCostPerYearUSD: number, rating: number, recognitions: string[], highlight: string
): AbroadUniversity {
  const idx = (parseInt(id.replace(/\D/g, ''), 10) || 1) % IMAGE_POOL.length;
  return {
    id, name, country, flag, city, degree, durationYears, medium: 'English',
    tuitionPerYearUSD, livingCostPerYearUSD, rating, recognitions, highlight,
    image: IMAGE_POOL[idx],
  };
}

export const ABROAD_UNIVERSITIES: AbroadUniversity[] = [
  u('a1', 'Tbilisi State Medical University', 'Georgia', '🇬🇪', 'Tbilisi', 'MD', 6, 8000, 4000, 4.6, ['NMC', 'WHO', 'WFME'], 'Oldest medical university in the Caucasus with strong clinical training and English-medium MD.'),
  u('a2', 'Georgian National University SEU', 'Georgia', '🇬🇪', 'Tbilisi', 'MD', 6, 5000, 3500, 4.3, ['NMC', 'WHO'], 'Budget-friendly, well-recognised, and popular among Indian students.'),
  u('a3', 'Kazakh National Medical University', 'Kazakhstan', '🇰🇿', 'Almaty', 'MD', 5, 4000, 2500, 4.4, ['NMC', 'WHO', 'WFME'], 'Top-ranked Kazakh university with modern facilities and low tuition.'),
  u('a4', 'Astana Medical University', 'Kazakhstan', '🇰🇿', 'Astana', 'MD', 5, 3800, 2800, 4.2, ['NMC', 'WHO'], 'Government university in the capital, very affordable and NMC-approved.'),
  u('a5', 'Osh State University', 'Kyrgyzstan', '🇰🇬', 'Osh', 'MBBS', 5, 3200, 2000, 4.1, ['NMC', 'WHO'], 'One of the most economical MBBS options abroad with sizeable Indian community.'),
  u('a6', 'Kyrgyz State Medical Academy', 'Kyrgyzstan', '🇰🇬', 'Bishkek', 'MBBS', 5, 3500, 2200, 4.2, ['NMC', 'WHO', 'WFME'], 'Premier government medical academy of Kyrgyzstan, low cost of living.'),
  u('a7', 'Crimea Federal University', 'Russia', '🇷🇺', 'Simferopol', 'MD', 6, 4500, 3000, 4.0, ['NMC', 'WHO'], 'Large campus, structured English program, affordable overall package.'),
  u('a8', 'Kazan Federal University', 'Russia', '🇷🇺', 'Kazan', 'MD', 6, 6500, 3500, 4.5, ['NMC', 'WHO', 'WFME'], 'Highly ranked Russian federal university with excellent research exposure.'),
  u('a9', 'Perm State Medical University', 'Russia', '🇷🇺', 'Perm', 'MD', 6, 5500, 3000, 4.2, ['NMC', 'WHO'], 'Established university with strong academics and reasonable fees.'),
  u('a10', 'Xiamen University', 'China', '🇨🇳', 'Xiamen', 'MBBS', 6, 5500, 3500, 4.3, ['NMC', 'WHO'], 'Beautiful coastal campus, WHO-listed, English-medium MBBS.'),
  u('a11', 'Jiangsu University', 'China', '🇨🇳', 'Zhenjiang', 'MBBS', 6, 4200, 3000, 4.1, ['NMC', 'WHO'], 'Popular affordable choice with good hospital affiliations.'),
  u('a12', 'Davao Medical School Foundation', 'Philippines', '🇵🇭', 'Davao', 'MD', 5, 5000, 3500, 4.3, ['NMC', 'WHO', 'ECFMG'], 'US-style curriculum, English-speaking country, strong USMLE pathway.'),
  u('a13', 'University of Perpetual Help', 'Philippines', '🇵🇭', 'Las Piñas', 'MD', 5, 5500, 4000, 4.2, ['NMC', 'WHO', 'ECFMG'], 'Well-known among Indian students, American-pattern MD program.'),
  u('a14', 'Yerevan State Medical University', 'Armenia', '🇦🇲', 'Yerevan', 'MD', 6, 4200, 2800, 4.4, ['NMC', 'WHO', 'WFME'], 'Reputed government university, safe city, budget-friendly living.'),
  u('a15', 'Tashkent Medical Academy', 'Uzbekistan', '🇺🇿', 'Tashkent', 'MBBS', 6, 3500, 2000, 4.1, ['NMC', 'WHO'], 'Among the lowest total-cost MBBS destinations for Indian students.'),
  u('a16', 'Bashkir State Medical University', 'Russia', '🇷🇺', 'Ufa', 'MD', 6, 4800, 2800, 4.2, ['NMC', 'WHO'], 'Affordable federal university with a large international cohort.'),
  u('a17', 'Poznan University of Medical Sciences', 'Poland', '🇵🇱', 'Poznań', 'MD', 6, 15000, 7000, 4.7, ['NMC', 'WHO', 'ECFMG', 'WFME'], 'EU degree with excellent global recognition and USMLE outcomes.'),
  u('a18', 'Charles University', 'Czech Republic', '🇨🇿', 'Prague', 'MD', 6, 14000, 8000, 4.8, ['NMC', 'WHO', 'WFME'], 'One of Europe\'s oldest and most prestigious medical faculties.'),
];

export const ABROAD_COUNTRIES = Array.from(new Set(ABROAD_UNIVERSITIES.map((x) => x.country))).sort();

// A "value" score favouring good rating AND low total annual cost — used to
// surface affordable-yet-good universities as recommendations.
export function valueScore(x: AbroadUniversity): number {
  const totalCost = x.tuitionPerYearUSD + x.livingCostPerYearUSD;
  // Higher rating is better; lower cost is better. Normalise cost against 25k.
  return x.rating - (totalCost / 25000) * 2.5;
}

export function isRecommended(x: AbroadUniversity): boolean {
  return x.tuitionPerYearUSD <= 6000 && x.rating >= 4.2;
}

export function searchAbroad(query: string, country: string): AbroadUniversity[] {
  const q = query.trim().toLowerCase();
  const list = ABROAD_UNIVERSITIES.filter((x) => {
    const matchQuery =
      !q ||
      x.name.toLowerCase().includes(q) ||
      x.country.toLowerCase().includes(q) ||
      x.city.toLowerCase().includes(q);
    const matchCountry = country === 'All Countries' || x.country === country;
    return matchQuery && matchCountry;
  });
  return list.sort((a, b) => valueScore(b) - valueScore(a));
}

// Top affordable + good recommendations (used when no search is active).
export function recommendedAbroad(limit = 6): AbroadUniversity[] {
  return [...ABROAD_UNIVERSITIES]
    .filter(isRecommended)
    .sort((a, b) => valueScore(b) - valueScore(a))
    .slice(0, limit);
}
