import { Platform } from "react-native";
import {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  ReduceMotion,
  ZoomIn,
} from "react-native-reanimated";
import { MOTION } from "../styles/theme";

/**
 * Animações padrão (docs/04 seção 6). Todas usam ReduceMotion.System: com
 * "remover animações" ativo no aparelho, o Reanimated aplica o estado final na hora.
 *
 * Na web (só a visualização no navegador; o app final é nativo) as animações de entrada e saída
 * ficam desligadas: o Reanimated congela cada elemento animado com `position: absolute` e largura
 * em pixels, e a tela deixa de refluir quando a janela é redimensionada (por exemplo no modo de
 * dispositivo do DevTools). Os helpers devolvem `undefined`, que o `entering`/`exiting` aceita.
 */

export function animacoesAtivas(): boolean {
  return Platform.OS !== "web";
}

export const CURVA = Easing.bezier(...MOTION.easing);

/** Entrada em cascata: sobe 10px e aparece. */
export function entrada(atrasoMs = 0) {
  if (!animacoesAtivas()) return undefined;
  return FadeInUp.duration(MOTION.enter.duration)
    .delay(atrasoMs)
    .easing(CURVA)
    .withInitialValues({ opacity: 0, transform: [{ translateY: MOTION.enter.offsetY }] })
    .reduceMotion(ReduceMotion.System);
}

/** Atraso do item `indice` numa cascata que começa em `inicioMs`. */
export function cascata(indice: number, inicioMs = 0) {
  return inicioMs + indice * MOTION.enter.stagger;
}

export function surgir(atrasoMs = 0, duracaoMs = 600) {
  if (!animacoesAtivas()) return undefined;
  return FadeIn.duration(duracaoMs).delay(atrasoMs).reduceMotion(ReduceMotion.System);
}

export function sumir(duracaoMs = 250) {
  if (!animacoesAtivas()) return undefined;
  return FadeOut.duration(duracaoMs).reduceMotion(ReduceMotion.System);
}

/** Entrada de uma célula do calendário ou do mapa de calor: cresce de 60% a 100%. */
export function entradaDeCelula(atrasoMs: number) {
  if (!animacoesAtivas()) return undefined;
  return ZoomIn.duration(MOTION.cells.duration)
    .delay(atrasoMs)
    .easing(CURVA)
    .withInitialValues({ transform: [{ scale: MOTION.cells.fromScale }] })
    .reduceMotion(ReduceMotion.System);
}

export function toastEntrada() {
  if (!animacoesAtivas()) return undefined;
  return FadeInUp.duration(MOTION.toast.duration)
    .delay(MOTION.toast.delay)
    .easing(CURVA)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 24 }] })
    .reduceMotion(ReduceMotion.System);
}

export function toastSaida() {
  if (!animacoesAtivas()) return undefined;
  return FadeOutDown.duration(250).reduceMotion(ReduceMotion.System);
}
