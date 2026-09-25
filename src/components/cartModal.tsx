import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react-native';
import { useCart } from '../store/Cart';

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export default function CartModal({ visible, onClose, onCheckout }: CartModalProps) {
  const { items, addToCart, removeFromCart, cartTotal, mesa } = useCart();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <ShoppingBag size={22} color="#C84325" />
              <Text style={styles.title}>Seu Pedido</Text>
              {mesa && <Text style={styles.mesaBadge}>Mesa {mesa}</Text>}
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#7A7571" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const itemPrice =
                typeof item.price === 'string'
                  ? parseFloat(item.price.replace(',', '.'))
                  : item.price;

              return (
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemPrice}>
                      R$ {(itemPrice * item.quantity).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>

                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => removeFromCart(item.id)}>
                      {item.quantity === 1 ? (
                        <Trash2 size={16} color="#C84325" />
                      ) : (
                        <Minus size={16} color="#1A1A1A" />
                      )}
                    </TouchableOpacity>

                    <Text style={styles.qtyText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => addToCart(item)}>
                      <Plus size={16} color="#1A1A1A" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                R$ {cartTotal.toFixed(2).replace('.', ',')}
              </Text>
            </View>

            <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
              <Text style={styles.checkoutBtnText}>Avançar para Pagamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#EBE8E2',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F1EC',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  mesaBadge: {
    backgroundColor: '#FBE9E7',
    color: '#C84325',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    paddingVertical: 12,
    gap: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemPrice: {
    fontSize: 14,
    color: '#7A7571',
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F1EC',
    borderRadius: 12,
    padding: 4,
    gap: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F1EC',
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#7A7571',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  checkoutBtn: {
    height: 52,
    backgroundColor: '#C84325',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});