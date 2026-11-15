import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { horaValida } from "../domain/agenda";
import { formatarHora } from "../domain/datas";
import { FONT_FAMILY, RADIUS, SIZES, SPACING, TYPOGRAPHY } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";
import BotaoTexto from "./BotaoTexto";

type SeletorDeHorarioProps = {
  valor: string | null;
  aoMudar: (hora: string) => void;
  rotulo: string;
};

const HORA_PADRAO = { horas: 8, minutos: 0 };

function dataDaHora(hora: string | null): Date {
  const [horas, minutos] =
    hora !== null && horaValida(hora)
      ? hora.split(":").map(Number)
      : [HORA_PADRAO.horas, HORA_PADRAO.minutos];
  return new Date(2000, 0, 1, horas, minutos);
}

/** Campo de texto com máscara HH:MM. Só avisa quando a hora digitada é válida. */
function CampoWeb({ valor, aoMudar, rotulo }: SeletorDeHorarioProps) {
  const { colors } = useTheme();
  const [texto, setTexto] = useState(valor ?? "");

  function aoDigitar(entrada: string) {
    const digitos = entrada.replace(/\D/g, "").slice(0, 4);
    const mascarado = digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
    setTexto(mascarado);
    if (horaValida(mascarado)) {
      aoMudar(mascarado);
    }
  }

  return (
    <TextInput
      accessibilityLabel={rotulo}
      value={texto}
      onChangeText={aoDigitar}
      placeholder="HH:MM"
      placeholderTextColor={colors.placeholder}
      keyboardType="numeric"
      maxLength={5}
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
  );
}

/** Botão que mostra a hora e abre o seletor nativo (diálogo no Android, roda no iOS). */
function CampoNativo({ valor, aoMudar, rotulo }: SeletorDeHorarioProps) {
  const { colors } = useTheme();
  const [aberto, setAberto] = useState(false);

  function aoEscolher(tipo: string | undefined, data: Date | undefined) {
    if (tipo === "set" && data) {
      aoMudar(formatarHora(data));
    }
  }

  function aoPressionar() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: dataDaHora(valor),
        mode: "time",
        is24Hour: true,
        onChange: (evento, data) => aoEscolher(evento.type, data),
      });
      return;
    }
    // A roda já mostra a hora padrão: sem isto, aceitá-la sem girar deixaria o campo vazio.
    if (!aberto && valor === null) {
      aoMudar(formatarHora(dataDaHora(null)));
    }
    setAberto((atual) => !atual);
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        onPress={aoPressionar}
        style={[styles.campo, styles.botao, { borderColor: colors.hair }]}
      >
        <Text variant="body" color={valor === null ? "placeholder" : "ink"}>
          {valor ?? "--:--"}
        </Text>
      </Pressable>
      {aberto && Platform.OS !== "android" ? (
        <>
          <DateTimePicker
            value={dataDaHora(valor)}
            mode="time"
            display="spinner"
            is24Hour
            onChange={(evento, data) => aoEscolher(evento.type, data)}
          />
          <BotaoTexto rotulo="OK" aoPressionar={() => setAberto(false)} />
        </>
      ) : null}
    </View>
  );
}

export default function SeletorDeHorario(props: SeletorDeHorarioProps) {
  return Platform.OS === "web" ? <CampoWeb {...props} /> : <CampoNativo {...props} />;
}

const styles = StyleSheet.create({
  campo: {
    minHeight: SIZES.field,
    borderWidth: 1,
    borderRadius: RADIUS.field,
    paddingHorizontal: SPACING.lg,
  },
  botao: { justifyContent: "center" },
});
