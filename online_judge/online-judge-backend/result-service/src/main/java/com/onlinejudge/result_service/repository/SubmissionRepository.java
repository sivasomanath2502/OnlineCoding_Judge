package com.onlinejudge.result_service.repository;

import com.onlinejudge.result_service.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, String> {

    @Query(value = "SELECT * FROM submissions WHERE id = :id", nativeQuery = true)
    Optional<Submission> findByUUID(@Param("id") String id);
}