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
