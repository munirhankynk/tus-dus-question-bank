import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native'
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from '../../constants'

const { width } = Dimensions.get('window')

type Slide = {
  emoji: string
  title: string
  subtitle: string
  features: { icon: string; text: string }[]
  gradient: string
}

const slides: Slide[] = [
  {
    emoji: '🏥',
    title: 'MedBank',
    subtitle: 'TUS & DUS soru arşivini oluştur, tekrar et, başar.',
    features: [
      { icon: '📸', text: 'Soru fotoğraflarını çek ve yükle' },
      { icon: '📂', text: 'Derse göre otomatik kategorize et' },
      { icon: '⭐', text: 'Favorilerini ve notlarını kaydet' },
    ],
    gradient: COLORS.accent,
  },
  {
    emoji: '🔁',
    title: 'Aylık Soru Tekrarı',
    subtitle: 'Yanlış yaptığın ve favori sorularını her ay tekrar et.',
    features: [
      { icon: '📅', text: 'Ay ve ders seçerek filtrele' },
      { icon: '🖼️', text: 'Slayt halinde sorularını gözden geçir' },
      { icon: '📝', text: 'Her soruya not ekle, durumunu işaretle' },
    ],
    gradient: COLORS.premium,
  },
  {
    emoji: '👥',
    title: 'Birlikte Çalış',
    subtitle: 'Arkadaşlarınla grup oluştur, ortak kütüphane ile birlikte öğren.',
    features: [
      { icon: '🤝', text: '5 kişiye kadar çalışma grubu kur' },
      { icon: '📚', text: 'Grubun tüm sorularını tek kütüphanede gör' },
      { icon: '🚀', text: 'Birlikte çalış, birlikte başar' },
    ],
    gradient: COLORS.green,
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
    }
  }

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true')
    router.replace('/(auth)/login' as any)
  }

  const isLast = currentIndex === slides.length - 1

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Üst kısım — emoji ve başlık */}
            <View style={styles.topSection}>
              <View style={[styles.emojiCircle, { backgroundColor: item.gradient + '20' }]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>

            {/* Alt kısım — özellik kartları */}
            <View style={styles.featuresCard}>
              {item.features.map((f: { icon: string; text: string }, idx: number) => (
                <View key={idx} style={styles.featureRow}>
                  <View style={[styles.featureIconBox, { backgroundColor: item.gradient + '15' }]}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                  </View>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex && [styles.dotActive, { backgroundColor: slides[currentIndex].gradient }],
            ]}
          />
        ))}
      </View>

      {/* Bottom */}
      <View style={styles.bottomRow}>
        {!isLast ? (
          <>
            <TouchableOpacity onPress={finish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Atla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: slides[currentIndex].gradient }]} onPress={goNext}>
              <Text style={styles.nextBtnText}>Devam  →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, styles.startBtn, { backgroundColor: slides[currentIndex].gradient }]}
            onPress={finish}
          >
            <Text style={styles.nextBtnText}>Hadi Başlayalım!</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emojiCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray300,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.sm,
  },
  featuresCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray400,
    marginHorizontal: 5,
  },
  dotActive: {
    width: 28,
    borderRadius: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl + SPACING.md,
    gap: SPACING.md,
  },
  skipBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  skipText: {
    color: COLORS.gray300,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  nextBtn: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xl + SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  startBtn: {
    flex: 1,
  },
  nextBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md + 1,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
})
