package com.flhealth.fl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "fl_training_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer numClients;

    @Column(nullable = false)
    private Integer numRounds;

    @Column(nullable = false)
    private Double noiseMultiplier;

    @Column(nullable = false)
    private Double targetEpsilon;

    @Column(nullable = false)
    private String datasetName;

    @Column(nullable = false)
    private String status; // RUNNING, COMPLETED, FAILED

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    private Double finalAccuracy;

    private Double finalLoss;

    private Double finalEpsilon;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String confusionMatrixJson;

    @PrePersist
    protected void onCreate() {
        startedAt = LocalDateTime.now();
    }
}
