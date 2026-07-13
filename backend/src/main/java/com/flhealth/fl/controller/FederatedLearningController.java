package com.flhealth.fl.controller;

import com.flhealth.fl.entity.*;
import com.flhealth.fl.repository.*;
import com.flhealth.fl.service.FederatedLearningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fl")
@RequiredArgsConstructor
@CrossOrigin
@Slf4j
public class FederatedLearningController {

    private final FederatedLearningService flService;
    private final TrainingRunRepository trainingRunRepository;
    private final RoundMetricRepository roundMetricRepository;
    private final ClientMetricRepository clientMetricRepository;
    private final PrivacyBudgetLogRepository privacyBudgetLogRepository;
    private final SelfHealingEventRepository selfHealingEventRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // --- INTEGRATION PUSH ENDPOINTS (Invoked by Python engine) ---

    @PostMapping("/runs/start")
    public ResponseEntity<TrainingRun> startRun(@RequestBody Map<String, Object> body) {
        log.info("Received run-start event from Python: {}", body);
        TrainingRun run = TrainingRun.builder()
                .numClients((Integer) body.get("numClients"))
                .numRounds((Integer) body.get("numRounds"))
                .noiseMultiplier(((Number) body.get("noiseMultiplier")).doubleValue())
                .targetEpsilon(((Number) body.get("targetEpsilon")).doubleValue())
                .datasetName((String) body.get("datasetName"))
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .build();
        run = trainingRunRepository.save(run);
        return ResponseEntity.ok(run);
    }

    @PostMapping("/metrics")
    public ResponseEntity<String> receiveMetrics(@RequestBody Map<String, Object> body) {
        log.info("Received round metrics from Python: {}", body);
        
        Long runId = ((Number) body.get("runId")).longValue();
        Integer roundNumber = (Integer) body.get("roundNumber");
        Double globalAccuracy = ((Number) body.get("globalAccuracy")).doubleValue();
        Double globalLoss = ((Number) body.get("globalLoss")).doubleValue();
        Double epsilon = ((Number) body.get("epsilon")).doubleValue();

        // 1. Save Round Metric
        RoundMetric roundMetric = RoundMetric.builder()
                .runId(runId)
                .roundNumber(roundNumber)
                .globalAccuracy(globalAccuracy)
                .globalLoss(globalLoss)
                .epsilon(epsilon)
                .build();
        roundMetricRepository.save(roundMetric);

        // 2. Save Privacy Budget Log
        PrivacyBudgetLog privacyLog = PrivacyBudgetLog.builder()
                .runId(runId)
                .roundNumber(roundNumber)
                .epsilonSpent(epsilon)
                .delta(1e-5)
                .build();
        privacyBudgetLogRepository.save(privacyLog);

        // 3. Save Client Metrics
        List<Map<String, Object>> clientsList = (List<Map<String, Object>>) body.get("clientMetrics");
        for (Map<String, Object> clMap : clientsList) {
            ClientMetric clientMetric = ClientMetric.builder()
                    .runId(runId)
                    .roundNumber(roundNumber)
                    .clientId((Integer) clMap.get("clientId"))
                    .localAccuracy(((Number) clMap.get("localAccuracy")).doubleValue())
                    .localLoss(((Number) clMap.get("localLoss")).doubleValue())
                    .status((String) clMap.get("status"))
                    .build();
            clientMetricRepository.save(clientMetric);
        }

        // 4. Save Self-Healing Events
        List<Map<String, Object>> eventsList = (List<Map<String, Object>>) body.get("selfHealingEvents");
        for (Map<String, Object> evMap : eventsList) {
            SelfHealingEvent healingEvent = SelfHealingEvent.builder()
                    .runId(runId)
                    .roundNumber(roundNumber)
                    .clientId((Integer) evMap.get("clientId"))
                    .eventType((String) evMap.get("eventType"))
                    .details((String) evMap.get("details"))
                    .build();
            selfHealingEventRepository.save(healingEvent);
        }

        // 5. Broadcast to WebSocket topic live
        Map<String, Object> socketPayload = new HashMap<>();
        socketPayload.put("runId", runId);
        socketPayload.put("roundNumber", roundNumber);
        socketPayload.put("globalAccuracy", globalAccuracy);
        socketPayload.put("globalLoss", globalLoss);
        socketPayload.put("epsilon", epsilon);
        socketPayload.put("clientMetrics", clientsList);
        socketPayload.put("selfHealingEvents", eventsList);

        messagingTemplate.convertAndSend("/topic/fl-metrics/" + runId, socketPayload);

        return ResponseEntity.ok("Metrics persisted and broadcasted.");
    }

    @PostMapping("/runs/{id}/complete")
    public ResponseEntity<String> completeRun(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        log.info("Received run-complete event from Python for Run #{}: {}", id, body);
        TrainingRun run = trainingRunRepository.findById(id).orElse(null);
        if (run != null) {
            run.setStatus("COMPLETED");
            run.setCompletedAt(LocalDateTime.now());
            run.setFinalAccuracy(((Number) body.get("finalAccuracy")).doubleValue());
            run.setFinalLoss(((Number) body.get("finalLoss")).doubleValue());
            run.setFinalEpsilon(((Number) body.get("finalEpsilon")).doubleValue());
            run.setConfusionMatrixJson((String) body.get("confusionMatrixJson"));
            trainingRunRepository.save(run);

            messagingTemplate.convertAndSend("/topic/fl-runs-status/" + id, "COMPLETED");
            return ResponseEntity.ok("Run updated successfully.");
        }
        return ResponseEntity.notFound().build();
    }

    // --- FRONTEND REST ENDPOINTS ---

    @GetMapping("/runs")
    public ResponseEntity<List<TrainingRun>> getRuns() {
        // Return list of all runs sorted by start time descending
        List<TrainingRun> runs = trainingRunRepository.findAll();
        runs.sort((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()));
        return ResponseEntity.ok(runs);
    }

    @GetMapping("/runs/{id}")
    public ResponseEntity<Map<String, Object>> getRunDetails(@PathVariable Long id) {
        TrainingRun run = trainingRunRepository.findById(id).orElse(null);
        if (run == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> details = new HashMap<>();
        details.put("run", run);
        details.put("roundMetrics", roundMetricRepository.findByRunIdOrderByRoundNumberAsc(id));
        details.put("clientMetrics", clientMetricRepository.findByRunId(id));
        details.put("privacyLogs", privacyBudgetLogRepository.findByRunIdOrderByRoundNumberAsc(id));
        details.put("healingEvents", selfHealingEventRepository.findByRunIdOrderByRoundNumberAscTimestampAsc(id));

        return ResponseEntity.ok(details);
    }

    @PostMapping("/runs/trigger")
    public ResponseEntity<TrainingRun> triggerTraining(@RequestBody Map<String, Object> params) {
        int numClients = (Integer) params.getOrDefault("numClients", 10);
        int numRounds = (Integer) params.getOrDefault("numRounds", 20);
        double noiseMultiplier = ((Number) params.getOrDefault("noiseMultiplier", 1.0)).doubleValue();
        double targetEpsilon = ((Number) params.getOrDefault("targetEpsilon", 10.0)).doubleValue();
        String aggregationMethod = (String) params.getOrDefault("aggregationMethod", "median");

        TrainingRun run = flService.triggerGlobalTraining(numClients, numRounds, noiseMultiplier, targetEpsilon, aggregationMethod);
        return ResponseEntity.ok(run);
    }

    @PostMapping("/runs/{id}/stop")
    public ResponseEntity<Boolean> stopTraining(@PathVariable Long id) {
        boolean stopped = flService.stopTrainingRun(id);
        return ResponseEntity.ok(stopped);
    }

    @GetMapping("/runs/{id}/logs")
    public ResponseEntity<String> getLogs(@PathVariable Long id) {
        String logs = flService.getRunLogs(id);
        return ResponseEntity.ok(logs);
    }

    // --- INTERACTIVE LOCAL CLIENT TRAINING ENDPOINTS ---

    @PostMapping("/local/train")
    public ResponseEntity<Map<String, Object>> trainClient(@RequestParam int clientId, @RequestParam int samples) {
        Map<String, Object> result = flService.trainLocalClient(clientId, samples);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/local/status")
    public ResponseEntity<Map<String, Object>> getLocalStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("sizes", flService.getClientDatasetSizes());
        status.put("states", flService.getClientStates());
        return ResponseEntity.ok(status);
    }

    @PostMapping("/local/reset")
    public ResponseEntity<String> resetLocal() {
        flService.resetLocalClients();
        return ResponseEntity.ok("Local clients reset.");
    }

    // --- CLINICAL ASSISTANT CHATBOT ENDPOINT ---

    @PostMapping("/chatbot/query")
    public ResponseEntity<Map<String, Object>> chatbotQuery(@RequestParam Long runId, @RequestBody Map<String, Object> request) {
        Map<String, Object> response = flService.queryChatbot(runId, request);
        return ResponseEntity.ok(response);
    }
}
