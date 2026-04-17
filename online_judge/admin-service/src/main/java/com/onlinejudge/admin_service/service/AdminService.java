package com.onlinejudge.admin_service.service;

import com.onlinejudge.admin_service.dto.request.ProblemRequest;
import com.onlinejudge.admin_service.dto.request.TestCaseRequest;
import com.onlinejudge.admin_service.dto.response.ProblemResponse;
import com.onlinejudge.admin_service.dto.response.TestCaseResponse;
import com.onlinejudge.admin_service.entity.Problem;
import com.onlinejudge.admin_service.entity.TestCase;
import com.onlinejudge.admin_service.exception.ResourceNotFoundException;
import com.onlinejudge.admin_service.repository.ProblemRepository;
import com.onlinejudge.admin_service.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;

    // ─── Create Problem with test cases ──────────────────────────────
    @Transactional
    public ProblemResponse createProblem(ProblemRequest request) {
        log.info("Creating problem: {}", request.getTitle());

        Problem problem = Problem.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .difficulty(request.getDifficulty())
                .timeLimitMs(request.getTimeLimitMs())
                .build();

        Problem saved = problemRepository.save(problem);

        // Save test cases
        List<TestCase> testCases = request.getTestCases().stream()
                .map(tc -> TestCase.builder()
                        .problem(saved)
                        .input(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .orderIndex(tc.getOrderIndex())
                        .build())
                .collect(Collectors.toList());

        testCaseRepository.saveAll(testCases);

        log.info("Problem created: id={}, testCases={}",
                saved.getId(), testCases.size());

        return toResponse(saved, testCases);
    }

    // ─── Get all problems ─────────────────────────────────────────────
    public List<ProblemResponse> getAllProblems() {
        return problemRepository.findAll().stream()
                .map(p -> {
                    List<TestCase> tcs = testCaseRepository
                            .findByProblemId(p.getId());
                    return toResponse(p, tcs);
                })
                .collect(Collectors.toList());
    }

    // ─── Get problem by ID ────────────────────────────────────────────
    public ProblemResponse getProblem(String problemId) {
        Problem problem = problemRepository.findByUUID(problemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Problem not found: " + problemId));

        List<TestCase> testCases = testCaseRepository
                .findByProblemId(problemId);

        return toResponse(problem, testCases);
    }

    // ─── Add test cases to existing problem ──────────────────────────
    @Transactional
    public ProblemResponse addTestCases(String problemId,
                                        List<TestCaseRequest> requests) {

        Problem problem = problemRepository.findByUUID(problemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Problem not found: " + problemId));

        List<TestCase> newTestCases = requests.stream()
                .map(tc -> TestCase.builder()
                        .problem(problem)
                        .input(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .orderIndex(tc.getOrderIndex())
                        .build())
                .collect(Collectors.toList());

        testCaseRepository.saveAll(newTestCases);

        log.info("Added {} test cases to problemId={}",
                newTestCases.size(), problemId);

        List<TestCase> allTestCases = testCaseRepository
                .findByProblemId(problemId);

        return toResponse(problem, allTestCases);
    }

    // ─── Delete test case ─────────────────────────────────────────────
    @Transactional
    public void deleteTestCase(String testCaseId) {
        if (!testCaseRepository.existsById(testCaseId)) {
            throw new ResourceNotFoundException(
                    "Test case not found: " + testCaseId);
        }
        testCaseRepository.deleteById(testCaseId);
        log.info("Test case deleted: id={}", testCaseId);
    }

    // ─── Delete problem ───────────────────────────────────────────────
    @Transactional
    public void deleteProblem(String problemId) {
        if (!problemRepository.existsById(problemId)) {
            throw new ResourceNotFoundException(
                    "Problem not found: " + problemId);
        }
        problemRepository.deleteById(problemId);
        log.info("Problem deleted: id={}", problemId);
    }

    // ─── Mapper ───────────────────────────────────────────────────────
    private ProblemResponse toResponse(Problem problem,
                                       List<TestCase> testCases) {
        List<TestCaseResponse> tcResponses = testCases.stream()
                .map(tc -> TestCaseResponse.builder()
                        .id(tc.getId())
                        .input(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .orderIndex(tc.getOrderIndex())
                        .build())
                .collect(Collectors.toList());

        return ProblemResponse.builder()
                .id(problem.getId())
                .title(problem.getTitle())
                .description(problem.getDescription())
                .difficulty(problem.getDifficulty())
                .timeLimitMs(problem.getTimeLimitMs())
                .testCaseCount(tcResponses.size())
                .testCases(tcResponses)
                .build();
    }
}