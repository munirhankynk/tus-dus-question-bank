import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SHADOWS, SPACING } from '../../constants'
import { supabase } from '../../services/supabase'

type Course = {
  id: string
  name: string
  color_code: string
  sort_order: number
  questions: { count: number }[]
}

export default function LibraryScreen() {

  const [courses, setCourses] = useState<Course[]>([])

  const loadCourses = async () => {

    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        color_code,
        sort_order,
        questions(count)
      `)
      .order('sort_order')

    if (!error && data) {
      setCourses(data as Course[])
    }

  }

  useEffect(() => {
    loadCourses()
  }, [])

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: SPACING.lg }}
      renderItem={({ item }) => {

        const count = item.questions?.[0]?.count ?? 0

        return (
          <View style={styles.card}>

            <View
              style={[
                styles.colorBar,
                { backgroundColor: item.color_code || COLORS.accent }
              ]}
            />

            <View style={styles.content}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.count}>{count} soru</Text>
            </View>

          </View>
        )

      }}
    />
  )
}

const styles = StyleSheet.create({

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.small
  },

  colorBar: {
    width: 6
  },

  content: {
    padding: SPACING.md,
    flex: 1
  },

  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.navy
  },

  count: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400
  }

})