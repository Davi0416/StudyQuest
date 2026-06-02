package com.studyquest.ia;

import com.studyquest.ia.dto.ChatRequest;
import com.studyquest.ia.dto.ChatResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class IaService {

    @Inject
    StudyAssistant assistant;

    public ChatResponse chat(ChatRequest req) {
        String mensagemCompleta = montarMensagem(req);
        String resposta = assistant.chat(mensagemCompleta);
        return new ChatResponse(resposta);
    }

    private String montarMensagem(ChatRequest req) {
        StringBuilder sb = new StringBuilder();

        if (req.contexto() != null) {
            ChatRequest.ChatContexto ctx = req.contexto();
            if (ctx.tituloTrilha() != null) {
                sb.append("[Trilha: ").append(ctx.tituloTrilha()).append("]");
            }
            if (ctx.tituloNo() != null) {
                sb.append("[Nó: ").append(ctx.tituloNo()).append("]");
            }
            if (!sb.isEmpty()) sb.append("\n");
        }

        sb.append(req.mensagem());
        return sb.toString();
    }
}
