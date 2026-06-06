package com.studyquest.nos.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.nos.No;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public record NoResponse(
        Long id,
        String titulo,
        String conteudo,
        Long trilhaId,
        Integer ordem,
        Integer xpRecompensa,
        List<Long> prerequisitoIds,
        String status,
        boolean temMissao,
        List<Map<String, Object>> aulaBlocos,
        Integer xpConcedido,  // preenchido apenas no response de concluir()
        Integer novoTotalXp,  // preenchido apenas no response de concluir()
        Integer novoStreak    // preenchido apenas no response de concluir()
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static NoResponse of(No no, String status, boolean temMissao) {
        return new NoResponse(
                no.getId(),
                no.getTitulo(),
                no.getConteudo(),
                no.getTrilhaId(),
                no.getOrdem(),
                no.getXpRecompensa(),
                no.getPrerequisitos().stream().map(No::getId).toList(),
                status,
                temMissao,
                parseAula(no.getAulaJson()),
                null, null, null
        );
    }

    public static NoResponse ofConcluido(No no, boolean temMissao,
                                         int xpConcedido, int novoTotalXp, int novoStreak) {
        return new NoResponse(
                no.getId(),
                no.getTitulo(),
                no.getConteudo(),
                no.getTrilhaId(),
                no.getOrdem(),
                no.getXpRecompensa(),
                no.getPrerequisitos().stream().map(No::getId).toList(),
                "CONCLUIDO",
                temMissao,
                parseAula(no.getAulaJson()),
                xpConcedido, novoTotalXp, novoStreak
        );
    }

    private static List<Map<String, Object>> parseAula(String aulaJson) {
        if (aulaJson == null || aulaJson.isBlank()) return List.of();
        try {
            Map<String, Object> root = MAPPER.readValue(aulaJson, new TypeReference<>() {});
            Object blocos = root.get("blocos");
            if (blocos instanceof List<?> list) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> typed = (List<Map<String, Object>>) list;
                return typed.stream().map(NoResponse::sanitizeBloco).toList();
            }
        } catch (Exception ignored) {
        }
        return List.of();
    }

    private static Map<String, Object> sanitizeBloco(Map<String, Object> bloco) {
        Map<String, Object> copy = new HashMap<>(bloco);
        copy.remove("icone");
        if ("exercicio".equals(copy.get("tipo"))) {
            Object enunciado = copy.get("enunciado");
            if (enunciado instanceof String s) {
                copy.put("enunciado", stripEmojis(s));
            }
        }
        return copy;
    }

    private static String stripEmojis(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        text.codePoints()
                .filter(cp -> !isEmojiCodePoint(cp))
                .forEach(cp -> sb.appendCodePoint(cp));
        return sb.toString();
    }

    /** Compatível com JDK sem suporte a \\p{Extended_Pictographic} em regex. */
    private static boolean isEmojiCodePoint(int cp) {
        return cp == 0xFE0F || cp == 0x200D
                || (cp >= 0x2600 && cp <= 0x27BF)
                || (cp >= 0x1F000 && cp <= 0x1FFFF);
    }
}
