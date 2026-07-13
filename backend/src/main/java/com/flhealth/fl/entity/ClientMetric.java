package com.flhealth.fl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "fl_client_metrics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long runId;

    @Column(nullable = false)
    private Integer roundNumber;

    @Column(nullable = false)
    private Integer clientId;

    @Column(nullable = false)
    private Double localAccuracy;

    @Column(nullable = false)
    private Double localLoss;

    @Column(nullable = false)
    private String status; // ACTIVE, FAILED, RECOVERED, QUARANTINED
}
