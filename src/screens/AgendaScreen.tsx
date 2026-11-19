import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import DiaDaAgenda from "../components/DiaDaAgenda";
import MontarSemana from "../components/MontarSemana";
import { gerarAgendaDeExemplo } from "../dev/agendaDeExemplo";
import { gerarIdLocal } from "../domain/acoes";
import {
  DADOS_AGENDA_VAZIOS,
  nomeDeAgendaDoMes,
  periodoLivreDoMes,
  type Agenda,
  type Compromisso,
  type Ocorrencia,
} from "../domain/agenda";
import {
  MESES,
  chaveDoDia,
  diasDaSemana,
  formatarIntervalo,
  inicioDaSemana,
  somarDias,
} from "../domain/datas";
import { useAgenda } from "../hooks/useAgenda";
import type { RaizParamList } from "../navigation/Raiz";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card, Screen, SegmentedControl, Text } from "../ui";
import { Icon } from "../ui/Icon";

type Modo = "dias" | "semana";

function FerramentasDeDesenvolvimento() {
  const { substituir, relogio } = useAgenda();
  if (!__DEV__) {
    return null;
  }
  return (
    <View style={styles.dev}>
      <Text variant="caption" color="mute">
        DEV
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Carregar agenda de exemplo"
        onPress={() => substituir(gerarAgendaDeExemplo(() => gerarIdLocal(relogio()), relogio()))}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Carregar agenda de exemplo
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Limpar agenda"
        onPress={() => substituir({ ...DADOS_AGENDA_VAZIOS })}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Limpar agenda
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Aba Agenda: uma semana por vez, de domingo a sábado (docs/superpowers/specs, seção 7.1).
 * "Por dia" mostra cada dia com seus compromissos; "Montar semana" mostra um compromisso por
 * linha com os dias ao lado, o jeito mais rápido de montar o cronograma do mês.
 */
export default function AgendaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RaizParamList>>();
  const { dados, relogio, ocorrenciasDe, agendaDe, criarAgenda } = useAgenda();
  const { colors } = useTheme();
  const [deslocamento, setDeslocamento] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>("dias");

  const hoje = relogio();
  const domingo = somarDias(inicioDaSemana(hoje), 7 * deslocamento);
  const dias = diasDaSemana(domingo);
  const nomeNoCabecalho = dias.map(agendaDe).find((agenda) => agenda !== undefined)?.nome;

  // Agenda que a semana modelo edita: a que contém hoje; senão a última da semana exibida.
  const chaveHoje = chaveDoDia(hoje);
  const agendasDaSemana = dias
    .map(agendaDe)
    .filter((agenda): agenda is Agenda => agenda !== undefined)
    .filter((agenda, indice, todas) => todas.findIndex((outra) => outra.id === agenda.id) === indice);
  const agendaAlvo =
    agendasDaSemana.find((agenda) => agenda.inicio <= chaveHoje && chaveHoje <= agenda.fim) ??
    agendasDaSemana[agendasDaSemana.length - 1];

  function abrir(ocorrencia: Ocorrencia) {
    if (ocorrencia.origem === "avulso") {
      navigation.navigate("Compromisso", { avulsoId: ocorrencia.id });
      return;
    }
    navigation.navigate("Compromisso", {
      compromissoId: ocorrencia.id,
      agendaId: ocorrencia.agendaId ?? undefined,
    });
  }

  // O convite aparece em qualquer semana com dia sem agenda, para o mês do primeiro dia descoberto.
  const diaSemAgenda = dias.find((dia) => agendaDe(dia) === undefined);

  function comecarEmBranco(dia: Date) {
    const periodo = periodoLivreDoMes(dados.agendas, dia);
    const resultado = criarAgenda({
      nome: nomeDeAgendaDoMes(dia.getFullYear(), dia.getMonth()),
      ...periodo,
    });
    setErro(resultado.ok ? null : resultado.erro);
  }

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <View style={styles.cabecalho}>
        <View style={styles.titulo}>
          <Text variant="h1" accessibilityRole="header">
            Agenda
          </Text>
          {nomeNoCabecalho ? (
            <Text variant="support" color="mute">
              {nomeNoCabecalho}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar agendas"
          onPress={() => navigation.navigate("Agendas")}
          style={[styles.editar, { backgroundColor: colors.sunk }]}
        >
          <Text variant="support" weight={600}>
            Editar
          </Text>
        </Pressable>
      </View>

      <SegmentedControl<Modo>
        accessibilityLabel="Modo da agenda"
        value={modo}
        onChange={setModo}
        options={[
          { value: "dias", label: "Por dia" },
          { value: "semana", label: "Montar semana" },
        ]}
      />

      <View style={styles.semana}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Semana anterior"
          onPress={() => setDeslocamento((atual) => atual - 1)}
          style={styles.seta}
        >
          <Icon name="anterior" color={colors.ink} />
        </Pressable>
        <Text variant="section">{formatarIntervalo(domingo, somarDias(domingo, 6))}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próxima semana"
          onPress={() => setDeslocamento((atual) => atual + 1)}
          style={styles.seta}
        >
          <Icon name="proximo" color={colors.ink} />
        </Pressable>
      </View>

      {diaSemAgenda ? (
        <Card style={styles.convite}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("Agendas", { nova: true, data: chaveDoDia(diaSemAgenda) })
            }
            style={styles.alvo}
          >
            <Text variant="cardTitle">{`Montar a agenda de ${MESES[diaSemAgenda.getMonth()]}`}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => comecarEmBranco(diaSemAgenda)}
            style={styles.alvo}
          >
            <Text variant="support" color="accentText" weight={600}>
              Começar em branco
            </Text>
          </Pressable>
          {erro ? (
            <Text variant="caption" accessibilityRole="alert">
              {erro}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {modo === "semana" ? (
        agendaAlvo ? (
          <MontarSemana
            key={agendaAlvo.id}
            agenda={agendaAlvo}
            aoAbrir={(compromisso: Compromisso) =>
              navigation.navigate("Compromisso", {
                compromissoId: compromisso.id,
                agendaId: agendaAlvo.id,
              })
            }
            aoNovo={() =>
              navigation.navigate("Compromisso", { data: agendaAlvo.inicio, modelo: true })
            }
          />
        ) : null
      ) : (
        dias.map((dia) => {
          const agenda = agendaDe(dia);
          const anterior = agendaDe(somarDias(dia, -1));
          const mudou = agenda !== undefined && agenda.id !== anterior?.id;
          return (
            <DiaDaAgenda
              key={chaveDoDia(dia)}
              data={dia}
              hoje={hoje}
              ocorrencias={ocorrenciasDe(dia)}
              nomeDaAgenda={mudou && agenda.nome !== nomeNoCabecalho ? agenda.nome : undefined}
              aoAdicionar={() => navigation.navigate("Compromisso", { data: chaveDoDia(dia) })}
              aoAbrir={abrir}
            />
          );
        })
      )}
      <FerramentasDeDesenvolvimento />
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.gap, paddingBottom: SPACING.xxl },
  cabecalho: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  titulo: { flex: 1 },
  editar: {
    minHeight: SIZES.touchMin,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.button,
    justifyContent: "center",
  },
  semana: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seta: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  convite: { gap: SPACING.sm },
  alvo: { minHeight: SIZES.touchMin, justifyContent: "center" },
  dev: { flexDirection: "row", alignItems: "center", gap: SPACING.lg, flexWrap: "wrap" },
  devBotao: { minHeight: SIZES.touchMin, justifyContent: "center" },
});
