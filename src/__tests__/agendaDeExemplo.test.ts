import {
  chavesEmConflito,
  ocorrenciasDoDia,
  validarAgenda,
  validarAtividade,
  validarCompromisso,
  type Atividade,
} from "../domain/agenda";
import { gerarAgendaDeExemplo } from "../dev/agendaDeExemplo";

function contador() {
  let n = 0;
  return () => `id${++n}`;
}

// 2026-11-15 é domingo.
const AGORA = new Date(2026, 10, 15, 9, 0);
const dados = gerarAgendaDeExemplo(contador(), AGORA);

function dia(numero: number) {
  return ocorrenciasDoDia(dados, new Date(2026, 10, numero));
}

function resumo(numero: number) {
  return dia(numero).map((o) => `${o.inicio}${o.fim ? `-${o.fim}` : ""} ${o.atividade.nome}`);
}

describe("gerarAgendaDeExemplo", () => {
  it("cria uma única agenda cobrindo exatamente o mês de agora", () => {
    expect(dados.agendas).toHaveLength(1);
    expect(dados.agendas[0]).toMatchObject({
      nome: "Novembro de 2026",
      inicio: "2026-11-01",
      fim: "2026-11-30",
    });
    expect(dados.avulsos).toEqual([]);
  });

  it("passa em todos os validadores do domínio", () => {
    const aceitas: Atividade[] = [];
    for (const atividade of dados.atividades) {
      expect(validarAtividade(atividade, aceitas)).toBeNull();
      aceitas.push(atividade);
    }
    for (const compromisso of dados.agendas[0].compromissos) {
      const { id: _id, ...conteudo } = compromisso;
      expect(validarCompromisso(conteudo)).toBeNull();
    }
    expect(validarAgenda(dados.agendas[0], [])).toBeNull();
  });

  it("não tem compromisso apontando para atividade inexistente nem ids repetidos", () => {
    const ids = new Set(dados.atividades.map((a) => a.id));
    const compromissos = dados.agendas[0].compromissos;
    expect(compromissos.every((c) => ids.has(c.atividadeId))).toBe(true);
    expect(new Set(compromissos.map((c) => c.id)).size).toBe(compromissos.length);
    expect(new Set([...ids]).size).toBe(dados.atividades.length);
  });

  it("segue o caderno na segunda-feira", () => {
    expect(resumo(16)).toEqual([
      "04:30 Acordar",
      "05:00-06:00 Academia",
      "07:30 Aula",
      "12:00-18:00 Trabalho",
      "19:00-21:00 Aula",
    ]);
  });

  it("segue o caderno na quarta e na sexta, sem conflito entre Uber, casa e Montese", () => {
    expect(resumo(18)).toEqual([
      "04:30 Acordar",
      "05:00-06:00 Academia",
      "09:00-15:00 Trabalho",
      "15:30-19:00 Uber",
      "20:00 Casa",
    ]);
    expect(resumo(20)).toEqual([
      "04:30 Acordar",
      "05:00-06:00 Academia",
      "09:00-15:00 Trabalho",
      "15:30-20:00 Uber",
      "20:00-23:00 Montese",
    ]);
    for (const numero of [17, 18, 19, 20]) {
      expect(chavesEmConflito(dia(numero)).size).toBe(0);
    }
  });

  it("tem só despertar e culto no domingo", () => {
    expect(resumo(15)).toEqual(["04:30 Acordar", "08:00-10:30 Culto"]);
  });

  it("tem despertar, estudo e Isabela no sábado, sem a linha sem horário do caderno", () => {
    expect(resumo(21)).toEqual(["04:30 Acordar", "14:00-17:00 Estudar", "19:00 Isabela"]);
  });

  it("liga Academia a Exercício e Aula e Estudar a Estudo; o resto fica sem categoria", () => {
    const categoria = (nome: string) => dados.atividades.find((a) => a.nome === nome)?.categoria;
    expect(categoria("Academia")).toBe("exercicio");
    expect(categoria("Aula")).toBe("estudo");
    expect(categoria("Estudar")).toBe("estudo");
    for (const nome of ["Acordar", "Trabalho", "Uber", "Casa", "Montese", "Isabela", "Culto"]) {
      expect(categoria(nome)).toBeNull();
    }
  });

  it("acompanha o mês de agora, inclusive em fevereiro", () => {
    const fevereiro = gerarAgendaDeExemplo(contador(), new Date(2027, 1, 10));
    expect(fevereiro.agendas[0]).toMatchObject({
      nome: "Fevereiro de 2027",
      inicio: "2027-02-01",
      fim: "2027-02-28",
    });
  });
});
