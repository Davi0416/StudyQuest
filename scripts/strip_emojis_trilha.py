import json
import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "api/src/main/resources/trilhas/caminho-da-serpente.json"
data = json.loads(path.read_text(encoding="utf-8"))

line_subs = [
    (r"^🏆\s*", "## "),
    (r"^📖\s*", "Contexto: "),
    (r"^🎯\s*", "Objetivo: "),
    (r"^🧙\s*O Mestre diz:\s*", "Mestre: "),
    (r"^🧙\s*", "Mestre: "),
    (r"^✨\s*", "Saída: "),
    (r"^⚔️\s*", "Prática: "),
    (r"^📜\s*", ""),
    (r"^💡\s*", "Dica: "),
    (r"^⚠️\s*", "Atenção: "),
    (r"^🐉\s*", "## "),
    (r"^📥\s*", "Entrada: "),
    (r"^📤\s*", "Saída esperada: "),
]
inline_subs = [
    ("Bem-vindo, aventureiro! ⚔️", "Bem-vindo, aventureiro."),
    ("Bug de Alquimia 🧪", "Bug de Alquimia"),
    ("Portão da Fortaleza 🔐", "Portão da Fortaleza"),
    ("Boss final! 🐉", "Boss final."),
    ("⚔️ Feitiços deste capítulo:", "Feitiços deste capítulo:"),
    ("📖 Capítulo", "## Capítulo"),
    ("🎯 Ao final você será capaz de:", "Objetivo: Ao final você será capaz de:"),
    ("📖 O Contexto da Aventura", "Contexto: O Contexto da Aventura"),
    ("📖 A Lenda do Início", "Contexto: A Lenda do Início"),
    ("📖 O Problema", "Contexto: O Problema"),
    ("📖 Você chegou longe.", "Contexto: Você chegou longe."),
    ("📖 O Pergaminho Sujo", "Contexto: O Pergaminho Sujo"),
    ("📖 Exemplo do saque goblínico:", "Contexto: Exemplo do saque goblínico:"),
    ("📖 História de campo:", "Contexto: História de campo:"),
    ("📖 Na prática:", "Contexto: Na prática:"),
    ("📖 No mundo real:", "Contexto: No mundo real:"),
    ("📖 Padrão comum em jogos:", "Contexto: Padrão comum em jogos:"),
]

emoji_re = re.compile(
    "["
    "\U0001F3C6\U0001F4D6\U0001F3AF\U0001F9D9\U0001F31F"
    "\U00002694\U0001F4A1\U000026A0\U0001F4DC"
    "\U0001F409\U0001F52E\U0001F6E1\U0001F4E5\U0001F4E4\U0001F9EA"
    "\U0001F4FA"
    "]+"
)


def transform(s: str) -> str:
    for a, b in inline_subs:
        s = s.replace(a, b)
    lines: list[str] = []
    for line in s.split("\n"):
        for pat, rep in line_subs:
            line = re.sub(pat, rep, line)
        line = emoji_re.sub("", line).rstrip()
        if line:
            lines.append(line)
        elif lines and lines[-1] != "":
            lines.append("")
    out = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", out)


def walk(obj):
    if isinstance(obj, dict):
        return {k: walk(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [walk(x) for x in obj]
    if isinstance(obj, str):
        return transform(obj)
    return obj


data = walk(data)
for no in data["nos"]:
    aula = no.get("aula")
    if not aula:
        continue
    for bloco in aula.get("blocos", []):
        if bloco.get("tipo") == "exercicio":
            bloco.pop("icone", None)

path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Updated {path}")
