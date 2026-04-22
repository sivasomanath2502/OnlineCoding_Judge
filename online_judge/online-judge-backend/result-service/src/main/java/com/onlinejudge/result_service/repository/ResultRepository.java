package com.onlinejudge.result_service.repository;

import com.onlinejudge.result_service.entity.Result;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ResultRepository extends JpaRepository<Result, String> {

    @Query(value = "SELECT * FROM results WHERE submission_id = :submissionId",
            nativeQuery = true)
    Optional<Result> findBySubmissionId(@Param("submissionId") String submissionId);
}