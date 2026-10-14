import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { ScanLine } from 'lucide-react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { getTableCodeFromInput, normalizeTableCode, formatTableCode, TABLE_CODE_LENGTH } from '../utils/tableLinks';

interface ScannerProps {
  /** Recebe o link do QR ou o código digitado. Devolve uma mensagem de erro (ou nada, se deu certo). */
  onCodeRead: (data: string) => Promise<string | null | void> | string | null | void;
  onClose: () => void;
}

/**
 * Tela de vínculo com a mesa. Oferece sempre as duas formas de entrar:
 *  1. Escanear o QR Code com a câmera (celular, app e navegador com HTTPS).
 *  2. Digitar o código impresso abaixo do QR Code (para quem não tem/ não quer usar a câmera).
 * No app nativo a câmera abre direto; no navegador a tela mostra os dois botões.
 */
export default function Scanner({ onCodeRead, onClose }: ScannerProps) {
  const isWeb = Platform.OS === 'web';
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [useCamera, setUseCamera] = useState(!isWeb);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const submitManual = async () => {
    const code = getTableCodeFromInput(manualValue);
    if (!code) {
      setManualError(`Digite os ${TABLE_CODE_LENGTH} caracteres do código impresso abaixo do QR Code.`);
      return;
    }
    setManualError(null);
    setBusy(true);
    const error = await onCodeRead(code);
    setBusy(false);
    if (error) setManualError(error);
  };

  const renderManualForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.manualWrap}>
      <Text style={styles.manualTitle}>Entrar na mesa</Text>

      <TouchableOpacity
        style={styles.cameraButton}
        onPress={() => {
          setScanned(false);
          setManualError(null);
          setUseCamera(true);
        }}>
        <ScanLine size={22} color="#fff" />
        <Text style={styles.cameraButtonText}>Escanear QR Code com a câmera</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou digite o código</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.manualHint}>
        Sem câmera? Digite o código impresso logo abaixo do QR Code da sua mesa. Todos que usarem o mesmo código entram na mesma mesa.
      </Text>
      <TextInput
        style={styles.manualInput}
        value={formatTableCode(manualValue)}
        onChangeText={(value) => {
          setManualValue(normalizeTableCode(value).slice(0, TABLE_CODE_LENGTH));
          setManualError(null);
        }}
        placeholder="K7Q-4MX"
        placeholderTextColor="#B5B0A9"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={TABLE_CODE_LENGTH + 1}
        onSubmitEditing={submitManual}
      />
      {manualError ? <Text style={styles.manualError}>{manualError}</Text> : null}
      <TouchableOpacity style={[styles.manualButton, busy && { opacity: 0.6 }]} onPress={submitManual} disabled={busy}>
        <Text style={styles.manualButtonText}>{busy ? 'Entrando…' : 'Entrar na mesa'}</Text>
      </TouchableOpacity>
      <View style={{ marginTop: 14 }}>
        <Button onPress={onClose} title="Fechar" color="#333" />
      </View>
    </KeyboardAvoidingView>
  );

  if (!useCamera) {
    return <View style={styles.center}>{renderManualForm()}</View>;
  }

  // Aguardando a resposta do sistema sobre as permissões
  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Carregando permissões...</Text>
      </View>
    );
  }

  // Se a permissão não foi concedida, exibe a tela de solicitação (com alternativa manual)
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Precisamos da sua permissão para utilizar a câmera.
        </Text>
        <Button onPress={requestPermission} title="Conceder Permissão" />
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setUseCamera(false)}>
          <Text style={styles.manualSwitchText}>Prefiro digitar o código da mesa</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 10 }}>
          <Button onPress={onClose} title="Cancelar" color="#ff4444" />
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    setScanned(true);
    const error = await onCodeRead(data); // Envia o dado escaneado para o componente pai
    if (error) {
      // QR de outro lugar / código inválido: avisa e volta para a câmera.
      setManualError(error);
      setUseCamera(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'], // Otimizado para focar apenas em QR Codes
        }}
      />

      <View style={styles.overlayContainer}>
        {/* Guia visual centralizada para o usuário posicionar o código */}
        <View style={styles.scanTarget} />

        <TouchableOpacity style={styles.manualLink} onPress={() => setUseCamera(false)}>
          <Text style={styles.manualLinkText}>Sem câmera? Digite o código abaixo do QR Code</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <Button title="Fechar Câmera" onPress={onClose} color="#333" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#6344FF', // Ajustado para o roxo padrão do projeto
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    width: '80%',
  },
  manualLink: {
    position: 'absolute',
    bottom: 100,
  },
  manualLinkText: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontSize: 13,
  },
  manualWrap: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'stretch',
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  manualHint: {
    fontSize: 13,
    color: '#7A7571',
    textAlign: 'center',
    marginBottom: 18,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#D1CEC7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  manualError: {
    color: '#C62828',
    fontSize: 12,
    marginTop: 8,
  },
  manualButton: {
    backgroundColor: '#C84325',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6344FF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0DDD6',
  },
  dividerText: {
    fontSize: 12,
    color: '#7A7571',
    fontWeight: '600',
  },
  manualSwitch: {
    marginTop: 16,
    alignItems: 'center',
  },
  manualSwitchText: {
    color: '#6344FF',
    fontSize: 13,
    fontWeight: '600',
  },
});
