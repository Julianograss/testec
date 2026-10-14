import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { Alert } from '../utils/alert';
import { tableCodesApi, type TableQrInfo } from '../services/api';
import { formatTableCode, getTableQrUrl } from '../utils/tableLinks';

type Props = {
  visible: boolean;
  /** Número da mesa com 2 dígitos ("05"). */
  tableNumber: string | null;
  onClose: () => void;
};

/**
 * QR Code da mesa (admin).
 *  - Mostra a imagem do QR enviada pelo admin; sem imagem, mostra o QR gerado pelo sistema.
 *  - O código de entrada fica sempre embaixo, para quem não consegue usar a câmera.
 *  - Admin pode enviar, trocar ou excluir a imagem.
 */
export default function TableQrModal({ visible, tableNumber, onClose }: Props) {
  const [info, setInfo] = useState<TableQrInfo | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!tableNumber) return;
    setLoading(true);
    setError(null);
    try {
      const found = (await tableCodesApi.list())[tableNumber];
      if (!found) {
        setInfo(null);
        setImageUrl(null);
        setError('Esta mesa ainda não tem código. Rode os scripts 002 e 003 no Supabase.');
        return;
      }
      setInfo(found);
      setImageUrl(found.imagePath ? await tableCodesApi.imageUrl(found.imagePath) : null);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar o QR Code.');
    } finally {
      setLoading(false);
    }
  }, [tableNumber]);

  useEffect(() => {
    if (visible) {
      setInfo(null);
      setImageUrl(null);
      void load();
    }
  }, [visible, load]);

  const hasImage = !!info?.imagePath;

  const pickImage = async () => {
    if (!tableNumber) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permissão necessária', 'Permita acesso à galeria para escolher a imagem do QR Code.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (result.canceled || !result.assets[0]?.uri) return;

    setSaving(true);
    try {
      await tableCodesApi.uploadImage(tableNumber, result.assets[0].uri);
      await load();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar a imagem', e?.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = () =>
    Alert.alert('Excluir imagem do QR Code', `A imagem da mesa ${tableNumber} será removida e o sistema volta a usar o QR Code gerado automaticamente.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir imagem',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await tableCodesApi.removeImage(tableNumber as string);
            await load();
          } catch (e: any) {
            Alert.alert('Não foi possível excluir', e?.message || 'Tente novamente.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);

  const rotate = () =>
    Alert.alert(
      'Gerar novo código',
      `O QR Code e o código atuais da mesa ${tableNumber} deixam de funcionar${hasImage ? ' e a imagem enviada será removida' : ''}. Será preciso imprimir de novo. Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar novo',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await tableCodesApi.rotate(tableNumber as string, info?.imagePath);
              await load();
            } catch (e: any) {
              Alert.alert('Não foi possível gerar', e?.message || 'Tente novamente.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );

  const printHtml = (qrSrc: string) => {
    const html = `
      <html><body style="font-family:Arial,sans-serif;text-align:center;padding:40px">
        <h1 style="margin:0">Fogo &amp; Fumaça</h1>
        <h2 style="margin:8px 0 24px">Mesa ${tableNumber}</h2>
        <img src="${qrSrc}" style="width:320px;height:320px;object-fit:contain" />
        <p style="margin:24px 0 4px;font-size:16px">Escaneie para pedir pelo celular</p>
        <p style="margin:0;color:#555">Sem câmera? Digite o código no app:</p>
        <p style="font-size:44px;letter-spacing:10px;font-weight:bold;margin:8px 0">${formatTableCode(info!.code)}</p>
      </body></html>`;
    void Print.printAsync({ html });
  };

  const print = () => {
    if (!info) return;
    if (imageUrl) return printHtml(imageUrl);
    if (!qrRef.current?.toDataURL) return;
    qrRef.current.toDataURL((base64: string) => printHtml(`data:image/png;base64,${base64}`));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Mesa {tableNumber}</Text>
            <Text style={styles.subtitle}>QR Code e código de entrada da mesa</Text>

            {loading ? (
              <ActivityIndicator style={{ marginVertical: 60 }} color="#C84325" />
            ) : info ? (
              <>
                <View style={styles.qrBox}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.qrImage} resizeMode="contain" />
                  ) : (
                    <QRCode value={getTableQrUrl(info.code)} size={200} getRef={(c: any) => (qrRef.current = c)} />
                  )}
                  {saving && (
                    <View style={styles.savingOverlay}>
                      <ActivityIndicator color="#C84325" />
                    </View>
                  )}
                </View>
                <Text style={styles.source}>
                  {hasImage ? 'Imagem enviada por você' : 'QR Code gerado pelo sistema'}
                </Text>

                <View style={styles.imageActions}>
                  <TouchableOpacity style={styles.outline} onPress={pickImage} disabled={saving}>
                    <Text style={styles.outlineText}>{hasImage ? 'Trocar imagem' : 'Enviar imagem do QR Code'}</Text>
                  </TouchableOpacity>
                  {hasImage && (
                    <TouchableOpacity style={[styles.outline, styles.outlineDanger]} onPress={deleteImage} disabled={saving}>
                      <Text style={[styles.outlineText, { color: '#C62828' }]}>Excluir imagem</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.codeHint}>Sem câmera? Digite este código no app:</Text>
                <Text style={styles.code}>{formatTableCode(info.code)}</Text>
                <Text style={styles.note}>
                  {hasImage
                    ? 'A imagem enviada deve ser o QR Code que abre o endereço abaixo, senão o cliente não entra na mesa:'
                    : 'Vários aparelhos podem entrar na mesma mesa com este QR/código. Ao fechar a conta e liberar a mesa, todos saem automaticamente.'}
                </Text>
                {hasImage && <Text style={styles.url}>{getTableQrUrl(info.code)}</Text>}

                <TouchableOpacity style={styles.primary} onPress={print} disabled={saving}>
                  <Text style={styles.primaryText}>Imprimir QR e código</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghost} onPress={rotate} disabled={saving}>
                  <Text style={styles.ghostText}>Gerar novo código</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.error}>{error || 'Código indisponível.'}</Text>
            )}

            <TouchableOpacity style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>Fechar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 400, maxHeight: '92%' },
  scroll: { padding: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#7A7571', marginTop: 2, marginBottom: 18 },
  qrBox: { padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0DDD6', minWidth: 232, minHeight: 232, alignItems: 'center', justifyContent: 'center' },
  qrImage: { width: 220, height: 220 },
  savingOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  source: { fontSize: 12, color: '#7A7571', marginTop: 8 },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  outline: { borderWidth: 1, borderColor: '#D1CEC7', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  outlineDanger: { borderColor: '#EFB8B8' },
  outlineText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  codeHint: { fontSize: 13, color: '#7A7571', marginTop: 20 },
  code: { fontSize: 34, fontWeight: '800', letterSpacing: 6, color: '#1A1A1A', marginTop: 4 },
  url: { fontSize: 11, color: '#A09A94', marginTop: 4, textAlign: 'center' },
  note: { fontSize: 12, color: '#7A7571', textAlign: 'center', marginTop: 12 },
  primary: { backgroundColor: '#C84325', borderRadius: 12, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  ghost: { paddingVertical: 12 },
  ghostText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  error: { color: '#C62828', textAlign: 'center', marginVertical: 30 },
  close: { paddingVertical: 8, marginTop: 4 },
  closeText: { color: '#7A7571', fontWeight: '700' },
});
