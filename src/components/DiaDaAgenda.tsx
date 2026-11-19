import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { chavesEmConflito, type Ocorrencia } from "../domain/agenda";
import { DIAS_ABREVIADOS, DIAS_DA_SEMANA, chaveDoDia } from "../domain/datas";
import { BRAND, RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import LinhaCompromisso from "./LinhaCompromisso";

type DiaDaAgendaProps = {
  data: Date;
  hoje: Date;
  ocorrencias: readonly Ocorrencia[];
  /** Nome da agenda, mostrado quando ela muda em relação ao dia anterior */
  nomeDaAgenda?: string;
  aoAdicionar: () => void;
  aoAbrir: (ocorrencia: Ocorrencia) => void;
};

/** Cartão de um dia da semana com os compromissos e o espaço livre "+ Adicionar". */
export default function DiaDaAgenda({
  data,
  hoje,
  ocorrencias,
  nomeDaAgenda,
  aoAdicionar,
  aoAbrir,
}: DiaDaAgendaProps) {
  const { colors } = useTheme();
  const conflitos = useMemo(() => chavesEmConflito(ocorrencias), [ocorrencias]);
  const ehHoje = chaveDoDia(data) === chaveDoDia(hoje);
  const abreviado = DIAS_ABREVIADOS[data.getDay()];
  const titulo = `${abreviado.charAt(0).toUpperCase()}${abreviado.slice(1)} ${data.getDate()}`;

  return (
    <Card style={styles.cartao}>
      <View style={styles.cabecalho}>
        <Text
          variant="section"
          accessibilityRole="header"
          accessibilityLabel={ehHoje ? `${titulo}, hoje` : titulo}
        >
          {titulo}
        </Text>
        {ehHoje ? (
          <View style={[styles.selo, { backgroundColor: colors.accent }]}>
            <Text variant="caption" weight={600} style={{ color: BRAND.black }}>
              Hoje
            </Text>
          </View>
        ) : null}
      </View>
      {nomeDaAgenda ? (
        <Text variant="caption" color="mute">
          {nomeDaAgenda}
        </Text>
      ) : null}
      {ocorrencias.length === 0 ? (
        <Text variant="support" color="mute">
          Nada marcado
        </Text>
      ) : (
        ocorrencias.map((ocorrencia) => (
          <LinhaCompromisso
            key={ocorrencia.chave}
            ocorrencia={ocorrencia}
            emConflito={conflitos.has(ocorrencia.chave)}
            aoPressionar={() => aoAbrir(ocorrencia)}
          />
        ))
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Adicionar em ${DIAS_DA_SEMANA[data.getDay()]}`}
        onPress={aoAdicionar}
        style={[styles.adicionar, { borderTopColor: colors.hair }]}
      >
        <Text variant="support" color="accentText" weight={600}>
          + Adicionar
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.sm },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  selo: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  adicionar: {
    minHeight: SIZES.touchMin,
    justifyContent: "center",
    borderTopWidth: 1,
    marginTop: SPACING.xs,
  },
});
