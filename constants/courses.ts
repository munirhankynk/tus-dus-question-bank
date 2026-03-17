export interface CourseData {
  name: string;
  colorCode: string;
  sortOrder: number;
}

export const TUS_COURSES: CourseData[] = [
  { name: 'Anatomi', colorCode: '#4F8CFF', sortOrder: 1 },
  { name: 'Histoloji ve Embriyoloji', colorCode: '#8B5CF6', sortOrder: 2 },
  { name: 'Fizyoloji', colorCode: '#14B8A6', sortOrder: 3 },
  { name: 'Tıbbi Biyokimya', colorCode: '#F59E0B', sortOrder: 4 },
  { name: 'Tıbbi Mikrobiyoloji', colorCode: '#10B981', sortOrder: 5 },
  { name: 'Tıbbi Patoloji', colorCode: '#7C3AED', sortOrder: 6 },
  { name: 'Tıbbi Farmakoloji', colorCode: '#EF4444', sortOrder: 7 },
  { name: 'Dahiliye (İç Hastalıkları)', colorCode: '#3B82F6', sortOrder: 8 },
  { name: 'Pediatri', colorCode: '#F97316', sortOrder: 9 },
  { name: 'Genel Cerrahi', colorCode: '#DC2626', sortOrder: 10 },
  { name: 'Kadın Hastalıkları ve Doğum', colorCode: '#EC4899', sortOrder: 11 },
  { name: 'Küçük Stajlar', colorCode: '#64748B', sortOrder: 12 },
];

export const DUS_COURSES: CourseData[] = [
  { name: 'Anatomi', colorCode: '#4F8CFF', sortOrder: 1 },
  { name: 'Histoloji ve Embriyoloji', colorCode: '#8B5CF6', sortOrder: 2 },
  { name: 'Fizyoloji', colorCode: '#14B8A6', sortOrder: 3 },
  { name: 'Tıbbi Biyokimya', colorCode: '#F59E0B', sortOrder: 4 },
  { name: 'Tıbbi Mikrobiyoloji', colorCode: '#10B981', sortOrder: 5 },
  { name: 'Tıbbi Patoloji', colorCode: '#7C3AED', sortOrder: 6 },
  { name: 'Tıbbi Farmakoloji', colorCode: '#EF4444', sortOrder: 7 },
  { name: 'Tıbbi Biyoloji ve Genetik', colorCode: '#06B6D4', sortOrder: 8 },
  { name: 'Restoratif Diş Tedavisi', colorCode: '#3B82F6', sortOrder: 9 },
  { name: 'Protetik Diş Tedavisi', colorCode: '#EC4899', sortOrder: 10 },
  { name: 'Ağız, Diş ve Çene Cerrahisi', colorCode: '#DC2626', sortOrder: 11 },
  { name: 'Ağız, Diş ve Çene Radyolojisi', colorCode: '#64748B', sortOrder: 12 },
  { name: 'Periodontoloji', colorCode: '#F97316', sortOrder: 13 },
  { name: 'Ortodonti', colorCode: '#84CC16', sortOrder: 14 },
  { name: 'Endodonti', colorCode: '#A855F7', sortOrder: 15 },
  { name: 'Pedodonti (Çocuk Diş Hekimliği)', colorCode: '#22C55E', sortOrder: 16 },
];