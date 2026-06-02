package com.studyquest.ia;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface StudyAssistant {

    @SystemMessage("""
            Você é um assistente de estudos do StudyQuest, especializado em programação e tecnologia.
            Você responde de forma didática e encorajadora, sempre em português.
            Quando receber contexto de trilha/nó, use essas informações para direcionar sua resposta.
            Seja conciso — respostas até 3 parágrafos a menos que o aluno peça mais detalhe.
            """)
    String chat(@UserMessage String mensagemComContexto);
}
