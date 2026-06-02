package com.studyquest.missoes;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.missoes.dto.MissaoResponse;
import com.studyquest.missoes.dto.SubmeterCodigoRequest;
import com.studyquest.missoes.dto.SubmissaoResponse;
import com.studyquest.missoes.judge0.Judge0Client;
import com.studyquest.missoes.judge0.Judge0SubmissionRequest;
import com.studyquest.missoes.judge0.Judge0SubmissionResponse;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class MissaoService {

    // mapeamento Judge0 language_id por nome
    private static final Map<String, Integer> LANG_IDS = Map.of(
            "python", 71,
            "javascript", 63,
            "java", 62,
            "c", 50,
            "cpp", 54,
            "go", 60
    );

    @Inject
    MissaoRepository missaoRepository;

    @Inject
    SubmissaoRepository submissaoRepository;

    @Inject
    @RestClient
    Judge0Client judge0Client;

    @Inject
    ObjectMapper objectMapper;

    public MissaoResponse detalhe(Long missaoId) {
        Missao missao = missaoRepository.findById(missaoId);
        if (missao == null) throw new RecursoNaoEncontradoException("Missão não encontrada");
        return new MissaoResponse(missao);
    }

    @Transactional
    public SubmissaoResponse submeter(Long missaoId, UUID userId, SubmeterCodigoRequest req) {
        Missao missao = missaoRepository.findById(missaoId);
        if (missao == null) throw new RecursoNaoEncontradoException("Missão não encontrada");

        boolean jaPrimeira = submissaoRepository.jaAprovouNaPrimeiraTentativa(missaoId, userId);
        boolean aprovado = false;
        StringBuilder feedback = new StringBuilder();

        try {
            List<Map<String, String>> testes = objectMapper.readValue(
                    missao.getTestesJson(), new TypeReference<>() {});

            int aprovados = 0;
            for (Map<String, String> teste : testes) {
                Judge0SubmissionRequest judgeReq = new Judge0SubmissionRequest(
                        req.codigo(),
                        LANG_IDS.getOrDefault(req.linguagem().toLowerCase(), 71),
                        teste.get("stdin"),
                        teste.get("expected_output")
                );

                Judge0SubmissionResponse res = judge0Client.submit(judgeReq);
                if (res.isAccepted()) {
                    aprovados++;
                } else {
                    feedback.append("Caso falhou: ").append(res.output()).append("\n");
                }
            }

            aprovado = aprovados == testes.size();
            if (aprovado) feedback.append("Todos os casos passaram!");

        } catch (Exception e) {
            feedback.append("Erro ao executar código: ").append(e.getMessage());
        }

        boolean primeiraAprovacao = aprovado && !jaPrimeira;

        Submissao submissao = Submissao.builder()
                .missaoId(missaoId)
                .userId(userId)
                .codigo(req.codigo())
                .linguagem(req.linguagem())
                .status(aprovado ? "APROVADO" : "REPROVADO")
                .feedback(feedback.toString())
                .primeiraAprovacao(primeiraAprovacao)
                .build();

        submissaoRepository.persist(submissao);
        return new SubmissaoResponse(submissao);
    }

    public List<SubmissaoResponse> historico(Long missaoId, UUID userId) {
        return submissaoRepository.findByMissaoAndUser(missaoId, userId).stream()
                .map(SubmissaoResponse::new)
                .toList();
    }
}
