import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { FONT_FAMILY, RADIUS, SIZES, SPACING, TYPOGRAPHY } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";

type CampoProps = {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  maxLength?: number;
};

/** Campo de texto com contorno de 1px e o rótulo visível acima (e como rótulo de acessibilidade). */
export default function Campo({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  teclado,
  maxLength,
}: CampoProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.grupo}>
      <Text variant="caption" color="mute">
        {rotulo}
      </Text>
      <TextInput
        accessibilityLabel={rotulo}
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={teclado}
        maxLength={maxLength}
        style={[
          styles.campo,
          {
            borderColor: colors.hair,
            color: colors.ink,
            fontFamily: FONT_FAMILY[500],
            fontSize: TYPOGRAPHY.body.fontSize,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: SPACING.xs },
  campo: {
    minHeight: SIZES.field,
    borderWidth: 1,
    borderRadius: RADIUS.field,
    paddingHorizontal: SPACING.lg,
  },
});
