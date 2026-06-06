package com.studyquest.trilhas.seed;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.flashcards.Flashcard;
import com.studyquest.flashcards.FlashcardRepository;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.missoes.Missao;
import com.studyquest.missoes.MissaoRepository;
import com.studyquest.nos.No;
import com.studyquest.nos.NoRepository;
import com.studyquest.trilhas.Trilha;
import com.studyquest.trilhas.TrilhaRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@ApplicationScoped
public class TrilhaSeedLoader {

    private static final Logger LOG = Logger.getLogger(TrilhaSeedLoader.class);
    private static final String INDEX = "trilhas/index.json";

    @Inject
    TrilhaRepository trilhaRepository;

    @Inject
    NoRepository noRepository;

    @Inject
    MissaoRepository missaoRepository;

    @Inject
    FlashcardRepository flashcardRepository;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    LocalDb localDb;

    @Inject
    EntityManager em;

    @Inject
    Instance<TrilhaSeedLoader> self;

    void onStart(@Observes StartupEvent event) {
        self.get().syncFromJson();
        limparLeitnerOrfaos();
    }

    /** Sincroniza JSON → banco na subida (sempre idempotente). */
    @Transactional
    public void syncFromJson() {
        try {
            LOG.info("Sincronizando trilhas a partir dos JSONs em resources/trilhas/...");
            seedAll();
            LOG.infof("Trilhas prontas: %d ativa(s)", trilhaRepository.findAtivas().size());
        } catch (IOException e) {
            throw new IllegalStateException("Falha ao carregar trilhas do JSON", e);
        }
    }

    private void limparLeitnerOrfaos() {
        List<Long> idsValidos = flashcardRepository.findAll().list()
                .stream().map(Flashcard::getId).toList();
        if (idsValidos.isEmpty()) return;
        String inClause = idsValidos.stream().map(Object::toString)
                .collect(java.util.stream.Collectors.joining(","));
        localDb.write(em -> {
            int deleted = em.createNativeQuery(
                    "DELETE FROM leitner_cards WHERE flashcardId NOT IN (" + inClause + ")")
                    .executeUpdate();
            if (deleted > 0) LOG.infof("Removidos %d leitner_cards orfaos", deleted);
        });
    }

    /** Garante catálogo completo antes de listar (ex.: hot reload sem StartupEvent). */
    @Transactional
    public void ensureSeeded() {
        try {
            if (catalogoCompleto()) {
                return;
            }
            self.get().syncFromJson();
        } catch (IOException e) {
            throw new IllegalStateException("Falha ao carregar trilhas do JSON", e);
        }
    }

    private boolean catalogoCompleto() throws IOException {
        List<String> arquivos = objectMapper.readValue(resource(INDEX), new TypeReference<>() {});
        for (String arquivo : arquivos) {
            TrilhaSeedDto dto = objectMapper.readValue(resource("trilhas/" + arquivo), TrilhaSeedDto.class);
            Optional<Trilha> trilha = trilhaRepository.find("titulo", dto.titulo()).firstResultOptional();
            if (trilha.isEmpty() || !trilha.get().isAtivo()) {
                return false;
            }
        }
        return !arquivos.isEmpty();
    }

    private void seedAll() throws IOException {
        List<String> arquivos = objectMapper.readValue(resource(INDEX), new TypeReference<>() {});
        for (String arquivo : arquivos) {
            TrilhaSeedDto dto = objectMapper.readValue(resource("trilhas/" + arquivo), TrilhaSeedDto.class);
            Optional<Trilha> existente = trilhaRepository.find("titulo", dto.titulo()).firstResultOptional();
            if (existente.isPresent()) {
                sincronizar(existente.get(), dto);
            } else {
                importar(dto);
            }
        }
    }

    private void sincronizar(Trilha trilha, TrilhaSeedDto dto) throws IOException {
        int xpTotal = dto.xpTotal() != null
                ? dto.xpTotal()
                : dto.nos().stream().mapToInt(NoSeedDto::xpRecompensa).sum();
        trilha.setDescricao(dto.descricao());
        trilha.setCor(dto.cor());
        trilha.setXpTotal(xpTotal);
        trilha.setAtivo(true);

        List<No> existentes = noRepository.find("trilhaId", trilha.getId()).list();
        Set<Integer> ordensJson = new HashSet<>();
        for (NoSeedDto noDto : dto.nos()) {
            ordensJson.add(noDto.ordem());
        }

        for (No no : existentes) {
            no.getPrerequisitos().clear();
        }
        em.flush();

        for (No no : existentes) {
            if (!ordensJson.contains(no.getOrdem())) {
                missaoRepository.find("noId", no.getId()).list().forEach(missaoRepository::delete);
                flashcardRepository.find("noId", no.getId()).list().forEach(flashcardRepository::delete);
                noRepository.delete(no);
            }
        }
        em.flush();

        Map<Integer, No> porOrdem = new HashMap<>();
        for (No no : noRepository.find("trilhaId", trilha.getId()).list()) {
            porOrdem.put(no.getOrdem(), no);
        }

        Map<Integer, No> nosAtualizados = new HashMap<>();
        for (NoSeedDto noDto : dto.nos()) {
            No no = porOrdem.get(noDto.ordem());
            String aulaJson = noDto.aula() != null
                    ? objectMapper.writeValueAsString(noDto.aula())
                    : null;

            if (no == null) {
                no = No.builder()
                        .trilhaId(trilha.getId())
                        .ordem(noDto.ordem())
                        .titulo(noDto.titulo())
                        .conteudo(noDto.conteudo())
                        .xpRecompensa(noDto.xpRecompensa())
                        .aulaJson(aulaJson)
                        .build();
                noRepository.persist(no);
            } else {
                no.setTitulo(noDto.titulo());
                no.setConteudo(noDto.conteudo());
                no.setXpRecompensa(noDto.xpRecompensa());
                no.setAulaJson(aulaJson);
            }

            // Upsert: preserva IDs existentes para não quebrar leitner_cards
            List<Flashcard> existingFcs = flashcardRepository.find("noId", no.getId()).list();
            Map<String, Flashcard> existingByFrente = existingFcs.stream()
                    .collect(java.util.stream.Collectors.toMap(Flashcard::getFrente, f -> f, (a, b) -> a));
            Set<String> jsonFrentes = noDto.flashcards() != null
                    ? noDto.flashcards().stream().map(FlashcardSeedDto::frente).collect(java.util.stream.Collectors.toSet())
                    : java.util.Set.of();
            existingFcs.stream().filter(f -> !jsonFrentes.contains(f.getFrente()))
                    .forEach(flashcardRepository::delete);
            if (noDto.flashcards() != null) {
                for (FlashcardSeedDto fc : noDto.flashcards()) {
                    Flashcard existing = existingByFrente.get(fc.frente());
                    if (existing == null) {
                        flashcardRepository.persist(Flashcard.builder()
                                .trilhaId(trilha.getId())
                                .noId(no.getId())
                                .frente(fc.frente())
                                .verso(fc.verso())
                                .build());
                    } else {
                        existing.setVerso(fc.verso());
                    }
                }
            }

            missaoRepository.find("noId", no.getId()).firstResultOptional()
                    .ifPresent(missaoRepository::delete);
            if (noDto.missao() != null) {
                persistMissao(no, noDto.missao());
            }

            nosAtualizados.put(noDto.ordem(), no);
        }
        em.flush();

        for (NoSeedDto noDto : dto.nos()) {
            No no = nosAtualizados.get(noDto.ordem());
            no.getPrerequisitos().clear();
            if (noDto.prerequisitosOrdem() != null) {
                for (int ordemPre : noDto.prerequisitosOrdem()) {
                    No prereq = nosAtualizados.get(ordemPre);
                    if (prereq != null) {
                        no.getPrerequisitos().add(prereq);
                    }
                }
            }
        }
    }

    private void importar(TrilhaSeedDto dto) throws IOException {
        int xpTotal = dto.xpTotal() != null
                ? dto.xpTotal()
                : dto.nos().stream().mapToInt(NoSeedDto::xpRecompensa).sum();

        Trilha trilha = Trilha.builder()
                .titulo(dto.titulo())
                .descricao(dto.descricao())
                .cor(dto.cor())
                .xpTotal(xpTotal)
                .ativo(true)
                .build();
        trilhaRepository.persist(trilha);

        Map<Integer, No> nosPorOrdem = new HashMap<>();
        for (NoSeedDto noDto : dto.nos()) {
            No.NoBuilder builder = No.builder()
                    .trilhaId(trilha.getId())
                    .ordem(noDto.ordem())
                    .titulo(noDto.titulo())
                    .conteudo(noDto.conteudo())
                    .xpRecompensa(noDto.xpRecompensa());
            if (noDto.aula() != null) {
                builder.aulaJson(objectMapper.writeValueAsString(noDto.aula()));
            }
            No no = builder.build();
            noRepository.persist(no);
            nosPorOrdem.put(noDto.ordem(), no);
        }

        for (NoSeedDto noDto : dto.nos()) {
            No no = nosPorOrdem.get(noDto.ordem());
            if (noDto.prerequisitosOrdem() != null) {
                for (int ordemPre : noDto.prerequisitosOrdem()) {
                    No prereq = nosPorOrdem.get(ordemPre);
                    if (prereq != null) {
                        no.getPrerequisitos().add(prereq);
                    }
                }
            }

            if (noDto.flashcards() != null) {
                for (FlashcardSeedDto fc : noDto.flashcards()) {
                    flashcardRepository.persist(Flashcard.builder()
                            .trilhaId(trilha.getId())
                            .noId(no.getId())
                            .frente(fc.frente())
                            .verso(fc.verso())
                            .build());
                }
            }

            if (noDto.missao() != null) {
                persistMissao(no, noDto.missao());
            }
        }
    }

    private void persistMissao(No no, MissaoSeedDto m) throws IOException {
        String testesJson = objectMapper.writeValueAsString(m.testes());
        missaoRepository.persist(Missao.builder()
                .noId(no.getId())
                .titulo(no.getTitulo())
                .enunciado(m.enunciado())
                .codigoInicial(m.codigoInicial())
                .linguagem(m.linguagem())
                .testesJson(testesJson)
                .xpRecompensa(no.getXpRecompensa())
                .build());
    }

    private InputStream resource(String path) {
        InputStream stream = Thread.currentThread().getContextClassLoader().getResourceAsStream(path);
        if (stream == null) {
            throw new IllegalStateException("Recurso não encontrado: " + path);
        }
        return stream;
    }
}
