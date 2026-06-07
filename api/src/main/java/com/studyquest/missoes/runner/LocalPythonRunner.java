package com.studyquest.missoes.runner;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class LocalPythonRunner {

    private static final int TIMEOUT_SECONDS = 5;
    private static final int MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB

    @ConfigProperty(name = "studyquest.python.executable")
    Optional<String> pythonExecutable;

    // Perfil ativo injetado para bloquear execução em servidor
    @ConfigProperty(name = "quarkus.profile", defaultValue = "dev")
    String activeProfile;

    public ExecutionResult run(String codigo, String stdin) throws IOException, InterruptedException {
        if ("neon".equalsIgnoreCase(activeProfile)) {
            throw new UnsupportedOperationException("Runner local não permitido em servidor");
        }

        Path script = Files.createTempFile("studyquest-", ".py");
        try {
            Files.writeString(script, codigo, StandardCharsets.UTF_8);

            List<String> cmd = new ArrayList<>(Arrays.asList(pythonCommand()));
            cmd.add(script.toAbsolutePath().toString());

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(false);
            pb.environment().put("PYTHONIOENCODING", "utf-8");
            pb.environment().put("PYTHONUTF8", "1");

            Process process = pb.start();

            // Escreve stdin e fecha o pipe imediatamente para não bloquear o processo
            if (stdin != null && !stdin.isEmpty()) {
                process.getOutputStream().write(stdin.getBytes(StandardCharsets.UTF_8));
            }
            process.getOutputStream().close();

            // Lê stdout e stderr em threads concorrentes para evitar deadlock de buffer
            ExecutorService executor = Executors.newFixedThreadPool(2);
            Future<String> stdoutFuture = executor.submit(() -> readCapped(process.getInputStream()));
            Future<String> stderrFuture = executor.submit(() -> readCapped(process.getErrorStream()));
            executor.shutdown();

            boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                executor.shutdownNow();
                return new ExecutionResult(false, "", "Tempo limite excedido (5s)");
            }

            String stdout = getQuietly(stdoutFuture);
            String stderr = getQuietly(stderrFuture);

            if (isWindows() && stdout.indexOf('�') >= 0) {
                // Releitura com encoding Windows quando UTF-8 falha
                stdout = new String(stdout.getBytes(StandardCharsets.UTF_8), "Windows-1252");
            }

            if (process.exitValue() != 0 && !stderr.isBlank()) {
                return new ExecutionResult(false, stdout, stderr.trim());
            }

            return new ExecutionResult(true, stdout, stderr);
        } finally {
            Files.deleteIfExists(script);
        }
    }

    /**
     * Lê até MAX_OUTPUT_BYTES do stream. Trunca sem lançar exceção.
     * Chamado em thread separada para evitar deadlock stdout/stderr.
     */
    private String readCapped(InputStream stream) {
        try {
            byte[] buf = new byte[MAX_OUTPUT_BYTES];
            int totalRead = 0;
            int read;
            while (totalRead < MAX_OUTPUT_BYTES &&
                   (read = stream.read(buf, totalRead, MAX_OUTPUT_BYTES - totalRead)) != -1) {
                totalRead += read;
            }
            // Drena o restante sem guardar, para não bloquear o processo
            stream.transferTo(OutputStream.nullOutputStream());
            return new String(buf, 0, totalRead, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }

    private String getQuietly(Future<String> future) {
        try {
            return future.get(TIMEOUT_SECONDS + 1L, TimeUnit.SECONDS);
        } catch (Exception e) {
            return "";
        }
    }

    private String[] pythonCommand() {
        if (pythonExecutable.isPresent() && !pythonExecutable.get().isBlank()) {
            return new String[]{pythonExecutable.get()};
        }
        String env = System.getenv("STUDYQUEST_PYTHON");
        if (env != null && !env.isBlank()) {
            return new String[]{env};
        }
        if (isWindows()) {
            return new String[]{"py", "-3"};
        }
        return new String[]{"python3"};
    }

    private boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    public record ExecutionResult(boolean ok, String stdout, String stderr) {
        public String output() {
            if (!stdout.isBlank()) return stdout;
            return stderr != null ? stderr : "";
        }
    }
}
