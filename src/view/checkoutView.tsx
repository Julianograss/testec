import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { X } from 'lucide-react-native';
import { useCart } from '../store/Cart'; // Importação do carrinho
import { addOrder } from '../store/Orders';
import { useTableSession } from '../store/table-session';
import { useAuth } from '../controller/AuthController';

const COLORS = {
  overlayBg: 'rgba(26, 26, 26, 0.6)',
  cardBg: '#FFFFFF',
  primary: '#C84325',
  primaryLight: '#FBE9E7',
  grayLight: '#F3F1EC',
  grayCircle: '#EBE8E2',
  border: '#D1CEC7',
  textMain: '#1A1A1A',
  textMuted: '#7A7571',
  textOverline: '#96908B',
};

export default function CheckoutScreen({ route, navigation }) {
  const { tableNumber, sessionActive } = useTableSession();
  const { user } = useAuth();
  const requestedOrderType = route?.params?.orderType || 'local';
  const orderType = sessionActive ? 'local' : requestedOrderType;
  const linkedTable = sessionActive ? tableNumber : route?.params?.tableNumber || null;
  const [paymentMethod, setPaymentMethod] = useState('pix'); 
  const [changeAmount, setChangeAmount] = useState('');

  // 1. Puxando dados e função de limpeza do carrinho
  const { cartTotal, items, clearCart } = useCart();

  const isDelivery = orderType === 'delivery';
  const title = isDelivery ? 'Pagamento da entrega' : 'Pagamento no local';
  const totalLabel = isDelivery ? 'Total com entrega' : 'Total da comanda';
  
  // 2. Calcula o valor final dinâmico (com taxa de + R$ 6.00 pro delivery)
  const valorFinal = isDelivery ? cartTotal + 6.00 : cartTotal;
  
  // 3. Formatação R$ 00,00
  const totalValue = `R$ ${valorFinal.toFixed(2).replace('.', ',')}`;

  const isButtonDisabled = paymentMethod === 'dinheiro' && changeAmount.trim() === '';

  const renderPaymentOption = (id, label) => {
    const isSelected = paymentMethod === id;
    return (
      <TouchableOpacity key={id} style={[styles.radioCard, isSelected && styles.radioCardSelected]} onPress={() => setPaymentMethod(id)} activeOpacity={0.8}>
        <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>{label}</Text>
        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.header}>
              <View>
                <Text style={styles.headerOverline}>Finalizar pedido</Text>
                <Text style={styles.headerTitle}>{title}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                <X color={COLORS.textMain} size={18} />
              </TouchableOpacity>
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>{totalLabel}</Text>
              <Text style={styles.totalValue}>{totalValue}</Text>
            </View>

            <Text style={styles.sectionTitle}>Como você quer pagar?</Text>

            <View style={styles.optionsContainer}>
              {renderPaymentOption('pix', 'Pix')}
              {renderPaymentOption('cartao', 'Cartão')}
              {isDelivery ? renderPaymentOption('dinheiro', 'Dinheiro') : renderPaymentOption('caixa', 'Pagar no caixa')}
            </View>

            {paymentMethod === 'pix' && (
              <View style={styles.pixContainer}>
                <Text style={styles.pixTitle}>PIX copia e cola</Text>
                <Text style={styles.pixSubtitle}>Use o código abaixo no app do seu banco.</Text>
                <View style={styles.pixCodeBox}>
                  <Text style={styles.pixCodeText}>
                    00020101021226890014br.gov.bcb.pix2567fogoefumaca.demo/pix/97a2a3b4c5d65204000053039865802BR5920Fogo e Fumaca LTDA6009Sao Paulo62070503***6304DEMO
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyButton}>
                  <Text style={styles.copyButtonText}>Copiar código PIX</Text>
                </TouchableOpacity>
              </View>
            )}

            {paymentMethod === 'dinheiro' && isDelivery && (
              <View style={styles.cashContainer}>
                <Text style={styles.cashTitle}>Com quanto você vai pagar?</Text>
                <TextInput style={styles.cashInput} placeholder="Ex.: 100,00" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={changeAmount} onChangeText={setChangeAmount} />
              </View>
            )}

            {/* 4. Botão Finaliza e Zera a Sacola */}
            <TouchableOpacity 
              style={[styles.submitButton, isButtonDisabled && styles.submitButtonDisabled]}
              disabled={isButtonDisabled}
              onPress={() => {
                addOrder({
                  type: orderType === 'delivery' ? 'Delivery' : orderType === 'retirada' ? 'Retirada' : 'Local',
                  customer: orderType === 'delivery' ? 'Cliente delivery' : linkedTable ? `Mesa ${linkedTable}` : 'Mesa do cliente',
                  table: linkedTable,
                  ownerId: user?.id,
                  ownerEmail: user?.email,
                  itemList: items.map(item => ({
                    name: item.title,
                    qty: item.quantity,
                    price: typeof item.price === 'number' ? item.price : Number(String(item.price).replace(',', '.')),
                  })),
                  payment: paymentMethod === 'cartao' ? 'Cartão' : paymentMethod === 'dinheiro' ? 'Dinheiro' : paymentMethod === 'caixa' ? 'Pagar no caixa' : 'Pix',
                  paymentStatus: paymentMethod === 'pix' || paymentMethod === 'cartao' ? 'Pago' : 'Pendente',
                  paidAt: paymentMethod === 'pix' || paymentMethod === 'cartao' ? Date.now() : null,
                });
                clearCart();
                Alert.alert('Sucesso!', 'Seu pedido foi finalizado e enviado para o atendimento.');
                navigation.navigate('homeView');
              }}
            >
              <Text style={styles.submitButtonText}>
                {paymentMethod === 'pix' ? 'Confirmar pagamento' : 'Finalizar pedido'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerDisclaimer}>
              Simulação de pagamento: nenhum valor será cobrado.
            </Text>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.overlayBg },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
  modalCard: { backgroundColor: COLORS.cardBg, borderRadius: 24, maxHeight: '95%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  scrollContent: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerOverline: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textMain, letterSpacing: -0.5 },
  closeButton: { width: 32, height: 32, backgroundColor: COLORS.grayCircle, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.grayLight, padding: 16, borderRadius: 12, marginBottom: 24 },
  totalLabel: { fontSize: 14, color: COLORS.textMuted },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain },
  sectionTitle: { fontSize: 13, color: COLORS.textMain, marginBottom: 12 },
  optionsContainer: { gap: 12, marginBottom: 20 },
  radioCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16 },
  radioCardSelected: { borderColor: COLORS.primary, backgroundColor: '#FFFBF9' },
  radioLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textMain },
  radioLabelSelected: { color: COLORS.textMain },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border },
  radioCircleSelected: { borderColor: COLORS.primary, borderWidth: 5 },
  pixContainer: { backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F9D8D2', marginBottom: 20 },
  pixTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  pixSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  pixCodeBox: { backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 12, marginBottom: 16 },
  pixCodeText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  copyButton: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  copyButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textMain },
  cashContainer: { backgroundColor: COLORS.grayLight, borderRadius: 16, padding: 16, marginBottom: 20 },
  cashTitle: { fontSize: 13, color: COLORS.textMain, marginBottom: 10 },
  cashInput: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 15, color: COLORS.textMain },
  submitButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  submitButtonDisabled: { backgroundColor: '#DFA89A' },
  submitButtonText: { color: COLORS.cardBg, fontSize: 16, fontWeight: 'bold' },
  footerDisclaimer: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }
});
