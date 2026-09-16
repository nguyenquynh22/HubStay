// src/screens/main/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { MOCK_POSTS, Post } from '../../types/mockData';

interface Props {
  onSelectPost: (post: Post) => void;
}

export default function HomeScreen({ onSelectPost }: Props) {
  return (
    <View style={styles.container}>
      {/* Header Tìm Kiếm */}
      <View style={styles.searchHeader}>
        <Text style={styles.headerTitle}>📍 Khu vực: UTEHY Hưng Yên</Text>
        <Text style={styles.searchBar}>🔍 Tìm theo tên trường, bán kính 2km...</Text>
      </View>

      {/* List Bài đăng */}
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelectPost(item)}>
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{item.badge}</Text>
                {item.isVerifiedHost && <Text style={styles.verifiedTag}>✓ Uy tín</Text>}
              </View>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.price}>{item.price}</Text>
              <Text style={styles.address}>📍 {item.address}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  searchHeader: { backgroundColor: '#00B14F', padding: 16 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  searchBar: { backgroundColor: '#FFF', borderRadius: 8, padding: 10, marginTop: 8, color: '#6B7280', fontSize: 13 },
  card: { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 12, overflow: 'hidden', flexDirection: 'row', elevation: 2 },
  cardImage: { width: 110, height: 110 },
  cardContent: { flex: 1, padding: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  badge: { backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedTag: { backgroundColor: '#DCFCE7', color: '#15803D', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  price: { fontSize: 14, color: '#00B14F', fontWeight: 'bold', marginVertical: 4 },
  address: { fontSize: 12, color: '#6B7280' },
});