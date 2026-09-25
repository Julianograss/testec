import React, { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

interface ScannerProps {
  onCodeRead: (data: string) => void;
  onClose: () => void;
}

export default function Scanner({ onCodeRead, onClose }: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Aguardando a resposta do sistema sobre as permissões
  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Carregando permissões...</Text>
      </View>
    );
  }

  // Se a permissão não foi concedida, exibe a tela de solicitação
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Precisamos da sua permissão para utilizar a câmera.
        </Text>
        <Button onPress={requestPermission} title="Conceder Permissão" />
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
});