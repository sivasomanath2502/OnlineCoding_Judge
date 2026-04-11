package com.onlinejudge.result_service.repository;

import com.onlinejudge.result_service.entity.Result;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ResultRepository extends JpaRepository<Result, UUID> {

    Optional<Result> findBySubmissionId(UUID submissionId);
}
