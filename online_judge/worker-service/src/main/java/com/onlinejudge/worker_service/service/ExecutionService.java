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
import java.util.List;
import java.util.UUID;
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

    public ExecutionResult execute(Submission submission,
                                   List<TestCase> testCases) {

        // Create unique temp directory for this submission
        Path tempDir = null;

        try {
            tempDir = Files.createTempDirectory(
                    "judge_" + submission.getId());

            // ─── Step 1: Write code to file ──────────────────────────
            Path sourceFile = tempDir.resolve("solution.cpp");
            Files.writeString(sourceFile, submission.getCode());

            log.info("Source file written: {}", sourceFile);

            // ─── Step 2: Compile inside Docker ───────────────────────
            String compilationError = compile(
                    tempDir,
                    submission.getLanguage().getDockerImage()
            );

            if (compilationError != null) {
                log.warn("Compilation failed for submissionId={}",
                        submission.getId());
                return ExecutionResult.builder()
                        .verdict(Verdict.COMPILATION_ERROR)
                        .executionMs(0)
                        .testCasesPassed(0)
                        .testCasesTotal(testCases.size())
                        .errorMessage(compilationError)
                        .build();
            }

            log.info("Compilation successful for submissionId={}",
                    submission.getId());

            // ─── Step 3: Run against each test case ──────────────────
            int passed = 0;
            long totalMs = 0;

            for (TestCase testCase : testCases) {

                TestCaseResult result = runTestCase(
                        tempDir,
                        testCase,
                        submission.getLanguage().getDockerImage()
                );

                totalMs += result.executionMs;

                if (result.verdict == Verdict.ACCEPTED) {
                    passed++;
                } else {
                    // Return immediately on first failure
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
            // ─── Always clean up temp directory ──────────────────────
            if (tempDir != null) {
                deleteDirectory(tempDir.toFile());
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // COMPILE
    // Runs: docker run --rm -v <tempDir>:/code <image> g++ -o solution solution.cpp
    // ─────────────────────────────────────────────────────────────────
    private String compile(Path tempDir, String dockerImage)
            throws IOException, InterruptedException {

        ProcessBuilder pb = new ProcessBuilder(
                "docker", "run", "--rm",
                "--network=none",
                "--memory=" + memoryLimit,
                "--cpus=" + cpuLimit,
                "-v", tempDir.toAbsolutePath() + ":/code",
                "-w", "/code",
                dockerImage,
                "g++", "-o", "solution", "solution.cpp"
        );

        pb.redirectErrorStream(true);
        Process process = pb.start();

        String output = new String(
                process.getInputStream().readAllBytes());

        boolean finished = process.waitFor(
                timeoutSeconds, TimeUnit.SECONDS);

        if (!finished) {
            process.destroyForcibly();
            return "Compilation timed out";
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            return output; // compiler error message
        }

        return null; // null = success
    }

    // ─────────────────────────────────────────────────────────────────
    // RUN ONE TEST CASE
    // ─────────────────────────────────────────────────────────────────
    private TestCaseResult runTestCase(Path tempDir,
                                       TestCase testCase,
                                       String dockerImage)
            throws IOException, InterruptedException {

        long startMs = System.currentTimeMillis();

        // ─── 1. WRITE INPUT TO FILE ─────────────────────────────────────
        Path inputFile = tempDir.resolve("input.txt");
        Files.writeString(inputFile, testCase.getInput());

        // ─── 2. RUN PROGRAM USING INPUT REDIRECTION ─────────────────────
        ProcessBuilder pb = new ProcessBuilder(
                "docker", "run", "--rm",
                "--network=none",
                "--memory=" + memoryLimit,
                "--cpus=" + cpuLimit,
                "-v", tempDir.toAbsolutePath() + ":/code",   // IMPORTANT: remove :ro
                "-w", "/code",
                dockerImage,
                "sh", "-c", "./solution < input.txt"
        );

        pb.redirectErrorStream(false);
        Process process = pb.start();

        // ─── 3. WAIT FOR EXECUTION ──────────────────────────────────────
        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

        long executionMs = System.currentTimeMillis() - startMs;

        // ─── 4. HANDLE TIMEOUT ──────────────────────────────────────────
        if (!finished) {
            process.destroyForcibly();
            return new TestCaseResult(
                    Verdict.TIME_LIMIT_EXCEEDED,
                    (int) executionMs,
                    "Execution exceeded " + timeoutSeconds + " seconds"
            );
        }

        // ─── 5. READ OUTPUT AFTER PROCESS COMPLETES ─────────────────────
        String actualOutput = new String(
                process.getInputStream().readAllBytes()
        ).trim();

        String errorOutput = new String(
                process.getErrorStream().readAllBytes()
        ).trim();

        int exitCode = process.exitValue();

        // ─── 6. RUNTIME ERROR ───────────────────────────────────────────
        if (exitCode != 0) {
            return new TestCaseResult(
                    Verdict.RUNTIME_ERROR,
                    (int) executionMs,
                    errorOutput.isEmpty()
                            ? "Non-zero exit code: " + exitCode
                            : errorOutput
            );
        }

        // ─── 7. OUTPUT COMPARISON ───────────────────────────────────────
        String expectedOutput = testCase.getExpectedOutput().trim();

        if (actualOutput.equals(expectedOutput)) {
            return new TestCaseResult(
                    Verdict.ACCEPTED,
                    (int) executionMs,
                    null
            );
        } else {
            return new TestCaseResult(
                    Verdict.WRONG_ANSWER,
                    (int) executionMs,
                    "Expected: " + expectedOutput + " | Got: " + actualOutput
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Internal result carrier for one test case
    // ─────────────────────────────────────────────────────────────────
    private static class TestCaseResult {
        Verdict verdict;
        int executionMs;
        String errorMessage;

        TestCaseResult(Verdict verdict,
                       int executionMs,
                       String errorMessage) {
            this.verdict = verdict;
            this.executionMs = executionMs;
            this.errorMessage = errorMessage;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Cleanup temp directory
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
}