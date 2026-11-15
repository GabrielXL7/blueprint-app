import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import DiaDaAgenda from "../components/DiaDaAgenda";
import LinhaCompromisso from "../components/LinhaCompromisso";
import SeletorDeDias from "../components/SeletorDeDias";
import SeletorDeHorario from "../components/SeletorDeHorario";
import type { Atividade, DiaDaSemana, Ocorrencia } from "../domain/agenda";
import { renderComTema } from "./utils";

const academia: Atividade = {
  id: "academia",
  nome: "Academia",
  icone: "exercicio",
  categoria: "exercicio",
  criadaEm: "2026-11-01T00:00:00.000Z",
};

function ocorrencia(parcial: Partial<Ocorrencia> = {}): Ocorrencia {
  return {
    chave: "agenda:c1",
    origem: "agenda",
    id: "c1",
    agendaId: "nov",
    atividade: academia,
    inicio: "05:00",
    fim: "06:00",
    ...parcial,
  };
}

describe("SeletorDeDias", () => {
  it("adiciona e remove dias mantendo a ordem crescente", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeDias valor={[1]} aoMudar={aoMudar} />);

    await fireEvent.press(screen.getByRole("checkbox", { name: "Terça-feira" }));
    expect(aoMudar).toHaveBeenLastCalledWith([1, 2]);

    await fireEvent.press(screen.getByRole("checkbox", { name: "Segunda-feira" }));
    expect(aoMudar).toHaveBeenLastCalledWith([]);
  });

  it("ordena o resultado ao marcar um dia anterior", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeDias valor={[3, 5]} aoMudar={aoMudar} />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Domingo" }));
    expect(aoMudar).toHaveBeenLastCalledWith([0, 3, 5] satisfies DiaDaSemana[]);
  });

  it("expõe o estado marcado para leitores de tela", async () => {
    await renderComTema(<SeletorDeDias valor={[2]} aoMudar={() => {}} />);
    const marcado = screen.getByRole("checkbox", { name: "Terça-feira" });
    const livre = screen.getByRole("checkbox", { name: "Quarta-feira" });
    expect(marcado.props.accessibilityState).toMatchObject({ checked: true });
    expect(livre.props.accessibilityState).toMatchObject({ checked: false });
  });
});

describe("LinhaCompromisso", () => {
  it("mostra o intervalo quando há término", async () => {
    await renderComTema(
      <LinhaCompromisso ocorrencia={ocorrencia()} emConflito={false} aoPressionar={() => {}} />,
    );
    expect(screen.getByText("05:00 a 06:00")).toBeTruthy();
    expect(screen.getByLabelText("Academia, 05:00 a 06:00")).toBeTruthy();
  });

  it("mostra só o início quando não há término", async () => {
    await renderComTema(
      <LinhaCompromisso
        ocorrencia={ocorrencia({ inicio: "20:00", fim: null })}
        emConflito={false}
        aoPressionar={() => {}}
      />,
    );
    expect(screen.getByText("20:00")).toBeTruthy();
  });

  it("mostra o detalhe, a marca de avulso e o aviso de conflito", async () => {
    await renderComTema(
      <LinhaCompromisso
        ocorrencia={ocorrencia({ origem: "avulso", detalhe: "Montese" })}
        emConflito
        aoPressionar={() => {}}
      />,
    );
    expect(screen.getByText("Montese")).toBeTruthy();
    expect(screen.getByText("só neste dia")).toBeTruthy();
    expect(screen.getByText("Conflito de horário")).toBeTruthy();
  });

  it("chama aoPressionar ao tocar", async () => {
    const aoPressionar = jest.fn();
    await renderComTema(
      <LinhaCompromisso ocorrencia={ocorrencia()} emConflito={false} aoPressionar={aoPressionar} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Academia, 05:00 a 06:00" }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });
});

describe("DiaDaAgenda", () => {
  const sexta = new Date(2026, 9, 16);
  const hoje = new Date(2026, 9, 17);

  it("mostra Nada marcado e o botão Adicionar quando o dia está vazio", async () => {
    const aoAdicionar = jest.fn();
    await renderComTema(
      <DiaDaAgenda
        data={sexta}
        hoje={hoje}
        ocorrencias={[]}
        aoAdicionar={aoAdicionar}
        aoAbrir={() => {}}
      />,
    );
    expect(screen.getByText("Nada marcado")).toBeTruthy();
    expect(screen.getByLabelText("Sex 16")).toBeTruthy();
    await fireEvent.press(screen.getByText("+ Adicionar"));
    expect(aoAdicionar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Hoje")).toBeNull();
  });

  it("destaca o dia de hoje", async () => {
    await renderComTema(
      <DiaDaAgenda
        data={hoje}
        hoje={hoje}
        ocorrencias={[]}
        aoAdicionar={() => {}}
        aoAbrir={() => {}}
      />,
    );
    expect(screen.getByText("Hoje")).toBeTruthy();
    expect(screen.getByLabelText("Sáb 17, hoje")).toBeTruthy();
  });

  it("lista as ocorrências na ordem recebida, o nome da agenda e abre ao tocar", async () => {
    const aoAbrir = jest.fn();
    const lista = [
      ocorrencia(),
      ocorrencia({ chave: "agenda:c2", id: "c2", inicio: "12:00", fim: "18:00" }),
    ];
    await renderComTema(
      <DiaDaAgenda
        data={sexta}
        hoje={hoje}
        ocorrencias={lista}
        nomeDaAgenda="Outubro de 2026"
        aoAdicionar={() => {}}
        aoAbrir={aoAbrir}
      />,
    );
    expect(screen.getByText("Outubro de 2026")).toBeTruthy();
    expect(screen.queryByText("Nada marcado")).toBeNull();
    const botoes = screen.getAllByRole("button", { name: /^Academia/ });
    expect(botoes).toHaveLength(2);
    await fireEvent.press(screen.getByText("12:00 a 18:00"));
    expect(aoAbrir).toHaveBeenCalledWith(lista[1]);
  });

  it("avisa os horários em conflito no mesmo dia", async () => {
    const lista = [
      ocorrencia({ inicio: "15:30", fim: "19:00" }),
      ocorrencia({ chave: "agenda:c2", id: "c2", inicio: "18:00", fim: "20:00" }),
    ];
    await renderComTema(
      <DiaDaAgenda
        data={sexta}
        hoje={hoje}
        ocorrencias={lista}
        aoAdicionar={() => {}}
        aoAbrir={() => {}}
      />,
    );
    expect(screen.getAllByText("Conflito de horário")).toHaveLength(2);
  });
});

describe("SeletorDeHorario", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("no iOS abre o seletor nativo e devolve a hora escolhida", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor="05:00" aoMudar={aoMudar} rotulo="Início" />);
    expect(screen.getByText("05:00")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    const seletor = screen.getByTestId("datetimepicker");
    await fireEvent(seletor, "change", { type: "set" }, new Date(2026, 10, 1, 5, 30));
    expect(aoMudar).toHaveBeenCalledWith("05:30");
  });

  it("no iOS, abrir sem valor já propõe 08:00 e o botão OK fecha a roda", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor={null} aoMudar={aoMudar} rotulo="Início" />);

    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    expect(aoMudar).toHaveBeenCalledWith("08:00");
    expect(screen.getByTestId("datetimepicker")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByTestId("datetimepicker")).toBeNull();
  });

  it("no iOS, abrir com valor não troca a hora até a pessoa girar a roda", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor="05:00" aoMudar={aoMudar} rotulo="Início" />);
    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("no Android abre o diálogo nativo", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor={null} aoMudar={aoMudar} rotulo="Início" />);

    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "time", is24Hour: true }),
    );
    const { onChange } = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
    onChange?.({ type: "set" } as never, new Date(2026, 10, 1, 7, 5));
    expect(aoMudar).toHaveBeenCalledWith("07:05");
  });

  it("na web aplica a máscara HH:MM e só avisa quando a hora é válida", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor={null} aoMudar={aoMudar} rotulo="Início" />);

    const campo = screen.getByLabelText("Início");
    await fireEvent.changeText(campo, "053");
    expect(aoMudar).not.toHaveBeenCalled();
    await fireEvent.changeText(campo, "0530");
    expect(aoMudar).toHaveBeenCalledWith("05:30");
    expect(screen.getByDisplayValue("05:30")).toBeTruthy();

    await fireEvent.changeText(campo, "2599");
    expect(aoMudar).toHaveBeenCalledTimes(1);
  });
});
