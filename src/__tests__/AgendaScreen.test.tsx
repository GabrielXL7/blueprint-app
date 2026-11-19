import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, screen } from "@testing-library/react-native";
import type { Agenda, Atividade, Avulso, DadosAgenda } from "../domain/agenda";
import Raiz from "../navigation/Raiz";
import AgendaScreen from "../screens/AgendaScreen";
import { Text } from "../ui/Text";
import { renderComTema } from "./utils";

const Stack = createNativeStackNavigator();

function Parametros({ route }: { route: { params?: object } }) {
  return <Text testID="parametros">{JSON.stringify(route.params ?? null)}</Text>;
}

function ComPilha() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Abas" component={AgendaScreen} />
        <Stack.Screen name="Compromisso" component={Parametros} />
        <Stack.Screen name="Agendas" component={Parametros} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function atividade(id: string, nome: string): Atividade {
  return { id, nome, icone: "outro", categoria: null, criadaEm: "2026-10-01T00:00:00.000Z" };
}

const academia = atividade("academia", "Academia");
const culto = atividade("culto", "Culto");
const aula = atividade("aula", "Aula");

function agenda(id: string, nome: string, inicio: string, fim: string): Agenda {
  return {
    id,
    nome,
    inicio,
    fim,
    compromissos: [
      {
        id: `${id}-academia`,
        atividadeId: "academia",
        dias: [1, 2, 3, 4, 5],
        inicio: "05:00",
        fim: "06:00",
      },
      { id: `${id}-culto`, atividadeId: "culto", dias: [0], inicio: "08:00", fim: "10:30" },
    ],
  };
}

function dados(agendas: Agenda[], avulsos: Avulso[] = []): DadosAgenda {
  return { atividades: [academia, culto, aula], agendas, avulsos };
}

async function avancarSemanas(quantidade: number) {
  for (let i = 0; i < quantidade; i++) {
    await fireEvent.press(screen.getByRole("button", { name: "Próxima semana" }));
  }
}

const OUTUBRO = agenda("out", "Outubro de 2026", "2026-10-01", "2026-10-31");

describe("AgendaScreen", () => {
  it("mostra a semana de hoje, de domingo a sábado, com os compromissos", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    expect(screen.getByText("11 a 17 de outubro")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Adicionar em / })).toHaveLength(7);
    expect(screen.getAllByText("Academia")).toHaveLength(5);
    expect(screen.getAllByText("Culto")).toHaveLength(1);
    expect(screen.getByLabelText("Sáb 17, hoje")).toBeTruthy();
    expect(screen.getByLabelText("Dom 11")).toBeTruthy();
    expect(screen.getByText("Outubro de 2026")).toBeTruthy();
  });

  it("navega entre semanas sem limite para frente", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    await fireEvent.press(screen.getByRole("button", { name: "Semana anterior" }));
    expect(screen.getByText("4 a 10 de outubro")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Próxima semana" }));
    await fireEvent.press(screen.getByRole("button", { name: "Próxima semana" }));
    expect(screen.getByText("18 a 24 de outubro")).toBeTruthy();
    expect(screen.getAllByText("Academia")).toHaveLength(5);

    for (let i = 0; i < 8; i++) {
      await fireEvent.press(screen.getByRole("button", { name: "Próxima semana" }));
    }
    expect(screen.getByText("13 a 19 de dezembro")).toBeTruthy();
    expect(screen.getAllByText("Nada marcado")).toHaveLength(7);
  });

  it("mostra o nome da agenda no dia em que ela muda quando a semana cruza duas agendas", async () => {
    const primeira = agenda("out", "Outubro de 2026", "2026-10-01", "2026-10-28");
    const segunda = agenda("nov", "Novembro de 2026", "2026-10-29", "2026-11-30");
    await renderComTema(<ComPilha />, { agenda: dados([primeira, segunda]) });

    await avancarSemanas(2);
    expect(screen.getByText("25 a 31 de outubro")).toBeTruthy();
    expect(screen.getAllByText("Outubro de 2026")).toHaveLength(1);
    expect(screen.getAllByText("Novembro de 2026")).toHaveLength(1);
  });

  it("mostra dia fora de qualquer agenda como vazio e ainda lista o avulso", async () => {
    const curta = agenda("out", "Outubro de 2026", "2026-10-01", "2026-10-28");
    const avulso: Avulso = {
      id: "v1",
      atividadeId: "aula",
      data: "2026-10-30",
      inicio: "19:00",
      fim: null,
    };
    await renderComTema(<ComPilha />, { agenda: dados([curta], [avulso]) });

    await avancarSemanas(2);
    expect(screen.getAllByText("Nada marcado")).toHaveLength(2);
    expect(screen.getByText("Aula")).toBeTruthy();
    expect(screen.getByText("só neste dia")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Adicionar em / })).toHaveLength(7);
  });

  it("oferece montar a agenda do mês quando não há nenhuma", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([]) });

    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();
    expect(screen.getByText("Começar em branco")).toBeTruthy();
    expect(screen.getAllByText("Nada marcado")).toHaveLength(7);

    await fireEvent.press(screen.getByText("Começar em branco"));
    expect(screen.queryByText("Montar a agenda de outubro")).toBeNull();
    expect(screen.getByText("Outubro de 2026")).toBeTruthy();
  });

  it("abre a criação de agenda pelo convite", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([]) });
    await fireEvent.press(screen.getByText("Montar a agenda de outubro"));
    expect(screen.getByTestId("parametros").props.children).toBe(
      JSON.stringify({ nova: true, data: "2026-10-11" }),
    );
  });

  it("oferece montar a agenda também quando só parte da semana está coberta", async () => {
    const curta = agenda("out", "Outubro de 2026", "2026-10-01", "2026-10-28");
    await renderComTema(<ComPilha />, { agenda: dados([curta]) });
    await avancarSemanas(2);

    await fireEvent.press(screen.getByText("Montar a agenda de outubro"));
    expect(screen.getByTestId("parametros").props.children).toBe(
      JSON.stringify({ nova: true, data: "2026-10-29" }),
    );
  });

  it("oferece montar a agenda numa semana fora dos períodos e Começar em branco cobre o mês", async () => {
    const novembro = agenda("nov", "Novembro de 2026", "2026-11-01", "2026-11-30");
    await renderComTema(<ComPilha />, { agenda: dados([novembro]) });
    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();

    await fireEvent.press(screen.getByText("Começar em branco"));
    expect(screen.queryByText("Montar a agenda de outubro")).toBeNull();
    expect(screen.getByText("Outubro de 2026")).toBeTruthy();
  });

  it("abre o formulário com o dia ao tocar em Adicionar", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar em Sexta-feira" }));
    expect(screen.getByTestId("parametros").props.children).toBe(
      JSON.stringify({ data: "2026-10-16" }),
    );
  });

  it("abre o avulso ao tocar nele", async () => {
    const avulso: Avulso = {
      id: "v1",
      atividadeId: "aula",
      data: "2026-10-17",
      inicio: "19:00",
      fim: null,
    };
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO], [avulso]) });

    await fireEvent.press(screen.getByRole("button", { name: /^Aula, 19:00/ }));
    expect(screen.getByTestId("parametros").props.children).toBe(
      JSON.stringify({ avulsoId: "v1" }),
    );
  });

  it("abre o compromisso recorrente com o id da agenda", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });
    await fireEvent.press(screen.getByRole("button", { name: /^Culto/ }));
    expect(screen.getByTestId("parametros").props.children).toBe(
      JSON.stringify({ compromissoId: "out-culto", agendaId: "out" }),
    );
  });

  it("abre o gerenciamento de agendas pelo botão Editar", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });
    await fireEvent.press(screen.getByRole("button", { name: "Editar agendas" }));
    expect(screen.getByTestId("parametros")).toBeTruthy();
  });
});

describe("AgendaScreen: ferramentas de desenvolvimento", () => {
  it("carrega a agenda de exemplo do mês e depois limpa", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([]) });
    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Carregar agenda de exemplo" }));
    expect(screen.queryByText("Montar a agenda de outubro")).toBeNull();
    expect(screen.getAllByText("Acordar")).toHaveLength(7);
    expect(screen.getAllByText("Academia")).toHaveLength(5);

    await fireEvent.press(screen.getByRole("button", { name: "Limpar agenda" }));
    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();
    expect(screen.queryByText("Acordar")).toBeNull();
  });
});

describe("Raiz e barra de abas", () => {
  it("tem 5 abas na ordem Hoje, Agenda, Calendário, Histórico e Perfil", async () => {
    await renderComTema(
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>,
    );
    const abas = screen.getAllByRole("tab").map((aba) => aba.props.accessibilityLabel);
    expect(abas).toEqual(["Hoje", "Agenda", "Calendário", "Histórico", "Perfil"]);
  });

  it("troca para a aba Agenda", async () => {
    await renderComTema(
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>,
      { agenda: dados([OUTUBRO]) },
    );
    await fireEvent.press(screen.getByRole("tab", { name: "Agenda" }));
    expect(screen.getByText("11 a 17 de outubro")).toBeTruthy();
  });
});

describe("AgendaScreen: montar semana", () => {
  async function abrirSemana(agendas: Agenda[] = [OUTUBRO]) {
    await renderComTema(<ComPilha />, { agenda: dados(agendas) });
    await fireEvent.press(screen.getByText("Montar semana"));
  }

  function diaDaLinha(linha: number, nome: string) {
    return screen.getAllByRole("checkbox", { name: nome })[linha];
  }

  it("mostra um compromisso por linha, com os sete dias ao lado", async () => {
    await abrirSemana();

    expect(screen.getAllByText("Academia")).toHaveLength(1);
    expect(screen.getAllByText("Culto")).toHaveLength(1);
    expect(screen.getByText("05:00 a 06:00")).toBeTruthy();
    expect(screen.getAllByRole("checkbox", { name: "Segunda-feira" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Adicionar em / })).toBeNull();
    expect(diaDaLinha(0, "Quarta-feira").props.accessibilityState).toMatchObject({ checked: true });
    expect(diaDaLinha(0, "Sábado").props.accessibilityState).toMatchObject({ checked: false });
  });

  it("marca um dia com um toque e vale só de hoje em diante numa agenda em curso", async () => {
    await abrirSemana();
    expect(screen.getByText(/já começou/)).toBeTruthy();

    await fireEvent.press(diaDaLinha(0, "Sábado"));
    expect(diaDaLinha(0, "Sábado").props.accessibilityState).toMatchObject({ checked: true });

    // Hoje é sábado 17: a academia passa a aparecer neste sábado e em nenhum dia que já passou.
    await fireEvent.press(screen.getByText("Por dia"));
    expect(screen.getAllByText("Academia")).toHaveLength(6);
    await fireEvent.press(screen.getByRole("button", { name: "Semana anterior" }));
    expect(screen.getAllByText("Academia")).toHaveLength(5);
  });

  it("numa agenda que ainda não começou, vale para o mês inteiro sem dividir", async () => {
    const novembro = agenda("nov", "Novembro de 2026", "2026-11-01", "2026-11-30");
    await renderComTema(<ComPilha />, { agenda: dados([novembro]) });
    await avancarSemanas(3);
    await fireEvent.press(screen.getByText("Montar semana"));

    expect(screen.getByText(/Vale para todas as semanas desta agenda/)).toBeTruthy();
    await fireEvent.press(diaDaLinha(0, "Domingo"));
    expect(diaDaLinha(0, "Domingo").props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getAllByText("Novembro de 2026")).toHaveLength(1);
  });

  it("não deixa um compromisso ficar sem nenhum dia", async () => {
    await abrirSemana();

    await fireEvent.press(diaDaLinha(1, "Domingo"));
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha pelo menos um dia");
    expect(diaDaLinha(1, "Domingo").props.accessibilityState).toMatchObject({ checked: true });
  });

  it("abre o compromisso para editar horário e detalhes", async () => {
    await abrirSemana();

    await fireEvent.press(screen.getByRole("button", { name: "Editar Academia, 05:00 a 06:00" }));
    expect(JSON.parse(String(screen.getByTestId("parametros").props.children))).toEqual({
      compromissoId: "out-academia",
      agendaId: "out",
    });
  });

  it("cria um compromisso novo sem dia pré-marcado, no início da agenda", async () => {
    await abrirSemana();

    await fireEvent.press(screen.getByRole("button", { name: "Novo compromisso" }));
    expect(JSON.parse(String(screen.getByTestId("parametros").props.children))).toEqual({
      data: "2026-10-01",
      modelo: true,
    });
  });

  it("explica o estado vazio de uma agenda sem compromissos", async () => {
    await abrirSemana([{ ...OUTUBRO, compromissos: [] }]);

    expect(screen.getByText("Nenhum compromisso ainda")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Novo compromisso" })).toBeTruthy();
  });

  it("sem agenda na semana, mantém o convite para montar a agenda", async () => {
    await abrirSemana([]);

    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Novo compromisso" })).toBeNull();
  });
});
