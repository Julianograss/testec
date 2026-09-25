import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useCart } from '../store/Cart';

interface CartBarProps {
  onPress: () => void;
}

export default function CartBar({ onPress }: CartBarProps) {
  const { cartCount, cartTotal } = useCart();

  if (cartCount === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={onPress}>
        <View style={styles.leftContent}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cartCount}</Text>
          </View>
          <Text style={styles.titleText}>Ver Carrinho</Text>
        </View>

        <View style={styles.rightContent}>
          <Text style={styles.priceText}>
            R$ {cartTotal.toFixed(2).replace('.', ',')}
          </Text>
          <ArrowRight size={20} color="#ffffff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 99,
  },
  button: {
    height: 56,
    backgroundColor: '#C84325',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#C84325',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  titleText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});