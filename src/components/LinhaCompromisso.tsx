import { Pressable, StyleSheet, View } from "react-native";
import type { Ocorrencia } from "../domain/agenda";
import { SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

type LinhaCompromissoProps = {
  ocorrencia: Ocorrencia;
  emConflito: boolean;
  aoPressionar: () => void;
};

export default function LinhaCompromisso({
  ocorrencia,
  emConflito,
  aoPressionar,
}: LinhaCompromissoProps) {
  const { colors } = useTheme();
  const { atividade, inicio, fim, detalhe, origem } = ocorrencia;
  const horario = fim === null ? inicio : `${inicio} a ${fim}`;
  const avulso = origem === "avulso";

  const descricao = [
    atividade.nome,
    horario,
    detalhe,
    avulso ? "só neste dia" : null,
    emConflito ? "conflito de horário" : null,
  ]
    .filter((parte): parte is string => parte !== null && parte !== undefined)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={descricao}
      onPress={aoPressionar}
      style={styles.linha}
    >
      <View style={[styles.circulo, { backgroundColor: colors.sunk }]}>
        <Icon name={atividade.icone} color={colors.ink} size={20} />
      </View>
      <View style={styles.texto}>
        <Text variant="body" numberOfLines={1}>
          {atividade.nome}
        </Text>
        <Text variant="support" color="mute">
          {horario}
        </Text>
        {detalhe ? (
          <Text variant="caption" color="mute" numberOfLines={1}>
            {detalhe}
          </Text>
        ) : null}
        {avulso ? (
          <Text variant="caption" color="mute">
            só neste dia
          </Text>
        ) : null}
        {emConflito ? (
          <Text variant="caption" color="accentText" weight={600}>
            Conflito de horário
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: SIZES.touchMin,
    paddingVertical: SPACING.xs,
  },
  circulo: {
    width: SIZES.iconCircle,
    height: SIZES.iconCircle,
    borderRadius: SIZES.iconCircle / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { flex: 1, minWidth: 0 },
});
