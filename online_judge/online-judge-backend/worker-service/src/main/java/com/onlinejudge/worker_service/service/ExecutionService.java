package com.onlinejudge.worker_service.service;

import com.onlinejudge.worker_service.dto.ExecutionResult;
import com.onlinejudge.worker_service.entity.Submission;
import com.onlinejudge.worker_service.entity.TestCase;
import com.onlinejudge.worker_service.entity.enums.Verdict;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class ExecutionService {

    @Value("${execution.timeout.seconds}")
    private int timeoutSeconds;

    @Value("${execution.memory.limit}")
    private String memoryLimit;

    @Value("${execution.cpu.limit}")
    private String cpuLimit;

    // Path inside worker container (for file I/O)
    @Value("${execution.temp.dir:/judge-tmp}")
    private String tempBaseDir;

    // Path on HOST machine (for docker -v mount passed to gcc/python/java container)
    @Value("${execution.host.temp.dir:/tmp/judge}")
    private String hostTempBaseDir;

    public ExecutionResult execute(Submission submission,
                                   List<TestCase> testCases) {

        Path tempDir = null;

        try {
            // Create temp dir inside the container-side mounted path
            Path base = Paths.get(tempBaseDir);
            Files.createDirectories(base);
            tempDir = Files.createTempDirectory(base, "judge_" + submission.getId());

            // ─── Step 1: Write code to file ──────────────────────────
            String sourceFileName = getSourceFileName(
                    submission.getLanguage().getName());
            Path sourceFile = tempDir.resolve(sourceFileName);
            Files.writeString(sourceFile, submission.getCode());

            log.info("Source file written: {}", sourceFile);

            // ─── Step 2: Compile inside Docker (skipped for interpreted langs) ──
            String compilationError = compile(
                    tempDir,
                    submission.getLanguage().getDockerImage(),
                    submission.getLanguage().getCompileCmd()
            );

            if (compilationError != null) {
                log.warn("Compilation failed for submissionId={}, error={}",
                        submission.getId(), compilationError);
                return ExecutionResult.builder()
                        .verdict(Verdict.COMPILATION_ERROR)
                        .executionMs(0)
                        .testCasesPassed(0)
                        .testCasesTotal(testCases.size())
                        .errorMessage(compilationError)
                        .build();
            }

            log.info("Compilation successful (or skipped) for submissionId={}",
                    submission.getId());

            // ─── Step 3: Run against each test case ──────────────────
            int passed = 0;
            long totalMs = 0;

            for (TestCase testCase : testCases) {

                TestCaseResult result = runTestCase(
                        tempDir,
                        testCase,
                        submission.getLanguage().getDockerImage(),
                        submission.getLanguage().getRunCmd()
                );

                totalMs += result.executionMs;

                if (result.verdict == Verdict.ACCEPTED) {
                    passed++;
                } else {
                    return ExecutionResult.builder()
                            .verdict(result.verdict)
                            .executionMs((int) totalMs)
                            .testCasesPassed(passed)
                            .testCasesTotal(testCases.size())
                            .errorMessage(result.errorMessage)
                            .build();
                }
            }

            // ─── All test cases passed ────────────────────────────────
            return ExecutionResult.builder()
                    .verdict(Verdict.ACCEPTED)
                    .executionMs((int) totalMs)
                    .testCasesPassed(passed)
                    .testCasesTotal(testCases.size())
                    .errorMessage(null)
                    .build();

        } catch (Exception e) {
            log.error("Unexpected error during execution: {}",
                    e.getMessage(), e);
            return ExecutionResult.builder()
                    .verdict(Verdict.RUNTIME_ERROR)
                    .executionMs(0)
                    .testCasesPassed(0)
                    .testCasesTotal(testCases.size())
                    .errorMessage(e.getMessage())
                    .build();
        } finally {
            if (tempDir != null) {
                deleteDirectory(tempDir.toFile());
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Convert container-side tempDir path → host-side path
    // e.g. /judge-tmp/judge_abc123 → /tmp/judge/judge_abc123
    // ─────────────────────────────────────────────────────────────────
    private String toHostPath(Path tempDir) {
        Path containerBase = Paths.get(tempBaseDir);
        Path relative = containerBase.relativize(tempDir.toAbsolutePath());
        return Paths.get(hostTempBaseDir).resolve(relative).toString();
    }

    // ─────────────────────────────────────────────────────────────────
    // COMPILE
    // Skipped entirely for interpreted languages (Python)
    // compileCmd is null/blank for Python → returns null (success)
    // ─────────────────────────────────────────────────────────────────
    private String compile(Path tempDir, String dockerImage, String compileCmd)
            throws IOException, InterruptedException {

        // No compile step for interpreted languages like Python
        if (compileCmd == null || compileCmd.isBlank()) {
            log.info("No compilation needed for this language");
            return null;
        }

        String hostPath = toHostPath(tempDir);
        log.info("Compiling with host path: {}", hostPath);

        List<String> command = new ArrayList<>();
        command.addAll(List.of(
                "docker", "run", "--rm",
                "--pull", "never",
                "--network=none",
                "--memory=" + memoryLimit,
                "--cpus=" + cpuLimit,
                "-v", hostPath + ":/code",
                "-w", "/code",
                dockerImage,
                "sh", "-c", compileCmd   // use full compileCmd as-is from DB
        ));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        String output = new String(process.getInputStream().readAllBytes());

        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

        if (!finished) {
            process.destroyForcibly();
            return "Compilation timed out";
        }

        int exitCode = process.exitValue();
        return exitCode != 0 ? output : null;
    }

    // ─────────────────────────────────────────────────────────────────
    // RUN ONE TEST CASE
    // Uses runCmd from DB — works for all languages
    // C++:    ./solution
    // Python: python3 solution.py
    // Java:   java solution
    // ─────────────────────────────────────────────────────────────────
    private TestCaseResult runTestCase(Path tempDir,
                                       TestCase testCase,
                                       String dockerImage,
                                       String runCmd)
            throws IOException, InterruptedException {

        long startMs = System.currentTimeMillis();

        Path inputFile = tempDir.resolve("input.txt");
        Files.writeString(inputFile, testCase.getInput());

        String hostPath = toHostPath(tempDir);
        log.info("Running test case with host path: {}", hostPath);

        ProcessBuilder pb = new ProcessBuilder(
                "docker", "run", "--rm",
                "--pull", "never",
                "--network=none",
                "--memory=" + memoryLimit,
                "--cpus=" + cpuLimit,
                "-v", hostPath + ":/code",
                "-w", "/code",
                dockerImage,
                "sh", "-c", runCmd + " < input.txt"
        );

        pb.redirectErrorStream(false);
        Process process = pb.start();

        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        long executionMs = System.currentTimeMillis() - startMs;

        if (!finished) {
            process.destroyForcibly();
            return new TestCaseResult(
                    Verdict.TIME_LIMIT_EXCEEDED,
                    (int) executionMs,
                    "Execution exceeded " + timeoutSeconds + " seconds"
            );
        }

        String actualOutput = new String(
                process.getInputStream().readAllBytes()).trim();

        String errorOutput = new String(
                process.getErrorStream().readAllBytes()).trim();

        int exitCode = process.exitValue();

        if (exitCode != 0) {
            return new TestCaseResult(
                    Verdict.RUNTIME_ERROR,
                    (int) executionMs,
                    errorOutput.isEmpty()
                            ? "Non-zero exit code: " + exitCode
                            : errorOutput
            );
        }

        String expectedOutput = testCase.getExpectedOutput().trim();

        if (actualOutput.equals(expectedOutput)) {
            return new TestCaseResult(Verdict.ACCEPTED, (int) executionMs, null);
        } else {
            return new TestCaseResult(
                    Verdict.WRONG_ANSWER,
                    (int) executionMs,
                    "Expected: " + expectedOutput + " | Got: " + actualOutput
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Get source filename based on language name
    // ─────────────────────────────────────────────────────────────────
    private String getSourceFileName(String languageName) {
        if (languageName == null) return "solution.cpp";
        return switch (languageName.toLowerCase()) {
            case "python" -> "solution.py";
            case "java"   -> "solution.java";
            default       -> "solution.cpp";
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────────────────────────────
    private void deleteDirectory(File directory) {
        File[] files = directory.listFiles();
        if (files != null) {
            for (File file : files) {
                deleteDirectory(file);
            }
        }
        directory.delete();
    }

    private static class TestCaseResult {
        Verdict verdict;
        int executionMs;
        String errorMessage;

        TestCaseResult(Verdict verdict, int executionMs, String errorMessage) {
            this.verdict = verdict;
            this.executionMs = executionMs;
            this.errorMessage = errorMessage;
        }
    }
}