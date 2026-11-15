import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import BotaoTexto from "../components/BotaoTexto";
import CabecalhoDeTela from "../components/CabecalhoDeTela";
import Campo from "../components/Campo";
import { dataDaChave, nomeDeAgendaDoMes, periodoLivreDoMes, type Agenda } from "../domain/agenda";
import { useAgenda } from "../hooks/useAgenda";
import type { RaizParamList } from "../navigation/Raiz";
import { SPACING } from "../styles/theme";
import { Card, Screen, Text } from "../ui";

type Props = NativeStackScreenProps<RaizParamList, "Agendas">;

type Formulario = { id: string | null; nome: string; inicio: string; fim: string };

function dataBr(chave: string): string {
  return chave.split("-").reverse().join("/");
}

function descreverCompromissos(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? "compromisso" : "compromissos"}`;
}

/** Gerenciar agendas: períodos, duplicar para o mês seguinte, editar datas e remover. */
export default function AgendasScreen({ route, navigation }: Props) {
  const { dados, relogio, criarAgenda, editarAgenda, removerAgenda, duplicarAgenda } = useAgenda();

  /** Nova agenda do mês de `dia`, só com o trecho que nenhuma agenda cobre ao redor dele. */
  function formularioParaDia(dia: Date): Formulario {
    return {
      id: null,
      nome: nomeDeAgendaDoMes(dia.getFullYear(), dia.getMonth()),
      ...periodoLivreDoMes(dados.agendas, dia),
    };
  }

  const [formulario, setFormulario] = useState<Formulario | null>(() =>
    route.params?.nova
      ? formularioParaDia(dataDaChave(route.params.data ?? "") ?? relogio())
      : null,
  );
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function abrirFormulario(novo: Formulario | null) {
    setErro(null);
    setMensagem(null);
    setRemovendo(null);
    setFormulario(novo);
  }

  function salvar() {
    if (formulario === null) return;
    const periodo = { nome: formulario.nome, inicio: formulario.inicio, fim: formulario.fim };
    if (formulario.id === null) {
      const resultado = criarAgenda(periodo);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(`Agenda criada: ${resultado.valor.nome}`);
    } else {
      const resultado = editarAgenda(formulario.id, periodo);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(null);
    }
    setErro(null);
    setFormulario(null);
  }

  function duplicar(agenda: Agenda) {
    setMensagem(null);
    const resultado = duplicarAgenda(agenda.id);
    if (resultado.ok) {
      setErro(null);
      setMensagem(`Agenda criada: ${resultado.valor.nome}`);
    } else {
      setErro(resultado.erro);
    }
  }

  function remover(id: string) {
    const resultado = removerAgenda(id);
    setRemovendo(null);
    setErro(resultado.ok ? null : resultado.erro);
  }

  const alerta = erro ? (
    <Text variant="support" color="accentText" weight={600} accessibilityRole="alert">
      {erro}
    </Text>
  ) : null;

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <CabecalhoDeTela titulo="Agendas" aoVoltar={() => navigation.goBack()} />

      {mensagem ? <Text variant="support">{mensagem}</Text> : null}
      {formulario === null ? alerta : null}

      {formulario !== null ? (
        <Card style={styles.cartao}>
          <Text variant="section">{formulario.id === null ? "Nova agenda" : "Editar período"}</Text>
          <Campo
            rotulo="Nome da agenda"
            valor={formulario.nome}
            aoMudar={(nome) => setFormulario({ ...formulario, nome })}
            maxLength={60}
          />
          <Campo
            rotulo="Início (AAAA-MM-DD)"
            valor={formulario.inicio}
            aoMudar={(inicio) => setFormulario({ ...formulario, inicio })}
            maxLength={10}
          />
          <Campo
            rotulo="Fim (AAAA-MM-DD)"
            valor={formulario.fim}
            aoMudar={(fim) => setFormulario({ ...formulario, fim })}
            maxLength={10}
          />
          {alerta}
          <BotaoTexto rotulo="Salvar agenda" aoPressionar={salvar} variante="primario" />
          <BotaoTexto
            rotulo="Cancelar"
            aoPressionar={() => abrirFormulario(null)}
            variante="link"
          />
        </Card>
      ) : (
        <BotaoTexto
          rotulo="Nova agenda"
          aoPressionar={() => abrirFormulario(formularioParaDia(relogio()))}
          variante="primario"
        />
      )}

      {dados.agendas.length === 0 ? (
        <Text variant="support" color="mute">
          Nenhuma agenda ainda
        </Text>
      ) : null}

      {dados.agendas.map((agenda) => (
        <Card key={agenda.id} style={styles.cartao}>
          <Text variant="cardTitle">{agenda.nome}</Text>
          <Text variant="support" color="mute">
            {`${dataBr(agenda.inicio)} a ${dataBr(agenda.fim)}`}
          </Text>
          <Text variant="caption" color="mute">
            {descreverCompromissos(agenda.compromissos.length)}
          </Text>
          {removendo === agenda.id ? (
            <View style={styles.cartao}>
              <Text variant="support">
                {`Remover a agenda ${agenda.nome}? Remove só os compromissos desta agenda.`}
              </Text>
              <BotaoTexto
                rotulo="Confirmar remoção"
                aoPressionar={() => remover(agenda.id)}
                variante="primario"
              />
              <BotaoTexto
                rotulo="Cancelar"
                aoPressionar={() => setRemovendo(null)}
                variante="link"
              />
            </View>
          ) : (
            <View style={styles.cartao}>
              <BotaoTexto
                rotulo="Duplicar para o próximo mês"
                rotuloAcessivel={`Duplicar ${agenda.nome} para o próximo mês`}
                aoPressionar={() => duplicar(agenda)}
              />
              <BotaoTexto
                rotulo="Editar período"
                rotuloAcessivel={`Editar período de ${agenda.nome}`}
                aoPressionar={() =>
                  abrirFormulario({
                    id: agenda.id,
                    nome: agenda.nome,
                    inicio: agenda.inicio,
                    fim: agenda.fim,
                  })
                }
              />
              <BotaoTexto
                rotulo="Remover"
                rotuloAcessivel={`Remover ${agenda.nome}`}
                aoPressionar={() => {
                  setErro(null);
                  setMensagem(null);
                  setRemovendo(agenda.id);
                }}
                variante="link"
              />
            </View>
          )}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.gap, paddingBottom: SPACING.xxl },
  cartao: { gap: SPACING.sm },
});
