package com.flhealth.fl.repository;

import com.flhealth.fl.entity.TrainingRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingRunRepository extends JpaRepository<TrainingRun, Long> {
}
