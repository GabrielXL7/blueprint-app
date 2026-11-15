import { Pressable, StyleSheet, View } from "react-native";
import type { DiaDaSemana } from "../domain/agenda";
import { DIAS_ABREVIADOS, DIAS_DA_SEMANA } from "../domain/datas";
import { RADIUS, SIZES } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";

type SeletorDeDiasProps = {
  valor: readonly DiaDaSemana[];
  aoMudar: (dias: DiaDaSemana[]) => void;
};

const TODOS_OS_DIAS: readonly DiaDaSemana[] = [0, 1, 2, 3, 4, 5, 6];

/** Sete botões, de domingo a sábado, para escolher em quais dias o compromisso repete. */
export default function SeletorDeDias({ valor, aoMudar }: SeletorDeDiasProps) {
  const { colors } = useTheme();

  function alternar(dia: DiaDaSemana) {
    aoMudar(
      valor.includes(dia) ? valor.filter((d) => d !== dia) : [...valor, dia].sort((a, b) => a - b),
    );
  }

  return (
    <View style={styles.linha}>
      {TODOS_OS_DIAS.map((dia) => {
        const marcado = valor.includes(dia);
        return (
          <Pressable
            key={dia}
            accessibilityRole="checkbox"
            accessibilityLabel={DIAS_DA_SEMANA[dia]}
            accessibilityState={{ checked: marcado }}
            onPress={() => alternar(dia)}
            style={[styles.botao, { backgroundColor: marcado ? colors.ink : colors.sunk }]}
          >
            <Text variant="caption" weight={600} color={marcado ? "onInk" : "ink"}>
              {DIAS_ABREVIADOS[dia]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", gap: 6 },
  botao: {
    flex: 1,
    minWidth: 0,
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
  },
});
