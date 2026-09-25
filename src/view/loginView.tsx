import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Utensils,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  LogOut,
  Compass,
  UserPlus,
  ShieldCheck,
  Info,
} from 'lucide-react-native';
import { useAuth } from '../controller/AuthController';

// Mapa de para onde cada papel de usuário deve ser enviado após o login
const ROUTE_BY_ROLE: Record<string, string> = {
  CLIENT: 'homeView',
  ATTENDANT: 'atendimentoView',
  KITCHEN: 'cozinhaView',
  ADMIN: 'adminView',
};

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      setInvalidField('email');
      setActiveMessage('Informe seu e-mail para entrar.');
      return;
    }

    if (!password) {
      setInvalidField('password');
      setActiveMessage('Informe sua senha para entrar.');
      return;
    }

    setInvalidField(null);
    setActiveMessage(null);
    setIsSubmitting(true);

    try {
      // Autentica de verdade contra o AuthController (contas de demonstração)
      const loggedUser = await login(email.trim(), password);
      const destination = ROUTE_BY_ROLE[loggedUser.role] || 'homeView';
      // replace() impede que o usuário volte para o login com o botão "voltar"
      navigation?.replace(destination);
    } catch (error: any) {
      setActiveMessage(error?.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = () => {
    setInvalidField(null);
    setActiveMessage('Modo visitante ativo. Você pode explorar o cardápio sem criar uma conta.');
    navigation?.navigate('homeView');
  };

  const handleCreateAccount = (e?: React.MouseEvent | any) => {
    if (e && e.preventDefault) {
      e.preventDefault(); // Evita que a página recarregue na Web
    }
    setInvalidField(null);
    navigation?.navigate('registerView');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Utensils size={36} color="#6344FF" />
              </View>
              <Text style={styles.title}>Login</Text>
              <Text style={styles.subtitle}>
                Entre para guardar seu historico de compra ou fazer pedidos de casa.
              </Text>
            </View>

            {/* Inputs */}
            <View style={styles.formGroup}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>E-mail</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    invalidField === 'email' && styles.inputError,
                  ]}>
                  <Mail size={20} color="#71717a" style={styles.fieldIcon} />
                  <TextInput
                    accessibilityLabel="E-mail"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={(value) => {
                      setEmail(value);
                      setInvalidField(null);
                      setActiveMessage(null);
                    }}
                    placeholder="Digite seu e-mail"
                    placeholderTextColor="#a1a1aa"
                    returnKeyType="next"
                    value={email}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Senha</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    invalidField === 'password' && styles.inputError,
                  ]}>
                  <LockKeyhole size={20} color="#71717a" style={styles.fieldIcon} />
                  <TextInput
                    accessibilityLabel="Senha"
                    onChangeText={(value) => {
                      setPassword(value);
                      setInvalidField(null);
                      setActiveMessage(null);
                    }}
                    onSubmitEditing={handleLogin}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#a1a1aa"
                    returnKeyType="done"
                    secureTextEntry={!isPasswordVisible}
                    value={password}
                    style={styles.textInput}
                  />
                  <TouchableOpacity
                    style={styles.toggleEye}
                    onPress={() => setIsPasswordVisible((v) => !v)}>
                    {isPasswordVisible ? (
                      <EyeOff size={20} color="#71717a" />
                    ) : (
                      <Eye size={20} color="#71717a" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Mensagem de Alerta */}
            {activeMessage ? (
              <View style={styles.alertBox}>
                <Info size={18} color="#6344FF" />
                <Text style={styles.alertText}>{activeMessage}</Text>
              </View>
            ) : null}

            {/* Botões */}
              <View style={styles.actions}>
                {/* 1. Entrar */}
                <TouchableOpacity
                  style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" style={styles.buttonIcon} />
                  ) : (
                    <LogOut size={20} color="#ffffff" style={styles.buttonIcon} />
                  )}
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                  </Text>
                </TouchableOpacity>

                {/* 2. Criar minha conta */}
                <TouchableOpacity style={styles.outlineButton} onPress={handleCreateAccount}>
                  <UserPlus size={20} color="#6344FF" style={styles.buttonIcon} />
                  <Text style={styles.outlineButtonText}>Criar minha conta</Text>
                </TouchableOpacity>

                {/* 3. Continuar sem login */}
                <TouchableOpacity style={styles.ghostButton} onPress={handleGuestAccess}>
                  <Compass size={20} color="#6344FF" style={styles.buttonIcon} />
                  <Text style={styles.ghostButtonText}>Continuar sem login</Text>
                </TouchableOpacity>
              </View>

            {/* Contas de demonstração (dado fixo, só para facilitar o teste) */}
            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>Contas de demonstração</Text>
              <Text style={styles.demoLine}>Cliente — lucas@gmail.com</Text>
              <Text style={styles.demoLine}>Atendimento — joao@gmail.com</Text>
              <Text style={styles.demoLine}>Cozinha — augusto@gmail.com</Text>
              <Text style={styles.demoLine}>Admin — admin@gmail.com</Text>
              <Text style={styles.demoLine}>Senha para todas: 123456</Text>
            </View>

            {/* Rodapé de Privacidade */}
            <View style={styles.privacyCard}>
              <View style={styles.privacyIconBg}>
                <ShieldCheck size={18} color="#71717a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Sua privacidade importa</Text>
                <Text style={styles.privacySub}>
                  Seus dados são usados apenas para personalizar sua experiência no Cardápio Nativo.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    height: 80,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#EEECFF',
  },
  title: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#09090b',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    color: '#71717a',
    lineHeight: 20,
  },
  formGroup: {
    marginTop: 32,
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#09090b',
  },
  inputWrapper: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#09090b',
  },
  toggleEye: {
    padding: 4,
  },
  alertBox: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#F4F3FF',
    padding: 14,
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#27272a',
  },
  actions: {
    marginTop: 28,
    gap: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6344FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  outlineButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D2C9FF',
    backgroundColor: '#F8F7FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#6344FF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  ghostButton: {
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#6344FF',
    fontWeight: '600',
    fontSize: 15,
  },
  demoCard: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#FAFAFA',
    padding: 14,
    gap: 2,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090b',
    marginBottom: 4,
  },
  demoLine: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 18,
  },
  privacyCard: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#FAFAFA',
    padding: 16,
    gap: 12,
  },
  privacyIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#09090b',
  },
  privacySub: {
    marginTop: 2,
    fontSize: 12,
    color: '#71717a',
    lineHeight: 18,
  },
});