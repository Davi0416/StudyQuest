package com.studyquest.missoes.runner;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class CodeExecutionStartupCheck {

    @ConfigProperty(name = "code.execution", defaultValue = "auto")
    String codeExecution;

    @ConfigProperty(name = "quarkus.profile", defaultValue = "dev")
    String activeProfile;

    void onStart(@Observes StartupEvent event) {
        if ("local".equalsIgnoreCase(codeExecution) && !"desktop".equalsIgnoreCase(activeProfile)) {
            throw new IllegalStateException(
                "Configuração inválida: code.execution=local é permitido apenas no perfil 'desktop'. " +
                "Perfil ativo: '" + activeProfile + "'. " +
                "Defina CODE_EXECUTION=judge0 ou CODE_EXECUTION=auto para este ambiente."
            );
        }
    }
}
