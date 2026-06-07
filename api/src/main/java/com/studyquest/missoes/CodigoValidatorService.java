package com.studyquest.missoes;

import com.studyquest.missoes.dto.ValidarCodigoRequest;
import com.studyquest.missoes.dto.ValidarCodigoResponse;
import com.studyquest.missoes.judge0.Judge0Client;
import com.studyquest.missoes.judge0.Judge0SubmissionRequest;
import com.studyquest.missoes.judge0.Judge0SubmissionResponse;
import com.studyquest.missoes.runner.LocalPythonRunner;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class CodigoValidatorService {

    private static final Map<String, Integer> LANG_IDS = Map.of(
            "python", 71,
            "javascript", 63,
            "java", 62,
            "c", 50,
            "cpp", 54,
            "go", 60
    );

    @Inject
    @RestClient
    Judge0Client judge0Client;

    @Inject
    LocalPythonRunner localPythonRunner;

    @ConfigProperty(name = "code.execution", defaultValue = "auto")
    String codeExecution;

    @ConfigProperty(name = "judge0.api-key", defaultValue = "changeme")
    String judge0ApiKey;

    public ValidarCodigoResponse validar(ValidarCodigoRequest req) {
        int aprovados = 0;
        StringBuilder feedback = new StringBuilder();

        try {
            List<Map<String, String>> testes = req.testes();
            for (Map<String, String> teste : testes) {
                String stdin = teste.getOrDefault("stdin", "");
                String expected = teste.get("expected_output");
                boolean passou = useLocalRunner(req.linguagem())
                        ? runLocal(req.codigo(), stdin, expected, feedback)
                        : runJudge0(req, stdin, expected, feedback);
                if (passou) aprovados++;
            }

            if (testes.isEmpty()) {
                return new ValidarCodigoResponse(false, "Nenhum caso de teste fornecido.", 0, 0);
            }

            boolean aprovado = aprovados == testes.size();
            if (aprovado) {
                feedback.append("Todos os casos passaram!");
            }

            return new ValidarCodigoResponse(aprovado, feedback.toString(), aprovados, testes.size());
        } catch (Exception e) {
            return new ValidarCodigoResponse(false, "Erro ao executar código: " + e.getMessage(), 0, req.testes().size());
        }
    }

    private boolean useLocalRunner(String linguagem) {
        if (!"python".equalsIgnoreCase(linguagem)) {
            return false;
        }
        return switch (codeExecution.toLowerCase()) {
            case "local" -> true;
            case "judge0" -> false;
            default -> isJudge0Unavailable();
        };
    }

    private boolean isJudge0Unavailable() {
        return judge0ApiKey == null || judge0ApiKey.isBlank() || "changeme".equals(judge0ApiKey);
    }

    private boolean runLocal(String codigo, String stdin, String expected, StringBuilder feedback) {
        try {
            LocalPythonRunner.ExecutionResult result = localPythonRunner.run(codigo, stdin);
            if (!result.ok()) {
                feedback.append("Erro: ").append(result.output()).append("\n");
                return false;
            }
            if (Objects.equals(normalize(result.stdout()), normalize(expected))) {
                return true;
            }
            feedback.append("Saída esperada:\n").append(expected)
                    .append("Saída obtida:\n").append(result.stdout()).append("\n");
            return false;
        } catch (Exception e) {
            feedback.append("Erro ao executar Python local: ").append(e.getMessage()).append("\n");
            return false;
        }
    }

    private boolean runJudge0(ValidarCodigoRequest req, String stdin, String expected, StringBuilder feedback) {
        try {
            Judge0SubmissionRequest judgeReq = new Judge0SubmissionRequest(
                    req.codigo(),
                    LANG_IDS.getOrDefault(req.linguagem().toLowerCase(), 71),
                    stdin,
                    expected
            );

            Judge0SubmissionResponse res = judge0Client.submit(judgeReq);
            if (res.isAccepted()) {
                return true;
            }
            feedback.append("Caso falhou: ").append(res.output()).append("\n");
            return false;
        } catch (Exception e) {
            if ("auto".equalsIgnoreCase(codeExecution) && "python".equalsIgnoreCase(req.linguagem())) {
                return runLocal(req.codigo(), stdin, expected, feedback);
            }
            throw e;
        }
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.replace("\r\n", "\n");
    }
}
