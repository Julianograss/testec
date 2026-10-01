import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { getTableNumberFromLink } from '../utils/tableLinks';

interface ScannerProps {
  onCodeRead: (data: string) => void;
  onClose: () => void;
}

/**
 * Tela de vínculo com a mesa.
 * - No celular/app nativo: abre a câmera e lê o QR Code direto.
 * - Na web: a leitura de código de barras pela câmera do navegador é
 *   inconsistente entre aparelhos, então aqui priorizamos a entrada manual
 *   (colar o link do QR ou digitar o número da mesa) — o fluxo "de verdade"
 *   na web é o cliente abrir a câmera do próprio celular, que já leva direto
 *   para a URL da mesa.
 */
export default function Scanner({ onCodeRead, onClose }: ScannerProps) {
  const isWeb = Platform.OS === 'web';
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [useCamera, setUseCamera] = useState(!isWeb);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const submitManual = () => {
    const table = getTableNumberFromLink(manualValue);
    if (!table) {
      setManualError('Cole o link do QR Code (ex.: .../mesa/12) ou digite só o número da mesa.');
      return;
    }
    setManualError(null);
    onCodeRead(manualValue.trim());
  };

  const renderManualForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.manualWrap}>
      <Text style={styles.manualTitle}>Vincular mesa manualmente</Text>
      <Text style={styles.manualHint}>
        Cole o link do QR Code da mesa (ex.: https://seudominio.com/mesa/12) ou digite apenas o número da mesa.
      </Text>
      <TextInput
        style={styles.manualInput}
        value={manualValue}
        onChangeText={(value) => { setManualValue(value); setManualError(null); }}
        placeholder="Ex.: 12 ou o link completo"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={submitManual}
      />
      {manualError ? <Text style={styles.manualError}>{manualError}</Text> : null}
      <TouchableOpacity style={styles.manualButton} onPress={submitManual}>
        <Text style={styles.manualButtonText}>Vincular mesa</Text>
      </TouchableOpacity>
      {!isWeb && (
        <TouchableOpacity style={styles.manualSwitch} onPress={() => setUseCamera(true)}>
          <Text style={styles.manualSwitchText}>Usar a câmera para escanear</Text>
        </TouchableOpacity>
      )}
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
          <Text style={styles.manualSwitchText}>Prefiro digitar o número da mesa</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 10 }}>
          <Button onPress={onClose} title="Cancelar" color="#ff4444" />
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setScanned(true);
    onCodeRead(data); // Envia o dado escaneado para o componente pai
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
          <Text style={styles.manualLinkText}>Não consigo escanear — digitar o número da mesa</Text>
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
    fontSize: 15,
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
