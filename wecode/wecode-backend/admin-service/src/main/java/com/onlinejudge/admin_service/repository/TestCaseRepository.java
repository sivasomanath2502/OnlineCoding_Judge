package com.onlinejudge.admin_service.repository;

import com.onlinejudge.admin_service.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, String> {

    @Query(value = "SELECT * FROM test_cases WHERE problem_id = :problemId ORDER BY order_index",
            nativeQuery = true)
    List<TestCase> findByProblemId(@Param("problemId") String problemId);
}