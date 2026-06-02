package com.studyquest.missoes.runner;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class LocalPythonRunner {

    private static final int TIMEOUT_SECONDS = 5;

    @ConfigProperty(name = "studyquest.python.executable")
    Optional<String> pythonExecutable;

    public ExecutionResult run(String codigo, String stdin) throws IOException, InterruptedException {
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

            if (stdin != null && !stdin.isEmpty()) {
                process.getOutputStream().write(stdin.getBytes(StandardCharsets.UTF_8));
            }
            process.getOutputStream().close();

            boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return new ExecutionResult(false, "", "Tempo limite excedido (5s)");
            }

            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());

            if (process.exitValue() != 0 && !stderr.isBlank()) {
                return new ExecutionResult(false, stdout, stderr.trim());
            }

            return new ExecutionResult(true, stdout, stderr);
        } finally {
            Files.deleteIfExists(script);
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
        if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
            return new String[]{"py", "-3"};
        }
        return new String[]{"python3"};
    }

    private String readStream(InputStream stream) throws IOException {
        byte[] bytes = stream.readAllBytes();
        String utf8 = new String(bytes, StandardCharsets.UTF_8);
        if (utf8.indexOf('\uFFFD') >= 0 && isWindows()) {
            return new String(bytes, java.nio.charset.Charset.forName("Windows-1252"));
        }
        return utf8;
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
