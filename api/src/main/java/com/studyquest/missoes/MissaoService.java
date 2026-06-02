package com.studyquest.missoes;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.missoes.dto.MissaoResponse;
import com.studyquest.missoes.dto.SubmeterCodigoRequest;
import com.studyquest.missoes.dto.SubmissaoResponse;
import com.studyquest.missoes.dto.ValidarCodigoRequest;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class MissaoService {

    @Inject
    MissaoRepository missaoRepository;

    @Inject
    SubmissaoRepository submissaoRepository;

    @Inject
    CodigoValidatorService codigoValidatorService;

    @Inject
    ObjectMapper objectMapper;

    public MissaoResponse detalhe(Long missaoId) {
        Missao missao = missaoRepository.findById(missaoId);
        if (missao == null) throw new RecursoNaoEncontradoException("Missão não encontrada");
        return new MissaoResponse(missao);
    }

    public MissaoResponse porNoId(Long noId) {
        Missao missao = missaoRepository.findByNoId(noId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Missão não encontrada para este nó"));
        return new MissaoResponse(missao);
    }

    @Transactional
    public SubmissaoResponse submeter(Long missaoId, UUID userId, SubmeterCodigoRequest req) {
        Missao missao = missaoRepository.findById(missaoId);
        if (missao == null) throw new RecursoNaoEncontradoException("Missão não encontrada");

        boolean jaPrimeira = submissaoRepository.jaAprovouNaPrimeiraTentativa(missaoId, userId);

        try {
            List<Map<String, String>> testes = objectMapper.readValue(
                    missao.getTestesJson(), new TypeReference<>() {});

            var validacao = codigoValidatorService.validar(
                    new ValidarCodigoRequest(req.codigo(), req.linguagem(), testes));

            boolean aprovado = validacao.aprovado();
            String feedback = validacao.feedback();
            boolean primeiraAprovacao = aprovado && !jaPrimeira;

            Submissao submissao = Submissao.builder()
                    .missaoId(missaoId)
                    .userId(userId)
                    .codigo(req.codigo())
                    .linguagem(req.linguagem())
                    .status(aprovado ? "APROVADO" : "REPROVADO")
                    .feedback(feedback)
                    .primeiraAprovacao(primeiraAprovacao)
                    .build();

            submissaoRepository.persist(submissao);
            return new SubmissaoResponse(submissao);
        } catch (Exception e) {
            Submissao submissao = Submissao.builder()
                    .missaoId(missaoId)
                    .userId(userId)
                    .codigo(req.codigo())
                    .linguagem(req.linguagem())
                    .status("REPROVADO")
                    .feedback("Erro ao executar código: " + e.getMessage())
                    .primeiraAprovacao(false)
                    .build();
            submissaoRepository.persist(submissao);
            return new SubmissaoResponse(submissao);
        }
    }

    public List<SubmissaoResponse> historico(Long missaoId, UUID userId) {
        return submissaoRepository.findByMissaoAndUser(missaoId, userId).stream()
                .map(SubmissaoResponse::new)
                .toList();
    }
}
