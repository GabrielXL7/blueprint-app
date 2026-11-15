import { Platform } from "react-native";
import {
  animacoesAtivas,
  entrada,
  entradaDeCelula,
  sumir,
  surgir,
  toastEntrada,
  toastSaida,
} from "../ui/motion";

function todas() {
  return {
    entrada: entrada(80),
    surgir: surgir(100),
    sumir: sumir(),
    entradaDeCelula: entradaDeCelula(120),
    toastEntrada: toastEntrada(),
    toastSaida: toastSaida(),
  };
}

describe("animações de entrada e saída", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(["ios", "android"] as const)("ficam ativas no %s", (sistema) => {
    jest.replaceProperty(Platform, "OS", sistema);
    expect(animacoesAtivas()).toBe(true);
    for (const [nome, animacao] of Object.entries(todas())) {
      expect({ nome, definida: animacao !== undefined }).toEqual({ nome, definida: true });
    }
  });

  // Na web o Reanimated congela posição e largura dos elementos animados em pixels
  // (position: absolute; width: 968px), e a tela não reflui ao redimensionar a janela.
  it("ficam desligadas na web, para a tela refluir ao redimensionar", () => {
    jest.replaceProperty(Platform, "OS", "web");
    expect(animacoesAtivas()).toBe(false);
    for (const [nome, animacao] of Object.entries(todas())) {
      expect({ nome, animacao }).toEqual({ nome, animacao: undefined });
    }
  });
});
