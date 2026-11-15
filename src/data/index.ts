import AsyncStorage from "@react-native-async-storage/async-storage";
import { criarAcoesRepositoryLocal } from "./AcoesRepository";
import { criarAgendaRepositoryLocal } from "./AgendaRepository";
import { criarPreferenciasRepositoryLocal } from "./PreferenciasRepository";

/** Repositórios do app ligados ao AsyncStorage. Só App.tsx importa este arquivo. */
export const repositorios = {
  acoes: criarAcoesRepositoryLocal(AsyncStorage),
  agenda: criarAgendaRepositoryLocal(AsyncStorage),
  preferencias: criarPreferenciasRepositoryLocal(AsyncStorage),
};

export type { AcoesRepository } from "./AcoesRepository";
export type { AgendaRepository } from "./AgendaRepository";
export type { Preferencias, PreferenciasRepository } from "./PreferenciasRepository";
