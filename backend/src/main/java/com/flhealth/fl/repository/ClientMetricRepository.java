package com.flhealth.fl.repository;

import com.flhealth.fl.entity.ClientMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientMetricRepository extends JpaRepository<ClientMetric, Long> {
    List<ClientMetric> findByRunId(Long runId);
    List<ClientMetric> findByRunIdAndRoundNumber(Long runId, Integer roundNumber);
}
