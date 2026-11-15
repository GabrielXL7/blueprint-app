import { Pressable, StyleSheet, View } from "react-native";
import { SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

type CabecalhoDeTelaProps = {
  titulo: string;
  aoVoltar: () => void;
};

/** Cabeçalho das telas de edição, que ficam por cima das abas: voltar e título. */
export default function CabecalhoDeTela({ titulo, aoVoltar }: CabecalhoDeTelaProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.linha}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={aoVoltar}
        style={styles.voltar}
      >
        <Icon name="anterior" color={colors.ink} />
      </Pressable>
      <Text variant="h1" accessibilityRole="header" style={styles.titulo}>
        {titulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  voltar: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { flex: 1 },
});
