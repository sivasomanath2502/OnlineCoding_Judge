package com.onlinejudge.admin_service.controller;

import com.onlinejudge.admin_service.dto.request.ProblemRequest;
import com.onlinejudge.admin_service.dto.request.TestCaseRequest;
import com.onlinejudge.admin_service.dto.response.ProblemResponse;
import com.onlinejudge.admin_service.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;

    // ─── POST /admin/problems — Create new problem ────────────────────
    @PostMapping("/problems")
    public ResponseEntity<ProblemResponse> createProblem(
            @Valid @RequestBody ProblemRequest request) {

        log.info("POST /admin/problems - {}", request.getTitle());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(adminService.createProblem(request));
    }

    // ─── GET /admin/problems — List all problems ──────────────────────
    @GetMapping("/problems")
    public ResponseEntity<List<ProblemResponse>> getAllProblems() {

        log.info("GET /admin/problems");
        return ResponseEntity.ok(adminService.getAllProblems());
    }

    // ─── GET /admin/problems/{id} — Get one problem ───────────────────
    @GetMapping("/problems/{problemId}")
    public ResponseEntity<ProblemResponse> getProblem(
            @PathVariable String problemId) {

        log.info("GET /admin/problems/{}", problemId);
        return ResponseEntity.ok(adminService.getProblem(problemId));
    }

    // ─── POST /admin/problems/{id}/test-cases — Add test cases ────────
    @PostMapping("/problems/{problemId}/test-cases")
    public ResponseEntity<ProblemResponse> addTestCases(
            @PathVariable String problemId,
            @Valid @RequestBody List<TestCaseRequest> requests) {

        log.info("POST /admin/problems/{}/test-cases", problemId);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(adminService.addTestCases(problemId, requests));
    }

    // ─── DELETE /admin/problems/{id} — Delete problem ─────────────────
    @DeleteMapping("/problems/{problemId}")
    public ResponseEntity<Void> deleteProblem(
            @PathVariable String problemId) {

        log.info("DELETE /admin/problems/{}", problemId);
        adminService.deleteProblem(problemId);
        return ResponseEntity.noContent().build();
    }

    // ─── DELETE /admin/test-cases/{id} — Delete test case ─────────────
    @DeleteMapping("/test-cases/{testCaseId}")
    public ResponseEntity<Void> deleteTestCase(
            @PathVariable String testCaseId) {

        log.info("DELETE /admin/test-cases/{}", testCaseId);
        adminService.deleteTestCase(testCaseId);
        return ResponseEntity.noContent().build();
    }
}