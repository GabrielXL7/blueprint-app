import {
  horaValida,
  minutosDoDia,
  periodosSeSobrepoem,
  validarAgenda,
  validarAtividade,
  validarAvulso,
  validarCompromisso,
  type Agenda,
  type Atividade,
} from "../domain/agenda";

const compromissoBase = {
  atividadeId: "a1",
  dias: [1, 3] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
  inicio: "05:00",
  fim: "06:00" as string | null,
};

const academia: Atividade = {
  id: "a1",
  nome: "Academia",
  icone: "exercicio",
  categoria: "exercicio",
  criadaEm: "2026-11-01T10:00:00.000Z",
};

function agenda(id: string, inicio: string, fim: string): Agenda {
  return { id, nome: id, inicio, fim, compromissos: [] };
}

describe("horaValida e minutosDoDia", () => {
  it("aceita HH:MM de 00:00 a 23:59", () => {
    expect(horaValida("00:00")).toBe(true);
    expect(horaValida("05:00")).toBe(true);
    expect(horaValida("23:59")).toBe(true);
  });

  it("recusa horas fora do formato ou do intervalo", () => {
    for (const hora of ["24:00", "7:30", "07:60", "", "ab:cd", "07:5", "07:300"]) {
      expect(horaValida(hora)).toBe(false);
    }
  });

  it("converte para minutos desde a meia-noite", () => {
    expect(minutosDoDia("05:30")).toBe(330);
    expect(minutosDoDia("00:00")).toBe(0);
  });
});

describe("validarCompromisso", () => {
  it("aceita compromisso com início e fim", () => {
    expect(validarCompromisso(compromissoBase)).toBeNull();
  });

  it("aceita evento pontual sem término", () => {
    expect(validarCompromisso({ ...compromissoBase, inicio: "20:00", fim: null })).toBeNull();
  });

  it("exige pelo menos um dia", () => {
    expect(validarCompromisso({ ...compromissoBase, dias: [] })).toBe("Escolha pelo menos um dia");
  });

  it("recusa dias repetidos ou fora de 0 a 6", () => {
    expect(validarCompromisso({ ...compromissoBase, dias: [1, 1] })).not.toBeNull();
    expect(validarCompromisso({ ...compromissoBase, dias: [7 as unknown as 0] })).not.toBeNull();
  });

  it("recusa horário sem zero à esquerda", () => {
    expect(validarCompromisso({ ...compromissoBase, inicio: "7:30" })).toBe(
      "Informe um horário no formato HH:MM",
    );
  });

  it("recusa término igual ou anterior ao início", () => {
    expect(validarCompromisso({ ...compromissoBase, fim: "05:00" })).toBe(
      "O término deve ser depois do início",
    );
    expect(validarCompromisso({ ...compromissoBase, fim: "04:00" })).toBe(
      "O término deve ser depois do início",
    );
  });

  it("recusa 24:00 como término", () => {
    expect(validarCompromisso({ ...compromissoBase, fim: "24:00" })).toBe(
      "Informe um horário no formato HH:MM",
    );
  });

  it("limita o detalhe a 60 caracteres", () => {
    expect(validarCompromisso({ ...compromissoBase, detalhe: "x".repeat(60) })).toBeNull();
    expect(validarCompromisso({ ...compromissoBase, detalhe: "x".repeat(61) })).not.toBeNull();
  });

  it("limita a antecedência a inteiros de 0 a 120", () => {
    expect(validarCompromisso({ ...compromissoBase, antecedenciaMin: 0 })).toBeNull();
    expect(validarCompromisso({ ...compromissoBase, antecedenciaMin: 120 })).toBeNull();
    for (const valor of [121, -1, 1.5]) {
      expect(validarCompromisso({ ...compromissoBase, antecedenciaMin: valor })).not.toBeNull();
    }
  });
});

describe("validarAtividade", () => {
  const nova = { nome: "Corrida", icone: "exercicio" as const, categoria: null };

  it("aceita atividade nova", () => {
    expect(validarAtividade(nova, [academia])).toBeNull();
  });

  it("recusa nome vazio ou só com espaços e nome com 41 caracteres", () => {
    expect(validarAtividade({ ...nova, nome: "   " }, [])).not.toBeNull();
    expect(validarAtividade({ ...nova, nome: "x".repeat(40) }, [])).toBeNull();
    expect(validarAtividade({ ...nova, nome: "x".repeat(41) }, [])).not.toBeNull();
  });

  it("recusa nome repetido sem diferenciar maiúsculas e espaços nas pontas", () => {
    expect(validarAtividade({ ...nova, nome: " academia " }, [academia])).toBe(
      "Já existe uma atividade com este nome",
    );
  });

  it("permite manter o próprio nome na edição", () => {
    expect(validarAtividade({ ...nova, nome: "Academia", id: "a1" }, [academia])).toBeNull();
  });

  it("recusa ícone fora do conjunto e categoria desconhecida", () => {
    expect(
      validarAtividade({ ...nova, icone: "foguete" as unknown as "outro" }, []),
    ).not.toBeNull();
    expect(
      validarAtividade({ ...nova, categoria: "lazer" as unknown as "outro" }, []),
    ).not.toBeNull();
  });
});

describe("validarAvulso", () => {
  const avulso = { atividadeId: "a1", data: "2026-11-16", inicio: "10:00", fim: null };

  it("aceita data e horário válidos", () => {
    expect(validarAvulso(avulso)).toBeNull();
  });

  it("recusa data inexistente", () => {
    expect(validarAvulso({ ...avulso, data: "2026-02-30" })).not.toBeNull();
    expect(validarAvulso({ ...avulso, data: "16/11/2026" })).not.toBeNull();
  });

  it("recusa horário inválido e término antes do início", () => {
    expect(validarAvulso({ ...avulso, inicio: "25:00" })).not.toBeNull();
    expect(validarAvulso({ ...avulso, inicio: "10:00", fim: "09:00" })).toBe(
      "O término deve ser depois do início",
    );
  });
});

describe("periodosSeSobrepoem", () => {
  const novembro = { inicio: "2026-11-01", fim: "2026-11-30" };

  it("considera sobreposição quando compartilham um dia", () => {
    expect(periodosSeSobrepoem(novembro, { inicio: "2026-11-30", fim: "2026-12-31" })).toBe(true);
  });

  it("não considera sobreposição em períodos vizinhos", () => {
    expect(periodosSeSobrepoem(novembro, { inicio: "2026-12-01", fim: "2026-12-31" })).toBe(false);
  });
});

describe("validarAgenda", () => {
  const novembro = agenda("nov", "2026-11-01", "2026-11-30");

  it("aceita agenda sem sobreposição", () => {
    expect(
      validarAgenda({ nome: "Dezembro", inicio: "2026-12-01", fim: "2026-12-31" }, [novembro]),
    ).toBeNull();
  });

  it("aceita agenda de um único dia", () => {
    expect(
      validarAgenda({ nome: "Feriado", inicio: "2026-12-25", fim: "2026-12-25" }, [novembro]),
    ).toBeNull();
  });

  it("recusa fim antes do início e datas inexistentes", () => {
    expect(
      validarAgenda({ nome: "X", inicio: "2026-12-10", fim: "2026-12-01" }, []),
    ).not.toBeNull();
    expect(
      validarAgenda({ nome: "X", inicio: "2026-02-30", fim: "2026-03-10" }, []),
    ).not.toBeNull();
  });

  it("recusa nome vazio", () => {
    expect(
      validarAgenda({ nome: "  ", inicio: "2026-12-01", fim: "2026-12-31" }, []),
    ).not.toBeNull();
  });

  it("recusa período que se sobrepõe a outra agenda", () => {
    expect(
      validarAgenda({ nome: "Meio", inicio: "2026-11-15", fim: "2026-12-15" }, [novembro]),
    ).toBe("Já existe agenda neste período");
  });

  it("ignora a própria agenda ao checar sobreposição na edição", () => {
    expect(
      validarAgenda({ id: "nov", nome: "Novembro", inicio: "2026-11-01", fim: "2026-11-29" }, [
        novembro,
      ]),
    ).toBeNull();
  });
});
