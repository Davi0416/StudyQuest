#!/usr/bin/env python3
"""Expande O Caminho da Serpente: vertentes + miniboss + boss final."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "api/src/main/resources/trilhas/caminho-da-serpente.json"

NEW_NODES = [
    {
        "ordem": 6,
        "titulo": "Funções e Escopo",
        "conteudo": "## Vertente Leste — Forjando Feitiços Reutilizáveis\n\nFunções são receitas nomeadas: você escreve uma vez e invoca quantas vezes quiser. Nesta vertente você aprende def, return e parâmetros — a base de todo código organizado.\n\nObjetivo:\n• Criar funções com def\n• Passar argumentos e receber return\n• Reutilizar lógica sem repetir código\n\nFeitiços: def · return · parâmetros · escopo local",
        "xpRecompensa": 75,
        "prerequisitosOrdem": [4],
        "flashcards": [
            {"frente": "Invocar um Feitiço\nComo declarar uma função chamada atacar?", "verso": "def atacar():\n    print(\"Golpe!\")\n\nA palavra-chave def cria a função. Os dois pontos abrem o bloco indentado."},
            {"frente": "Entrega de Resultado\nO que return faz?", "verso": "Devolve um valor para quem chamou a função e encerra a execução.\n\ndef dobro(n):\n    return n * 2\n\ndobro(5)  →  10"},
            {"frente": "Ingredientes\nO que são parâmetros?", "verso": "Variáveis que a função recebe na chamada.\n\ndef curar(vida, pocao):\n    return vida + pocao\n\ncurar(80, 20)  →  100"},
            {"frente": "Escopo Local\nVariável criada dentro da função existe fora?", "verso": "Não. Variáveis dentro de def são locais — nascem e morrem com a função.\n\nIsso evita conflitos e deixa o código previsível."},
        ],
        "aula": {
            "blocos": [
                {"tipo": "texto", "conteudo": "## Vertente Leste — Funções\n\nContexto: Até aqui você escreveu instruções soltas. Em projetos reais, repetir código é receita para bugs — muda em um lugar, esquece no outro.\n\nFunções resolvem isso: encapsulam um comportamento com nome claro.\n\nObjetivo: Ao final desta vertente você terá feitiços reutilizáveis prontos para o confronto contra a Serpente."},
                {"tipo": "texto", "conteudo": "▶ def — declarando um feitiço\n\ndef cumprimentar(nome):\n    print(f\"Olá, {nome}!\")\n\ncumprimentar(\"Luna\")\n\nRegras:\n• def nome_da_funcao(parametros):\n• Corpo indentado com 4 espaços\n• Chame com nome_da_funcao(valor)\n\n▶ return — devolvendo resultado\n\ndef area_quadrado(lado):\n    return lado * lado\n\nresultado = area_quadrado(5)\nprint(resultado)  →  25\n\nSem return, a função devolve None implicitamente.\n\nDica: Nomes de função seguem a mesma regra de variáveis: snake_case, verbos quando possível — calcular_dano, purificar_nome."},
                {"tipo": "texto", "conteudo": "Prática: Três exercícios para fixar funções antes de seguir ao cruzamento das vertentes."},
                {"tipo": "exercicio", "id": "func-hello", "nivel": 1, "enunciado": "Feitiço de Boas-vindas\n\nCrie a função cumprimentar que recebe um nome e imprime Olá, <nome>!\n\nDepois chame cumprimentar(\"Aventureiro\").\n\nSaída esperada:\nOlá, Aventureiro!", "codigoInicial": "def cumprimentar(nome):\n    pass\n\ncumprimentar(\"Aventureiro\")\n", "linguagem": "python", "testes": [{"stdin": "", "expected_output": "Olá, Aventureiro!\n"}]},
                {"tipo": "exercicio", "id": "func-dobro", "nivel": 2, "enunciado": "Amplificador de Poder\n\nCrie dobro(n) que retorna n multiplicado por 2.\n\nImprima dobro(7).\n\nSaída esperada:\n14", "codigoInicial": "def dobro(n):\n    pass\n\nprint(dobro(7))\n", "linguagem": "python", "testes": [{"stdin": "", "expected_output": "14\n"}]},
                {"tipo": "exercicio", "id": "func-curar", "nivel": 3, "enunciado": "Poção de Cura\n\nCrie curar(vida, pocao) que retorna vida + pocao.\n\nImprima curar(60, 25).\n\nSaída esperada:\n85", "codigoInicial": "def curar(vida, pocao):\n    pass\n\nprint(curar(60, 25))\n", "linguagem": "python", "testes": [{"stdin": "", "expected_output": "85\n"}]},
                {"tipo": "flashcards"},
            ],
        },
    },
    {
        "ordem": 7,
        "titulo": "Dicionários",
        "conteudo": "## Vertente Oeste — Grimórios Indexados\n\nDicionários guardam pares chave → valor, como um inventário RPG: \"espada\" aponta para +15 de dano. Ideal para configs, fichas de personagem e registros nomeados.\n\nObjetivo:\n• Criar e ler dicts\n• Usar .get() com fallback\n• Iterar chaves e valores\n\nFeitiços: dict · chaves · valores · .get()",
        "xpRecompensa": 75,
        "prerequisitosOrdem": [3],
        "flashcards": [
            {"frente": "Grimório Indexado\nComo criar um dicionário de herói?", "verso": "heroi = {\"nome\": \"Kira\", \"classe\": \"Maga\", \"nivel\": 5}\n\nChaves entre aspas, separadas por vírgula."},
            {"frente": "Consulta Rápida\nComo ler heroi[\"classe\"]?", "verso": "Retorna \"Maga\".\n\nSe a chave não existir → KeyError.\nUse .get(\"chave\", padrao) para evitar crash."},
            {"frente": "Valor Seguro\nO que heroi.get(\"ouro\", 0) faz?", "verso": "Retorna o valor de \"ouro\" se existir.\nSe não existir, retorna 0 (valor padrão)."},
            {"frente": "Atualizar Ficha\nComo subir o nível?", "verso": "heroi[\"nivel\"] = 6\n\nAtribuir em chave existente atualiza.\nAtribuir em chave nova adiciona o par."},
        ],
        "aula": {
            "blocos": [
                {"tipo": "texto", "conteudo": "## Vertente Oeste — Dicionários\n\nContexto: Listas usam posição numérica (0, 1, 2). Dicionários usam rótulos legíveis — perfeito quando você quer buscar \"nome\" em vez de lembrar que nome está na posição 1.\n\nObjetivo: Dominar dicts para desbloquear o cruzamento das três vertentes antes do miniboss."},
                {"tipo": "texto", "conteudo": "▶ Criando e lendo\n\nficha = {\"nome\": \"Rex\", \"hp\": 100, \"classe\": \"Tank\"}\nprint(ficha[\"nome\"])   →  Rex\nprint(ficha.get(\"mp\", 0))  →  0 (chave mp não existe)\n\n▶ Modificando\n\nficha[\"hp\"] = 85\nficha[\"mp\"] = 40\n\n▶ Percorrendo\n\nfor chave in ficha:\n    print(chave, ficha[chave])\n\nDica: dicts são mutáveis — diferente de tuplas, você pode alterar valores livremente."},
                {"tipo": "texto", "conteudo": "Prática: Organize fichas de heróis e prepare-se para purificar registros corrompidos no miniboss."},
                {"tipo": "exercicio", "id": "dict-criar", "nivel": 1, "enunciado": "Ficha do Recruta\n\nCrie item = {\"nome\": \"Espada Longa\", \"dano\": 15} e imprima item[\"dano\"].\n\nSaída esperada:\n15", "codigoInicial": "# Crie o dicionário e imprima o dano\n", "linguagem": "python", "testes": [{"stdin": "", "expected_output": "15\n"}]},
                {"tipo": "exercicio", "id": "dict-get", "nivel": 2, "enunciado": "Baú Misterioso\n\nheroi = {\"nome\": \"Luna\"}\n\nUse .get para imprimir ouro com padrão 0 (heroi não tem ouro).\n\nSaída esperada:\n0", "codigoInicial": "heroi = {\"nome\": \"Luna\"}\n# print com .get\n", "linguagem": "python", "testes": [{"stdin": "", "expected_output": "0\n"}]},
                {"tipo": "exercicio", "id": "dict-update", "nivel": 3, "enunciado": "Level Up\n\nficha = {\"nome\": \"Kira\", \"nivel\": 4}\n\nAtualize nivel para 5 e imprima ficha[\"nivel\"].\n\nSaída esperada:\n5", "codigoInicial": "ficha = {\"nome\": \"Kira\", \"nivel\": 4}\n# Atualize e imprima\n", "linguagem": "python", "testes": [{"stdin": "", "expected_output": "5\n"}]},
                {"tipo": "flashcards"},
            ],
        },
    },
    {
        "ordem": 8,
        "titulo": "Miniboss: O Limpador de Registros",
        "conteudo": "## Cruzamento — Guardião dos Arquivos\n\nAs três vertentes convergem aqui. O Limpador de Registros corrompeu os arquivos da guilda — use split, f-strings e tudo que aprendeu para purificar um registro.\n\nObjetivo: Vencer o miniboss antes de enfrentar a Serpente Ascendente.",
        "xpRecompensa": 100,
        "prerequisitosOrdem": [5, 6, 7],
        "flashcards": [
            {"frente": "Registro Sujo\nEntrada: xX_LAMA_Xx-Hero-25-Guerreiro\nQual parte é o nome?", "verso": "partes = dado.split(\"-\")\nnome = partes[1]  →  \"Hero\"\n\npartes[0] é lixo — ignore sempre."},
            {"frente": "Purificação\nFormato final esperado?", "verso": "*** Hero *** tem 25 anos...\n\nMonte com f-string e partes[1], partes[2]."},
        ],
        "aula": {
            "blocos": [
                {"tipo": "texto", "conteudo": "## Miniboss — O Limpador de Registros\n\nContexto: Você completou Listas, Funções e Dicionários. O guardião dos arquivos aceita apenas código limpo.\n\nEntrada crua:\nxX_LAMA_Xx-Herolink-25-Guerreiros\n\nSaída purificada:\n*** Herolink *** tem 25 anos...\n\nPassos:\n1. dado = input()\n2. partes = dado.split(\"-\")\n3. nome = partes[1], idade = partes[2]\n4. print(f\"*** {nome} *** tem {idade} anos...\")\n\nEste é um miniboss — teste médio antes do confronto final."},
                {"tipo": "exercicio", "id": "miniboss-limpador", "nivel": 3, "miniboss": True, "titulo": "O Limpador de Registros", "enunciado": "Miniboss: O Limpador de Registros\n\nPurifique o registro lido com input().\n\nEntrada:\nxX_LAMA_Xx-Herolink-25-Guerreiros\n\nSaída:\n*** Herolink *** tem 25 anos...\n\nObjetivo:\n1. Leia com input()\n2. Quebre com split(\"-\")\n3. Use partes[1] e partes[2] na f-string\n\nAtenção: ignore partes[0].", "codigoInicial": "dado = input()\n# Purifique abaixo\n", "linguagem": "python", "testes": [{"stdin": "xX_LAMA_Xx-Herolink-25-Guerreiros", "expected_output": "*** Herolink *** tem 25 anos...\n"}]},
                {"tipo": "flashcards"},
            ],
        },
    },
    {
        "ordem": 9,
        "titulo": "Boss Final: A Serpente Ascendente",
        "conteudo": "## Câmara Final — O Caminho se Completa\n\nA Serpente Ascendente guarda o título de Iniciado. Processe vários registros corrompidos em loop, purifique cada linha e reporte o total — tudo que a trilha ensinou, em um único desafio.\n\nObjetivo: Derrotar o boss e concluir O Caminho da Serpente.",
        "xpRecompensa": 200,
        "prerequisitosOrdem": [8],
        "flashcards": [
            {"frente": "Múltiplos Registros\nComo ler N linhas após saber N?", "verso": "n = int(input())\nfor _ in range(n):\n    linha = input()\n    # processe linha"},
            {"frente": "Contador\nComo contar quantos heróis purificou?", "verso": "total = 0\n# a cada sucesso:\ntotal += 1\nprint(f\"Total: {total} heróis\")"},
        ],
        "aula": {
            "blocos": [
                {"tipo": "texto", "conteudo": "## Boss Final — A Serpente Ascendente\n\nContexto: O Limpador era só o guardião. A Serpente corrompeu um lote inteiro de fichas.\n\nFormato de entrada:\n• Linha 1: número N de registros\n• Próximas N linhas: xX_LAMA_Xx-Nome-Idade-Classe\n\nFormato de saída (uma linha por registro, depois total):\n*** Nome *** · Classe · Idade anos\n...\nTotal: N heróis\n\nCombine: input, int(), for range, split, f-string e contador.\n\nMestre: Se passar aqui, você completou a primeira trilha de Python. Parabéns, Serpente Iniciada."},
                {"tipo": "exercicio", "id": "boss-serpente", "nivel": 4, "boss": True, "titulo": "A Serpente Ascendente", "enunciado": "Boss Final: A Serpente Ascendente\n\nLeia N (primeira linha), depois N registros sujos.\n\nPara cada registro, imprima:\n*** Nome *** · Classe · Idade anos\n\nAo final, imprima:\nTotal: N heróis\n\nExemplo entrada:\n2\nxX_LAMA_Xx-Kira-19-Maga\nxX_LAMA_Xx-Rex-24-Tank\n\nSaída:\n*** Kira *** · Maga · 19 anos\n*** Rex *** · Tank · 24 anos\nTotal: 2 heróis", "codigoInicial": "n = int(input())\nfor _ in range(n):\n    pass\n", "linguagem": "python", "testes": [{"stdin": "2\nxX_LAMA_Xx-Kira-19-Maga\nxX_LAMA_Xx-Rex-24-Tank", "expected_output": "*** Kira *** · Maga · 19 anos\n*** Rex *** · Tank · 24 anos\nTotal: 2 heróis\n"}]},
                {"tipo": "flashcards"},
            ],
        },
    },
]


def patch_node_5(node: dict) -> None:
    node["titulo"] = "Listas e Tuplas"
    node["conteudo"] = (
        "## Caminho Central — A Mochila do Mestre\n\n"
        "Listas guardam vários itens; tuplas guardam dados imutáveis. "
        "Nesta etapa central você aprende estruturas de dados e try/except antes das vertentes e do confronto final.\n\n"
        "Objetivo:\n• Criar e modificar listas\n• Usar tuplas imutáveis\n• Proteger código com try/except\n\n"
        "Feitiços: listas · tuplas · try/except · split"
    )
    node["xpRecompensa"] = 75
    blocos = node["aula"]["blocos"]
    # Remove boss intro + boss exercicio (last two content blocks before flashcards)
    new_blocos = []
    skip_ids = {"boss-limpador-registros"}
    for b in blocos:
        if b.get("tipo") == "exercicio" and b.get("id") in skip_ids:
            continue
        if b.get("tipo") == "texto" and "MISSÃO FINAL: O Limpador" in b.get("conteudo", ""):
            continue
        if b.get("tipo") == "texto" and "Capítulo Final — A Mochila" in b.get("conteudo", ""):
            b = dict(b)
            b["conteudo"] = (
                "## Caminho Central — A Mochila do Mestre\n\n"
                "Contexto: Você dominou condicionais e laços. Agora aprende a guardar vários valores juntos.\n\n"
                "Listas [ ] são flexíveis; tuplas ( ) são imutáveis. try/except protege seu código de entradas inválidas.\n\n"
                "Objetivo: Complete esta etapa e explore as vertentes de Funções (leste) e Dicionários (oeste) antes do miniboss."
            )
        if b.get("tipo") == "texto" and "Prática: Campo de Treinamento — Listas e Proteção" in b.get("conteudo", ""):
            b = dict(b)
            b["conteudo"] = (
                "Prática: Campo de Treinamento — Listas e Proteção\n\n"
                "Três exercícios para fixar mochila, cofre e escudo try/except.\n\n"
                "Depois siga para Funções ou Dicionários — ambas levam ao miniboss."
            )
        new_blocos.append(b)
    node["aula"]["blocos"] = new_blocos


def main() -> None:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    data["descricao"] = (
        "Python 3 do zero — trilha completa com vertentes, miniboss e boss final da Serpente Ascendente."
    )
    nodes = [n for n in data["nos"] if n["ordem"] <= 5]
    for n in nodes:
        if n["ordem"] == 5:
            patch_node_5(n)
    nodes.extend(NEW_NODES)
    data["nos"] = sorted(nodes, key=lambda n: n["ordem"])
    data["xpTotal"] = sum(n["xpRecompensa"] for n in data["nos"])
    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: {len(data['nos'])} nós, {data['xpTotal']} XP total")


if __name__ == "__main__":
    main()
