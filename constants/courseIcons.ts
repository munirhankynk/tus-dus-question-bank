// Ders ismine göre ikon ve renk eşleştirmesi
// Kütüphanede ve ders kartlarında kullanılır

export const COURSE_ICON_MAP: Record<string, { icon: string; color: string }> = {
  // TUS dersleri
  'Anatomi': { icon: '🦴', color: '#6C63FF' },
  'Fizyoloji': { icon: '💓', color: '#FF6B6B' },
  'Biyokimya': { icon: '🧬', color: '#4ECDC4' },
  'Mikrobiyoloji': { icon: '🦠', color: '#45B7D1' },
  'Farmakoloji': { icon: '💊', color: '#96CEB4' },
  'Patoloji': { icon: '🔬', color: '#D4A574' },
  'Histoloji': { icon: '🧫', color: '#FF8A80' },
  'Embriyoloji': { icon: '🫒', color: '#B39DDB' },
  'Fizyopatoloji': { icon: '⚡', color: '#FFD54F' },
  'Dahiliye': { icon: '🩺', color: '#4DB6AC' },
  'Cerrahi': { icon: '🔪', color: '#EF5350' },
  'Pediatri': { icon: '👶', color: '#81D4FA' },
  'Kadın Doğum': { icon: '🤰', color: '#F48FB1' },
  'Nöroloji': { icon: '🧠', color: '#CE93D8' },
  'Psikiyatri': { icon: '🧘', color: '#A5D6A7' },
  'Dermatoloji': { icon: '🧴', color: '#FFCC80' },
  'Göz Hastalıkları': { icon: '👁️', color: '#80DEEA' },
  'KBB': { icon: '👂', color: '#FFAB91' },
  'Üroloji': { icon: '🫘', color: '#A1887F' },
  'Ortopedi': { icon: '🦿', color: '#90A4AE' },
  'Kardiyoloji': { icon: '❤️', color: '#E57373' },
  'Göğüs Hastalıkları': { icon: '🫁', color: '#4FC3F7' },
  'Enfeksiyon': { icon: '🔥', color: '#FF7043' },
  'Acil Tıp': { icon: '🚑', color: '#F44336' },
  'Radyoloji': { icon: '📡', color: '#7986CB' },
  'Anestezi': { icon: '😴', color: '#9FA8DA' },
  'Fizik Tedavi': { icon: '🏃', color: '#66BB6A' },
  'Halk Sağlığı': { icon: '🏘️', color: '#26A69A' },
  'Adli Tıp': { icon: '⚖️', color: '#78909C' },
  'Tıbbi Genetik': { icon: '🧪', color: '#AB47BC' },
  'Biyoistatistik': { icon: '📊', color: '#5C6BC0' },
  'Tıbbi Etik': { icon: '📜', color: '#8D6E63' },
  'Nükleer Tıp': { icon: '☢️', color: '#FFA726' },

  // DUS dersleri
  'Periodontoloji': { icon: '🦷', color: '#26C6DA' },
  'Endodonti': { icon: '🪥', color: '#7E57C2' },
  'Protetik': { icon: '🦷', color: '#42A5F5' },
  'Ortodonti': { icon: '😁', color: '#66BB6A' },
  'Pedodonti': { icon: '👶', color: '#FFA726' },
  'Ağız Cerrahisi': { icon: '🔪', color: '#EF5350' },
  'Restoratif': { icon: '🪥', color: '#AB47BC' },
  'Oral Diagnoz': { icon: '🔍', color: '#5C6BC0' },
  'Oral Patoloji': { icon: '🔬', color: '#D4A574' },
  'Ağız Radyolojisi': { icon: '📡', color: '#7986CB' },
}

export function getCourseIcon(courseName: string): { icon: string; color: string } {
  // Exact match
  if (COURSE_ICON_MAP[courseName]) return COURSE_ICON_MAP[courseName]

  // Partial match
  const key = Object.keys(COURSE_ICON_MAP).find(
    k => courseName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(courseName.toLowerCase())
  )
  if (key) return COURSE_ICON_MAP[key]

  // Fallback
  return { icon: '📖', color: '#78909C' }
}
