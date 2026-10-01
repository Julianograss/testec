/**
 * src/utils/alert.ts
 *
 * Substituto do `Alert` do React Native que funciona também na web.
 * No react-native-web o Alert.alert não faz nada (nem mostra a mensagem,
 * nem executa os botões). Aqui, na web usamos window.alert / window.confirm
 * e chamamos o onPress certo; no celular continua o Alert nativo.
 *
 * Uso: troque `import { Alert } from 'react-native'` por
 *      `import { Alert } from '../utils/alert'` — a assinatura é a mesma.
 */
import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: (value?: any) => void;
};

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') {
      RNAlert.alert(title, message, buttons as any);
      return;
    }

    const g = globalThis as any;
    const body = [title, message].filter(Boolean).join('\n\n');

    // Aviso simples (0 ou 1 botão): mostra e executa o botão, se houver.
    if (!buttons || buttons.length <= 1) {
      g.alert?.(body);
      buttons?.[0]?.onPress?.();
      return;
    }

    // Confirmação: OK executa a ação principal, Cancelar executa o botão "cancel".
    const cancelButton = buttons.find(button => button.style === 'cancel');
    const confirmButton = [...buttons].reverse().find(button => button.style !== 'cancel');
    const label = confirmButton?.text ? `\n\n(OK para "${confirmButton.text}")` : '';
    const accepted = g.confirm ? g.confirm(`${body}${label}`) : true;

    if (accepted) confirmButton?.onPress?.();
    else cancelButton?.onPress?.();
  },
};
