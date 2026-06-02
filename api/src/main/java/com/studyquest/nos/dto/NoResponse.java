package com.studyquest.nos.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.nos.No;

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
        List<Map<String, Object>> aulaBlocos
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
                parseAula(no.getAulaJson())
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
                return typed;
            }
        } catch (Exception ignored) {
        }
        return List.of();
    }
}
