import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ICONES_ATIVIDADE, type Atividade, type IconeAtividade } from "../domain/agenda";
import { CATEGORIAS, type CategoriaId } from "../domain/categorias";
import type { UseAgenda } from "../hooks/useAgenda";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";
import BotaoTexto from "./BotaoTexto";
import Campo from "./Campo";

type SeletorDeAtividadeProps = {
  atividades: readonly Atividade[];
  valor: string | null;
  aoEscolher: (id: string) => void;
  criarAtividade: UseAgenda["criarAtividade"];
};

const ROTULOS_DE_ICONE: Record<IconeAtividade, string> = {
  exercicio: "Exercício",
  estudo: "Estudo",
  hidratacao: "Hidratação",
  descanso: "Descanso",
  outro: "Outro",
  sol: "Sol",
  lua: "Lua",
};

/** Catálogo de atividades agrupado por categoria, com busca e criação de uma atividade nova. */
export default function SeletorDeAtividade({
  atividades,
  valor,
  aoEscolher,
  criarAtividade,
}: SeletorDeAtividadeProps) {
  const { colors } = useTheme();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState<IconeAtividade>("outro");
  const [categoria, setCategoria] = useState<CategoriaId | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const termo = busca.trim().toLowerCase();
  const visiveis = atividades.filter((atividade) => atividade.nome.toLowerCase().includes(termo));
  const grupos = [
    ...CATEGORIAS.map((c) => ({
      titulo: c.nome,
      itens: visiveis.filter((atividade) => atividade.categoria === c.id),
    })),
    {
      titulo: "Sem categoria",
      itens: visiveis.filter((atividade) => atividade.categoria === null),
    },
  ].filter((grupo) => grupo.itens.length > 0);

  function criar() {
    const resultado = criarAtividade({ nome, icone, categoria });
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    aoEscolher(resultado.valor.id);
    setNome("");
    setIcone("outro");
    setCategoria(null);
    setErro(null);
    setCriando(false);
  }

  return (
    <View style={styles.bloco}>
      <Text variant="section">Atividade</Text>
      <Campo rotulo="Buscar atividade" valor={busca} aoMudar={setBusca} />
      {grupos.map((grupo) => (
        <View key={grupo.titulo} style={styles.grupo}>
          <Text variant="caption" color="mute">
            {grupo.titulo}
          </Text>
          {grupo.itens.map((atividade) => {
            const marcada = atividade.id === valor;
            return (
              <Pressable
                key={atividade.id}
                accessibilityRole="radio"
                accessibilityLabel={atividade.nome}
                accessibilityState={{ checked: marcada }}
                onPress={() => aoEscolher(atividade.id)}
                style={[styles.item, { backgroundColor: marcada ? colors.ink : colors.sunk }]}
              >
                <Icon
                  name={atividade.icone}
                  color={marcada ? colors.onInk : colors.ink}
                  size={20}
                />
                <Text variant="body" color={marcada ? "onInk" : "ink"}>
                  {atividade.nome}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {criando ? (
        <View style={styles.grupo}>
          <Campo
            rotulo="Nome da atividade"
            valor={nome}
            aoMudar={setNome}
            maxLength={40}
            placeholder="Ex.: Corrida"
          />
          <Text variant="caption" color="mute">
            Ícone
          </Text>
          <View style={styles.linha}>
            {ICONES_ATIVIDADE.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityLabel={`Ícone ${ROTULOS_DE_ICONE[id]}`}
                accessibilityState={{ checked: icone === id }}
                onPress={() => setIcone(id)}
                style={[styles.icone, { backgroundColor: icone === id ? colors.ink : colors.sunk }]}
              >
                <Icon name={id} color={icone === id ? colors.onInk : colors.ink} size={20} />
              </Pressable>
            ))}
          </View>
          <Text variant="caption" color="mute">
            Categoria
          </Text>
          <View style={styles.linha}>
            {[{ id: null, nome: "Sem categoria" }, ...CATEGORIAS].map((opcao) => (
              <Pressable
                key={opcao.id ?? "nenhuma"}
                accessibilityRole="radio"
                accessibilityLabel={`Categoria ${opcao.nome}`}
                accessibilityState={{ checked: categoria === opcao.id }}
                onPress={() => setCategoria(opcao.id)}
                style={[
                  styles.chip,
                  { backgroundColor: categoria === opcao.id ? colors.ink : colors.sunk },
                ]}
              >
                <Text variant="caption" color={categoria === opcao.id ? "onInk" : "ink"}>
                  {opcao.nome}
                </Text>
              </Pressable>
            ))}
          </View>
          {erro ? (
            <Text variant="support" color="accentText" weight={600} accessibilityRole="alert">
              {erro}
            </Text>
          ) : null}
          <View style={styles.linha}>
            <BotaoTexto rotulo="Criar atividade" aoPressionar={criar} variante="primario" />
            <BotaoTexto
              rotulo="Cancelar atividade"
              aoPressionar={() => {
                setCriando(false);
                setErro(null);
              }}
            />
          </View>
        </View>
      ) : (
        <BotaoTexto rotulo="Nova atividade" aoPressionar={() => setCriando(true)} variante="link" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: SPACING.md },
  grupo: { gap: SPACING.sm },
  linha: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  item: {
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  icone: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
